import {
  attachIdSystem,
  auctionDelay,
  coreStorage,
  dep, enrichEids,
  findRootDomain,
  getConsentHash, getValidSubmoduleConfigs,
  init,
  PBJS_USER_ID_OPTOUT_NAME,
  startAuctionHook,
  requestDataDeletion,
  setStoredValue,
  setSubmoduleRegistry,
  COOKIE_SUFFIXES, HTML5_SUFFIXES,
  syncDelay, adUnitEidsHook,
} from 'modules/userId/index.js';
import {UID1_EIDS} from 'libraries/uid1Eids/uid1Eids.js';
import {createEidsArray, EID_CONFIG, getEids} from 'modules/userId/eids.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import * as events from 'src/events.js';
import {EVENTS} from 'src/constants.js';
import {getGlobal} from 'src/prebidGlobal.js';
import {resetConsentData, } from 'modules/consentManagementTcf.js';
import {setEventFiredFlag as liveIntentIdSubmoduleDoNotFireEvent} from '../../../libraries/liveIntentId/idSystem.js';
import {sharedIdSystemSubmodule} from 'modules/sharedIdSystem.js';
import {pubProvidedIdSubmodule} from 'modules/pubProvidedIdSystem.js';
import * as mockGpt from '../integration/faker/googletag.js';
import {requestBids, startAuction} from 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';
import {getPPID} from '../../../src/adserver.js';
import {uninstall as uninstallTcfControl} from 'modules/tcfControl.js';
import {allConsent, GDPR_GVLIDS, gdprDataHandler} from '../../../src/consentHandler.js';
import {MODULE_TYPE_UID} from '../../../src/activities/modules.js';
import {ACTIVITY_ENRICH_EIDS} from '../../../src/activities/activities.js';
import {ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE} from '../../../src/activities/params.js';
import {extractEids} from '../../../modules/prebidServerBidAdapter/bidderConfig.js';
import {generateSubmoduleContainers, addIdData } from '../../../modules/userId/index.js';
import { registerActivityControl } from '../../../src/activities/rules.js';
import {
  discloseStorageUse,
  STORAGE_TYPE_COOKIES,
  STORAGE_TYPE_LOCALSTORAGE,
  getStorageManager,
  getCoreStorageManager
} from '../../../src/storageManager.js';

const assert = require('chai').assert;
const expect = require('chai').expect;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const CONSENT_LOCAL_STORAGE_NAME = '_pbjs_userid_consent_data';

describe('User ID', function () {
  function getConfigMock(...configArrays) {
    return {
      userSync: {
        syncDelay: 0,
        userIds: configArrays.map(configArray => (configArray && configArray.length >= 3) ? getStorageMock.apply(null, configArray) : null)
      }
    }
  }

  function getStorageMock(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30, refreshInSeconds) {
    return {name: name, storage: {name: key, type: type, expires: expires, refreshInSeconds: refreshInSeconds}}
  }

  function getConfigValueMock(name, value) {
    return {
      userSync: {syncDelay: 0, userIds: [{name: name, value: value}]}
    }
  }

  function createMockIdSubmodule(name, value, aliasName, eids) {
    return {
      name,
      getId() {
        return value;
      },
      decode(v) {
        return v;
      },
      primaryIds: [],
      aliasName,
      eids
    }
  }

  function createMockEid(name, source) {
    return {
      [name]: {
        source: source || `${name}Source`,
        atype: 3,
        getValue: function(data) {
          if (data.id) {
            return data.id;
          } else {
            return data;
          }
        },
        getUidExt: function(data) {
          return data.ext
        }
      }
    }
  }

  function getAdUnitMock(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [[300, 200], [300, 600]],
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}, {bidder: 'anotherSampleBidder', params: {placementId: 'banner-only-bidder'}}]
    };
  }

  function addConfig(cfg, name, value) {
    if (cfg && cfg.userSync && cfg.userSync.userIds) {
      cfg.userSync.userIds.forEach(element => {
        if (element[name] !== undefined) {
          element[name] = Object.assign(element[name], value);
        } else {
          element[name] = value;
        }
      });
    }

    return cfg;
  }

  let sandbox, consentData, startDelay, callbackDelay;

  function clearStack() {
    return new Promise((resolve) => setTimeout(resolve));
  }

  function delay() {
    const stub = sinon.stub().callsFake(() => new Promise((resolve) => {
      stub.resolve = () => {
        resolve();
        return clearStack();
      };
    }));
    return stub;
  }

  function runBidsHook(...args) {
    startDelay = delay();

    const result = startAuctionHook(...args, {mkDelay: startDelay});
    return new Promise((resolve) => setTimeout(() => resolve(result)));
  }

  function expectImmediateBidHook(...args) {
    return runBidsHook(...args).then(() => {
      startDelay.calledWith(0);
      return startDelay.resolve();
    })
  }

  function initModule(config) {
    callbackDelay = delay();
    return init(config, {mkDelay: callbackDelay});
  }

  before(function () {
    hook.ready();
    uninstallTcfControl();
    localStorage.removeItem(PBJS_USER_ID_OPTOUT_NAME);
    liveIntentIdSubmoduleDoNotFireEvent();
  });

  beforeEach(function () {
    resetConsentData();
    sandbox = sinon.createSandbox();
    consentData = null;
    mockGdprConsent(sandbox, () => consentData);
    coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);
  });

  afterEach(() => {
    sandbox.restore();
    config.resetConfig();
    startAuction.getHooks({hook: startAuctionHook}).remove();
  });

  after(() => {
    init(config);
  })

  describe('GVL IDs', () => {
    beforeEach(() => {
      sinon.stub(GDPR_GVLIDS, 'register');
    });
    afterEach(() => {
      GDPR_GVLIDS.register.restore();
    });

    it('are registered when ID submodule is registered', () => {
      attachIdSystem({name: 'gvlidMock', gvlid: 123});
      sinon.assert.calledWith(GDPR_GVLIDS.register, MODULE_TYPE_UID, 'gvlidMock', 123);
    })
  })

  describe('userId config validation', () => {
    beforeEach(() => {
      sandbox.stub(utils, 'logWarn');
    });

    function mockConfig(storageConfig = {}) {
      return {
        name: 'mockModule',
        storage: {
          name: 'mockStorage',
          type: 'cookie',
          ...storageConfig
        }
      }
    }

    Object.entries({
      'not an object': 'garbage',
      'missing name': {},
      'empty name': {name: ''},
      'empty storage config': {name: 'mockId', storage: {}},
      'storage type, but no storage name': mockConfig({name: ''}),
      'storage name, but no storage type': mockConfig({type: undefined}),
    }).forEach(([t, config]) => {
      it(`should log a warning and reject configuration with ${t}`, () => {
        expect(getValidSubmoduleConfigs([config]).length).to.equal(0);
        sinon.assert.called(utils.logWarn);
      });
    });

    it('should reject non-array userId configuration', () => {
      expect(getValidSubmoduleConfigs({})).to.eql([]);
      sinon.assert.called(utils.logWarn);
    });

    it('should accept null configuration', () => {
      expect(getValidSubmoduleConfigs()).to.eql([]);
      sinon.assert.notCalled(utils.logWarn);
    });

    ['refreshInSeconds', 'expires'].forEach(param => {
      describe(`${param} parameter`, () => {
        it('should be made a number, when possible', () => {
          expect(getValidSubmoduleConfigs([mockConfig({[param]: '123'})])[0].storage[param]).to.equal(123);
        });

        it('should log a warning when not a number', () => {
          expect(getValidSubmoduleConfigs([mockConfig({[param]: 'garbage'})])[0].storage[param]).to.not.exist;
          sinon.assert.called(utils.logWarn)
        });

        it('should be left untouched when not specified', () => {
          expect(getValidSubmoduleConfigs([mockConfig()])[0].storage[param]).to.not.exist;
          sinon.assert.notCalled(utils.logWarn);
        });
      })
    })
  })

  describe('Decorate Ad Units', function () {
    beforeEach(function () {
      // reset mockGpt so nothing else interferes
      mockGpt.disable();
      mockGpt.enable();
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 20000).toUTCString()));
      sinon.spy(coreStorage, 'setCookie');
      sinon.stub(utils, 'logWarn');
    });

    afterEach(function () {
      mockGpt.enable();
      requestBids.removeAll();
      config.resetConfig();
      coreStorage.setCookie.restore();
      utils.logWarn.restore();
    });

    after(function () {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', '', EXPIRED_COOKIE_DATE);
    });

    function getGlobalEids() {
      const ortb2Fragments = {global: {}};
      return expectImmediateBidHook(sinon.stub(), {ortb2Fragments}).then(() => ortb2Fragments.global.user?.ext?.eids);
    }

    it('Check same cookie behavior', async function () {
      let pubcid = coreStorage.getCookie('pubcid');
      expect(pubcid).to.be.null; // there should be no cookie initially

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      const eids1 = await getGlobalEids();
      pubcid = coreStorage.getCookie('pubcid'); // cookies is created after requestbidHook
      expect(eids1).to.eql([
        {
          source: 'pubcid.org',
          uids: [{id: pubcid, atype: 1}]
        }
      ])
      const eids2 = await getGlobalEids();
      assert.deepEqual(eids1, eids2);
    });

    it('Check different cookies', async function () {
      let pubcid1;
      let pubcid2;

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      const eids1 = await getGlobalEids()
      pubcid1 = coreStorage.getCookie('pubcid'); // get first cookie
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE); // erase cookie
      expect(eids1).to.eql([{
        source: 'pubcid.org',
        uids: [{id: pubcid1, atype: 1}]
      }])

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      const eids2 = await getGlobalEids();
      pubcid2 = coreStorage.getCookie('pubcid'); // get second cookie
      expect(eids2).to.eql([{
        source: 'pubcid.org',
        uids: [{id: pubcid2, atype: 1}]
      }])
      expect(pubcid1).to.not.equal(pubcid2);
    });

    it('Use existing cookie', async function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']));
      const eids = await getGlobalEids();
      expect(eids).to.eql([{
        source: 'pubcid.org',
        uids: [{id: 'altpubcid200000', atype: 1}]
      }])
    });

    it('Extend cookie', async function () {
      let customConfig = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {extend: true});

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(customConfig);
      const fpd = {};
      const eids = await getGlobalEids();
      expect(eids).to.deep.equal([{
        source: 'pubcid.org',
        uids: [{id: 'altpubcid200000', atype: 1}]
      }]);
    });

    it('Disable auto create', async function () {
      let customConfig = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {create: false});

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(customConfig);
      const eids = await getGlobalEids();
      expect(eids).to.not.exist;
    });

    describe('createEidsArray', () => {
      beforeEach(() => {
        init(config);
        setSubmoduleRegistry([
          createMockIdSubmodule('mockId1', null, null,
            {'mockId1': {source: 'mock1source', atype: 1}}),
          createMockIdSubmodule('mockId2v1', null, null,
            {'mockId2v1': {source: 'mock2source', atype: 2, getEidExt: () => ({v: 1})}}),
          createMockIdSubmodule('mockId2v2', null, null,
            {'mockId2v2': {source: 'mock2source', atype: 2, getEidExt: () => ({v: 2})}}),
          createMockIdSubmodule('mockId2v3', null, null, {
            'mockId2v3'(ids) {
              return {
                source: 'mock2source',
                inserter: 'ins',
                ext: {v: 2},
                uids: ids.map(id => ({id, atype: 2}))
              }
            }
          }),
          createMockIdSubmodule('mockId2v4', null, null, {
            'mockId2v4'(ids) {
              return ids.map(id => ({
                uids: [{id, atype: 0}],
                source: 'mock2source',
                inserter: 'ins',
                ext: {v: 2}
              }))
            }
          })
        ]);
      });

      it('should filter out non-string uid returned by generator functions', () => {
        const eids = createEidsArray({
          mockId2v3: [null, 'id1', 123],
        });
        expect(eids[0].uids).to.eql([
          {
            atype: 2,
            id: 'id1'
          }
        ]);
      });

      it('should not alter values returned by adapters', () => {
        let eid = {
          source: 'someid.org',
          uids: [{id: 'id-1'}]
        };
        const config = new Map([
          ['someId', function () {
            return eid;
          }]
        ]);
        const userid = {
          someId: 'id-1',
          pubProvidedId: [{
            source: 'someid.org',
            uids: [{id: 'id-2'}]
          }],
        }
        createEidsArray(userid, config);
        const allEids = createEidsArray(userid, config);
        expect(allEids).to.eql([
          {
            source: 'someid.org',
            uids: [{id: 'id-1'}, {id: 'id-2'}]
          }
        ])
        expect(eid.uids).to.eql([{'id': 'id-1'}])
      });

      it('should filter out entire EID if none of the uids are strings', () => {
        const eids = createEidsArray({
          mockId2v3: [null],
        });
        expect(eids).to.eql([]);
      })

      it('should group UIDs by everything except uid', () => {
        const eids = createEidsArray({
          mockId1: ['mock-1-1', 'mock-1-2'],
          mockId2v1: ['mock-2-1', 'mock-2-2'],
          mockId2v2: ['mock-2-1', 'mock-2-2'],
          mockId2v3: ['mock-2-1', 'mock-2-2']
        });
        expect(eids).to.eql([
          {
            source: 'mock1source',
            uids: [
              {
                id: 'mock-1-1',
                atype: 1,
              },
              {
                id: 'mock-1-2',
                atype: 1,
              }
            ]
          },
          {
            source: 'mock2source',
            ext: {
              v: 1
            },
            uids: [
              {
                id: 'mock-2-1',
                atype: 2,
              },
              {
                id: 'mock-2-2',
                atype: 2,
              }
            ]
          },
          {
            source: 'mock2source',
            ext: {
              v: 2
            },
            uids: [
              {
                id: 'mock-2-1',
                atype: 2,
              },
              {
                id: 'mock-2-2',
                atype: 2,
              }
            ]
          },
          {
            source: 'mock2source',
            inserter: 'ins',
            ext: {v: 2},
            uids: [
              {
                id: 'mock-2-1',
                atype: 2,
              },
              {
                id: 'mock-2-2',
                atype: 2,
              }
            ]
          }
        ])
      });

      it('should group matching EIDs regardless of entry order', () => {
        const eids = createEidsArray({
          mockId2v3: ['id1', 'id2'],
          mockId2v4: ['id3']
        });
        expect(eids).to.eql([{
          source: 'mock2source',
          inserter: 'ins',
          uids: [
            {
              id: 'id1',
              atype: 2,
            },
            {
              id: 'id2',
              atype: 2
            },
            {
              id: 'id3',
              atype: 0
            }
          ],
          ext: {v: 2}
        }])
      })
      it('when merging with pubCommonId, should not alter its eids', () => {
        const uid = {
          pubProvidedId: [
            {
              source: 'mock1Source',
              uids: [
                {id: 'uid2'}
              ]
            }
          ],
          mockId1: 'uid1',
        };
        const eids = createEidsArray(uid);
        expect(eids).to.have.length(1);
        expect(eids[0].uids.map(u => u.id)).to.have.members(['uid1', 'uid2']);
        expect(uid.pubProvidedId[0].uids).to.eql([{id: 'uid2'}]);
      });
    })

    it('pbjs.getUserIds', function (done) {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      const ids = {pubcid: '11111'};
      config.setConfig({
        userSync: {
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [{
            name: 'pubCommonId', value: ids
          }]
        }
      });
      getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids).to.deep.equal(ids);
        expect(getGlobal().getUserIds()).to.deep.equal(ids);
        done();
      })
    });

    it('pbjs.getUserIds(Async) should prioritize user ids according to config available to core', () => {
      init(config);

      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {mockId1: 'mockId1_value'}}),
        createMockIdSubmodule('mockId2Module', {id: {mockId2: 'mockId2_value', mockId3: 'mockId3_value_from_mockId2Module'}}),
        createMockIdSubmodule('mockId3Module', {id: {mockId1: 'mockId1_value_from_mockId3Module', mockId2: 'mockId2_value_from_mockId3Module', mockId3: 'mockId3_value', mockId4: 'mockId4_value_from_mockId3Module'}}),
        createMockIdSubmodule('mockId4Module', {id: {mockId4: 'mockId4_value'}})
      ]);

      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId3Module', 'mockId1Module'],
            mockId4: ['mockId4Module', 'mockId3Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      return getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids['mockId1']).to.deep.equal('mockId1_value_from_mockId3Module');
        expect(uids['mockId2']).to.deep.equal('mockId2_value');
        expect(uids['mockId3']).to.deep.equal('mockId3_value_from_mockId2Module');
        expect(uids['mockId4']).to.deep.equal('mockId4_value');
      });
    });

    it('pbjs.getUserIds(Async) should prioritize user ids according to config available to core when config uses aliases', () => {
      init(config);

      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {mockId1: 'mockId1_value'}}),
        createMockIdSubmodule('mockId2Module', {id: {mockId2: 'mockId2_value', mockId3: 'mockId3_value_from_mockId2Module'}}, 'mockId2Module_alias'),
        createMockIdSubmodule('mockId3Module', {id: {mockId1: 'mockId1_value_from_mockId3Module', mockId2: 'mockId2_value_from_mockId3Module', mockId3: 'mockId3_value', mockId4: 'mockId4_value_from_mockId3Module'}}, 'mockId3Module_alias'),
        createMockIdSubmodule('mockId4Module', {id: {mockId4: 'mockId4_value'}})
      ]);

      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId3Module_alias', 'mockId1Module'],
            mockId4: ['mockId4Module', 'mockId3Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      return getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids['mockId1']).to.deep.equal('mockId1_value_from_mockId3Module');
        expect(uids['mockId2']).to.deep.equal('mockId2_value');
        expect(uids['mockId3']).to.deep.equal('mockId3_value_from_mockId2Module');
        expect(uids['mockId4']).to.deep.equal('mockId4_value');
      });
    });

    it('pbjs.getUserIds(Async) should prioritize user ids according to config available to core when called multiple times', () => {
      init(config);

      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {mockId1: 'mockId1_value', mockId2: 'mockId2_value_from_mockId1Module'}}),
        createMockIdSubmodule('mockId2Module', {id: {mockId1: 'mockId1_value_from_mockId2Module', mockId2: 'mockId2_value'}}),
      ]);

      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId2Module', 'mockId1Module'],
            mockId2: ['mockId1Module', 'mockId2Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' }
          ]
        }
      });

      return getGlobal().getUserIdsAsync().then((uidsFirstRequest) => {
        getGlobal().getUserIdsAsync().then((uidsSecondRequest) => {
          expect(uidsFirstRequest['mockId1']).to.deep.equal('mockId1_value_from_mockId2Module');
          expect(uidsFirstRequest['mockId2']).to.deep.equal('mockId2_value_from_mockId1Module');
          expect(uidsFirstRequest).to.deep.equal(uidsSecondRequest);
        })
      });
    });

    it('pbjs.getUserIds(Async) with priority config but no collision', () => {
      init(config);

      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {mockId1: 'mockId1_value'}}),
        createMockIdSubmodule('mockId2Module', {id: {mockId2: 'mockId2_value'}}),
        createMockIdSubmodule('mockId3Module', {id: undefined}),
        createMockIdSubmodule('mockId4Module', {id: {mockId4: 'mockId4_value'}})
      ]);

      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId3Module', 'mockId1Module'],
            mockId4: ['mockId2Module', 'mockId4Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      return getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids['mockId1']).to.deep.equal('mockId1_value');
        expect(uids['mockId2']).to.deep.equal('mockId2_value');
        expect(uids['mockId3']).to.be.undefined;
        expect(uids['mockId4']).to.deep.equal('mockId4_value');
      });
    });

    it('pbjs.getUserIdsAsEids', function (done) {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      const ids = {'pubcid': '11111'};
      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [{
            name: 'pubCommonId', value: ids
          }]
        }
      });
      getGlobal().getUserIdsAsync().then((ids) => {
        expect(getGlobal().getUserIdsAsEids()).to.deep.equal(createEidsArray(ids));
        done();
      });
    });

    it('pbjs.getUserIdsAsEids should pass config to eid function', async function () {
      const eidFn = sinon.stub();
      init(config);
      setSubmoduleRegistry([createMockIdSubmodule('mockId', null, null, {
        mockId: eidFn
      })]);
      const moduleConfig = {
        name: 'mockId',
        value: {mockId: 'mockIdValue'},
        some: 'config'
      };
      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [moduleConfig]
        }
      });
      await getGlobal().getUserIdsAsync();
      sinon.assert.calledWith(eidFn, ['mockIdValue'], moduleConfig);
    })

    it('pbjs.getUserIdsAsEids should prioritize user ids according to config available to core', () => {
      init(config);
      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {uid2: {id: 'uid2_value'}}}, null, createMockEid('uid2')),
        createMockIdSubmodule('mockId2Module', {id: {pubcid: 'pubcid_value', lipb: {lipbid: 'lipbid_value_from_mockId2Module'}}}, null, createMockEid('pubcid')),
        createMockIdSubmodule('mockId3Module', {id: {uid2: {id: 'uid2_value_from_mockId3Module'}, pubcid: 'pubcid_value_from_mockId3Module', lipb: {lipbid: 'lipbid_value'}, merkleId: {id: 'merkleId_value_from_mockId3Module'}}}, null, {...createMockEid('uid2'), ...createMockEid('merkleId'), ...createMockEid('lipb')}),
        createMockIdSubmodule('mockId4Module', {id: {merkleId: {id: 'merkleId_value'}}}, null, createMockEid('merkleId'))
      ]);
      config.setConfig({
        userSync: {
          idPriority: {
            uid2: ['mockId3Module', 'mockId1Module'],
            merkleId: ['mockId4Module', 'mockId3Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      const ids = {
        'uid2': { id: 'uid2_value_from_mockId3Module' },
        'pubcid': 'pubcid_value',
        'lipb': { lipbid: 'lipbid_value_from_mockId2Module' },
        'merkleId': { id: 'merkleId_value' }
      };

      return getGlobal().getUserIdsAsync().then(() => {
        const eids = getGlobal().getUserIdsAsEids();
        const expected = createEidsArray(ids);
        expect(eids).to.deep.equal(expected);
      });
    });

    it('pbjs.getUserIdsAsEids should prioritize the uid1 according to config available to core', () => {
      init(config);
      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {tdid: {id: 'uid1_value'}}}, null, UID1_EIDS),
        createMockIdSubmodule('mockId2Module', {id: {tdid: {id: 'uid1Id_value_from_mockId2Module'}}}, null, UID1_EIDS),
        createMockIdSubmodule('mockId3Module', {id: {tdid: {id: 'uid1Id_value_from_mockId3Module'}}}, null, UID1_EIDS)
      ]);
      config.setConfig({
        userSync: {
          idPriority: {
            tdid: ['mockId2Module', 'mockId3Module', 'mockId1Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' }
          ]
        }
      });

      const ids = {
        'tdid': { id: 'uid1Id_value_from_mockId2Module' },
      };

      return getGlobal().getUserIdsAsync().then(() => {
        const eids = getGlobal().getUserIdsAsEids();
        const expected = createEidsArray(ids);
        expect(eids).to.deep.equal(expected);
      })
    });

    describe('EID updateConfig', () => {
      function mockSubmod(name, eids) {
        return createMockIdSubmodule(name, null, null, eids);
      }

      it('does not choke if a submod does not provide an eids map', () => {
        setSubmoduleRegistry([
          mockSubmod('mock1'),
          mockSubmod('mock2')
        ]);
        expect(EID_CONFIG.size).to.equal(0);
      });

      it('should merge together submodules\' eid configs', () => {
        setSubmoduleRegistry([
          mockSubmod('mock1', {mock1: {m: 1}}),
          mockSubmod('mock2', {mock2: {m: 2}})
        ]);
        expect(EID_CONFIG.get('mock1')).to.eql({m: 1});
        expect(EID_CONFIG.get('mock2')).to.eql({m: 2});
      });

      it('should respect idPriority', () => {
        config.setConfig({
          userSync: {
            idPriority: {
              m1: ['mod2', 'mod1'],
              m2: ['mod1', 'mod2']
            },
            userIds: [
              { name: 'mod1' },
              { name: 'mod2' },
            ]
          }
        });
        setSubmoduleRegistry([
          mockSubmod('mod1', {m1: {i: 1}, m2: {i: 2}}),
          mockSubmod('mod2', {m1: {i: 3}, m2: {i: 4}})
        ]);
        expect(EID_CONFIG.get('m1')).to.eql({i: 3});
        expect(EID_CONFIG.get('m2')).to.eql({i: 2});
      });
    })

    it('should set googletag ppid correctly', function () {
      const adUnits = [getAdUnitMock()];
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);

      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          userIds: [
            { name: 'pubCommonId', value: {'pubcid': 'pubCommon-id-value-pubCommon-id-value'} },
          ]
        }
      });
      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        // ppid should have been set without dashes and stuff
        expect(window.googletag._ppid).to.equal('pubCommonidvaluepubCommonidvalue');
      });
    });

    it('should set googletag ppid correctly when prioritized according to config available to core', () => {
      const adUnits = [getAdUnitMock()];
      init(config);
      setSubmoduleRegistry([
        // some of the ids are padded to have length >= 32 characters
        createMockIdSubmodule('mockId1Module', {id: {uid2: {id: 'uid2_value_7ac66c0f148de9519b8bd264312c4d64'}}}),
        createMockIdSubmodule('mockId2Module', {id: {pubcid: 'pubcid_value_7ac66c0f148de9519b8bd264312c4d64', lipb: {lipbid: 'lipbid_value_from_mockId2Module_7ac66c0f148de9519b8bd264312c4d64'}}}),
        createMockIdSubmodule('mockId3Module', {
          id: {
            uid2: {
              id: 'uid2_value_from_mockId3Module_7ac66c0f148de9519b8bd264312c4d64'
            },
            pubcid: 'pubcid_value_from_mockId3Module_7ac66c0f148de9519b8bd264312c4d64',
            lipb: {
              lipbid: 'lipbid_value_7ac66c0f148de9519b8bd264312c4d64'
            },
            merkleId: {
              id: 'merkleId_value_from_mockId3Module_7ac66c0f148de9519b8bd264312c4d64'
            }
          }
        }, null, {
          uid2: {
            source: 'uidapi.com',
            getValue(data) { return data.id }
          }
        }),
        createMockIdSubmodule('mockId4Module', {id: {merkleId: {id: 'merkleId_value_7ac66c0f148de9519b8bd264312c4d64'}}})
      ]);

      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);

      config.setConfig({
        userSync: {
          ppid: 'uidapi.com',
          idPriority: {
            uid2: ['mockId3Module', 'mockId1Module'],
            merkleId: ['mockId4Module', 'mockId3Module']
          },
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        expect(window.googletag._ppid).to.equal('uid2valuefrommockId3Module7ac66c0f148de9519b8bd264312c4d64');
      });
    });

    describe('submodule callback', () => {
      const TEST_KEY = 'testKey';

      function setVal(val) {
        if (val) {
          coreStorage.setDataInLocalStorage(TEST_KEY, val);
          coreStorage.setDataInLocalStorage(TEST_KEY + '_exp', '');
        } else {
          coreStorage.removeDataFromLocalStorage(TEST_KEY);
          coreStorage.removeDataFromLocalStorage(TEST_KEY + '_exp');
        }
      }
      afterEach(() => {
        setVal(null);
      })

      it('should be able to re-read ID changes', (done) => {
        setVal(null);
        init(config);
        setSubmoduleRegistry([{
          name: 'mockId',
          getId: function (_1, _2, storedId) {
            expect(storedId).to.not.exist;
            setVal('laterValue');
            return {
              callback(_, readId) {
                expect(readId()).to.eql('laterValue');
                done();
              }
            }
          },
          decode(d) {
            return d
          }
        }]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [
              {
                name: 'mockId',
                storage: {
                  type: 'html5',
                  name: TEST_KEY
                }
              }
            ]
          }
        });
      });
    });

    it('should set PPID when the source needs to call out to the network', () => {
      const adUnits = [getAdUnitMock()];
      init(config);
      const callback = sinon.stub();
      setSubmoduleRegistry([{
        name: 'sharedId',
        getId: function () {
          return {callback}
        },
        decode(d) {
          return d
        },
        eids: {
          pubcid: {
            source: 'pubcid.org',
          }
        }
      }]);
      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          auctionDelay: 10,
          userIds: [
            {
              name: 'sharedId',
            }
          ]
        }
      });
      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        expect(window.googletag._ppid).to.be.undefined;
        const uid = 'thismustbelongerthan32characters'
        callback.yield({pubcid: uid});
        expect(window.googletag._ppid).to.equal(uid);
      });
    });

    it('should log a warning if PPID too big or small', function () {
      const adUnits = [getAdUnitMock()];

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          userIds: [
            { name: 'pubCommonId', value: {'pubcid': 'pubcommonIdValue'} },
          ]
        }
      });
      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);
      return expectImmediateBidHook(() => {}, {adUnits}).then(() => {
        // ppid should NOT have been set
        expect(window.googletag._ppid).to.equal(undefined);
        // a warning should have been emmited
        expect(utils.logWarn.args[0][0]).to.exist.and.to.contain('User ID - Googletag Publisher Provided ID for pubcid.org is not between 32 and 150 characters - pubcommonIdValue');
      });
    });

    it('should make PPID available to core', () => {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      const id = 'thishastobelongerthan32characters';
      config.setConfig({
        userSync: {
          ppid: 'pubcid.org',
          userIds: [
            { name: 'pubCommonId', value: {'pubcid': id} },
          ]
        }
      });
      return getGlobal().refreshUserIds().then(() => {
        expect(getPPID()).to.eql(id);
      })
    });

    it('should make PPID available to core and respect priority', () => {
      init(config);
      setSubmoduleRegistry([
        // some of the ids are padded to have length >= 32 characters
        createMockIdSubmodule('mockId1Module', {id: {uid2: {id: 'uid2_value_7ac66c0f148de9519b8bd264312c4d64'}}}),
        createMockIdSubmodule('mockId2Module', {id: {pubcid: 'pubcid_value_7ac66c0f148de9519b8bd264312c4d64', lipb: {lipbid: 'lipbid_value_from_mockId2Module_7ac66c0f148de9519b8bd264312c4d64'}}}),
        createMockIdSubmodule('mockId3Module', {
          id: {
            uid2: {
              id: 'uid2_value_from_mockId3Module_7ac66c0f148de9519b8bd264312c4d64'
            },
            pubcid: 'pubcid_value_from_mockId3Module_7ac66c0f148de9519b8bd264312c4d64',
            lipb: {
              lipbid: 'lipbid_value_7ac66c0f148de9519b8bd264312c4d64'
            },
            merkleId: {
              id: 'merkleId_value_from_mockId3Module_7ac66c0f148de9519b8bd264312c4d64'
            }
          }
        }, null, {
          uid2: {
            source: 'uidapi.com',
            getValue(data) { return data.id }
          }
        }),
        createMockIdSubmodule('mockId4Module', {id: {merkleId: {id: 'merkleId_value_7ac66c0f148de9519b8bd264312c4d64'}}})
      ]);

      // before ppid should not be set
      expect(window.googletag._ppid).to.equal(undefined);

      config.setConfig({
        userSync: {
          ppid: 'uidapi.com',
          idPriority: {
            uid2: ['mockId3Module', 'mockId1Module'],
            merkleId: ['mockId4Module', 'mockId3Module']
          },
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      return getGlobal().refreshUserIds().then(() => {
        expect(getPPID()).to.eql('uid2valuefrommockId3Module7ac66c0f148de9519b8bd264312c4d64');
      })
    });

    describe('refreshing before init is complete', () => {
      const MOCK_ID = {'MOCKID': '1111'};
      let mockIdCallback;
      let startInit;

      beforeEach(() => {
        mockIdCallback = sinon.stub();
        coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
        const mockIdSystem = {
          name: 'mockId',
          decode: function(value) {
            return {
              'mid': value['MOCKID']
            };
          },
          getId: sinon.stub().returns({callback: mockIdCallback})
        };
        init(config);
        setSubmoduleRegistry([mockIdSystem]);
        startInit = () => config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'mockId',
              storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });
      });

      ['refreshUserIds', 'getUserIdsAsync'].forEach(method => {
        it(`should still resolve promises returned by ${method}`, () => {
          startInit();
          let result = null;
          getGlobal()[method]().then((val) => { result = val; });
          return clearStack().then(() => {
            expect(result).to.equal(null); // auction has not ended, callback should not have been called
            mockIdCallback.callsFake((cb) => cb(MOCK_ID));
            return getGlobal().refreshUserIds().then(clearStack);
          }).then(() => {
            expect(result).to.deep.equal(getGlobal().getUserIds()) // auction still not over, but refresh was explicitly forced
          });
        });
      })

      it('should not stop auctions', (done) => {
        // simulate an infinite `auctionDelay`; refreshing should still allow the auction to continue
        // as soon as ID submodules have completed init
        startInit();
        startAuctionHook(() => {
          done();
        }, {adUnits: [getAdUnitMock()]}, {delay: delay()});
        getGlobal().refreshUserIds();
        clearStack().then(() => {
          // simulate init complete
          mockIdCallback.callArg(0, {id: {MOCKID: '1111'}});
        });
      });

      it('should continue the auction when init fails', (done) => {
        startInit();
        startAuctionHook(() => {
          done();
        },
        {adUnits: [getAdUnitMock()]},
        {
          delay: delay(),
          getIds: () => Promise.reject(new Error())
        }
        );
      })

      it('should not get stuck when init fails', () => {
        const err = new Error();
        mockIdCallback.callsFake(() => { throw err; });
        startInit();
        return getGlobal().getUserIdsAsync().catch((e) =>
          expect(e).to.equal(err)
        );
      });
    });

    describe('when ID systems throw errors', () => {
      function mockIdSystem(name) {
        return {
          name,
          decode: function(value) {
            return {
              [name]: value
            };
          },
          getId: sinon.stub().callsFake(() => ({id: name}))
        };
      }
      let id1, id2;
      beforeEach(() => {
        id1 = mockIdSystem('mock1');
        id2 = mockIdSystem('mock2');
        init(config);
        setSubmoduleRegistry([id1, id2]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'mock1',
              storage: {name: 'mock1', type: 'cookie'}
            }, {
              name: 'mock2',
              storage: {name: 'mock2', type: 'cookie'}
            }]
          }
        })
      });
      afterEach(() => {
        config.resetConfig();
      })
      Object.entries({
        'in init': () => id1.getId.callsFake(() => { throw new Error() }),
        'in callback': () => {
          const mockCallback = sinon.stub().callsFake(() => { throw new Error() });
          id1.getId.callsFake(() => ({callback: mockCallback}))
        }
      }).forEach(([t, setup]) => {
        describe(`${t}`, () => {
          beforeEach(setup);
          it('should still retrieve IDs that do not throw', () => {
            return getGlobal().getUserIdsAsync().then((uid) => {
              expect(uid.mock2).to.not.be.undefined;
            })
          });
        })
      })
    });
    it('pbjs.refreshUserIds updates submodules', function(done) {
      const sandbox = sinon.createSandbox();
      const mockIdCallback = sandbox.stub().returns({id: {'MOCKID': '1111'}});
      const mockIdSystem = {
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: mockIdCallback
      };
      init(config);
      setSubmoduleRegistry([mockIdSystem]);

      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [{
            name: 'mockId',
            value: {id: {mockId: '1111'}}
          }]
        }
      });

      getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids.id.mockId).to.equal('1111');
        // update to new config value
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'mockId',
              value: {id: {mockId: '1212'}}
            }]
          }
        });
        getGlobal().refreshUserIds({ submoduleNames: ['mockId'] }).then(() => {
          expect(getGlobal().getUserIds().id.mockId).to.equal('1212');
          done();
        });
      });
    });

    it('pbjs.refreshUserIds updates priority config', () => {
      init(config);

      setSubmoduleRegistry([
        createMockIdSubmodule('mockId1Module', {id: {mockId1: 'mockId1_value'}}),
        createMockIdSubmodule('mockId2Module', {id: {mockId2: 'mockId2_value', mockId3: 'mockId3_value_from_mockId2Module'}}),
        createMockIdSubmodule('mockId3Module', {id: {mockId1: 'mockId1_value_from_mockId3Module', mockId2: 'mockId2_value_from_mockId3Module', mockId3: 'mockId3_value', mockId4: 'mockId4_value_from_mockId3Module'}}),
        createMockIdSubmodule('mockId4Module', {id: {mockId4: 'mockId4_value'}})
      ]);

      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId3Module', 'mockId1Module'],
            mockId4: ['mockId4Module', 'mockId3Module']
          },
          auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' }
          ]
        }
      });

      return getGlobal().getUserIdsAsync().then((uids) => {
        expect(uids['mockId1']).to.deep.equal('mockId1_value_from_mockId3Module');
        expect(uids['mockId2']).to.deep.equal('mockId2_value');
        expect(uids['mockId3']).to.deep.equal('mockId3_value_from_mockId2Module');
        expect(uids['mockId4']).to.deep.equal('mockId4_value');

        config.setConfig({
          userSync: {
            idPriority: {
              mockId1: ['mockId1Module', 'mockId3Module'],
              mockId4: ['mockId3Module', 'mockId4Module']
            },
            auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
            userIds: [
              { name: 'mockId1Module' },
              { name: 'mockId2Module' },
              { name: 'mockId3Module' },
              { name: 'mockId4Module' }
            ]
          }
        });

        return getGlobal().getUserIdsAsync().then((uids) => {
          expect(uids['mockId1']).to.deep.equal('mockId1_value');
          expect(uids['mockId2']).to.deep.equal('mockId2_value');
          expect(uids['mockId3']).to.deep.equal('mockId3_value_from_mockId2Module');
          expect(uids['mockId4']).to.deep.equal('mockId4_value_from_mockId3Module');
        });
      });
    });

    it('pbjs.refreshUserIds refreshes single', function() {
      coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('refreshedid', '', EXPIRED_COOKIE_DATE);

      const sandbox = sinon.createSandbox();
      const mockIdCallback = sandbox.stub().returns({id: {'MOCKID': '1111'}});
      const refreshUserIdsCallback = sandbox.stub();

      const mockIdSystem = {
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: mockIdCallback
      };

      const refreshedIdCallback = sandbox.stub().returns({id: {'REFRESH': '1111'}});

      const refreshedIdSystem = {
        name: 'refreshedId',
        decode: function(value) {
          return {
            'refresh': value['REFRESH']
          };
        },
        getId: refreshedIdCallback
      };

      init(config);
      setSubmoduleRegistry([refreshedIdSystem, mockIdSystem]);

      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [
            {
              name: 'mockId',
              storage: {name: 'MOCKID', type: 'cookie'},
            },
            {
              name: 'refreshedId',
              storage: {name: 'refreshedid', type: 'cookie'},
            }
          ]
        }
      });

      return getGlobal().refreshUserIds({submoduleNames: 'refreshedId'}, refreshUserIdsCallback).then(() => {
        expect(refreshedIdCallback.callCount).to.equal(2);
        expect(mockIdCallback.callCount).to.equal(1);
        expect(refreshUserIdsCallback.callCount).to.equal(1);
      });
    });
  });

  describe('Opt out', function () {
    before(function () {
      coreStorage.setCookie(PBJS_USER_ID_OPTOUT_NAME, '1', (new Date(Date.now() + 5000).toUTCString()));
    });

    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      // removed cookie
      coreStorage.setCookie(PBJS_USER_ID_OPTOUT_NAME, '', EXPIRED_COOKIE_DATE);
      requestBids.removeAll();
      utils.logInfo.restore();
    });

    it('does not fetch ids if opt out cookie exists', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      const cfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      cfg.userSync.auctionDelay = 1; // to let init complete without an auction
      config.setConfig(cfg);
      return getGlobal().getUserIdsAsync().then((uid) => {
        expect(uid).to.eql({});
      })
    });

    it('initializes if no opt out cookie exists', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });
  });

  describe('Handle variations of config values', function () {
    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      requestBids.removeAll();
      utils.logInfo.restore();
    });

    it('handles config with no usersync object', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({userSync: {}});
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({
        userSync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({
        userSync: {
          userIds: [{
            name: '',
            value: {test: '1'}
          }, {
            name: 'foo',
            value: {test: '1'}
          }]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('config with 1 configurations should create 1 submodules', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, pubProvidedIdSubmodule]);
      config.setConfig(getConfigMock(['pubCommonId', 'pubCommonId', 'cookie']));

      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });

    it('handles config with name in different case', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({
        userSync: {
          userIds: [{
            name: 'SharedId'
          }]
        }
      });

      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });

    it('config with 2 configurations should result in 2 submodules add', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule, pubProvidedIdSubmodule]);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }, {
            name: 'pubProvidedId',
            storage: {name: 'pubProvidedId', type: 'cookie'}
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 2 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({
        userSync: {
          syncDelay: 99,
          userIds: [{
            name: 'pubCommonId',
            storage: {name: 'pubCommonId', type: 'cookie'}
          }]
        }
      });
      expect(syncDelay).to.equal(99);
    });

    it('config auctionDelay updates module correctly', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({
        userSync: {
          auctionDelay: 100,
          userIds: [{
            name: 'pubCommonId',
            storage: {name: 'pubCommonId', type: 'cookie'}
          }]
        }
      });
      expect(auctionDelay).to.equal(100);
    });

    it('config auctionDelay defaults to 500 if not a number', function () {
      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);
      config.setConfig({
        userSync: {
          auctionDelay: '',
          userIds: [{
            name: 'pubCommonId',
            storage: {name: 'pubCommonId', type: 'cookie'}
          }]
        }
      });
      expect(auctionDelay).to.equal(500);
    });

    describe('auction and user sync delays', function () {
      let sandbox;
      let adUnits;
      let mockIdCallback;
      let auctionSpy;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(events, 'on');
        sandbox.stub(coreStorage, 'getCookie');

        // remove cookie
        coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);

        adUnits = [getAdUnitMock()];

        auctionSpy = sandbox.spy();
        mockIdCallback = sandbox.stub();
        const mockIdSystem = {
          name: 'mockId',
          decode: function (value) {
            return {
              'mid': value['MOCKID']
            };
          },
          getId: function () {
            const storedId = coreStorage.getCookie('MOCKID');
            if (storedId) {
              return {id: {'MOCKID': storedId}};
            }
            return {callback: mockIdCallback};
          }
        };
        initModule(config);
        attachIdSystem(mockIdSystem, true);
      });

      afterEach(function () {
        requestBids.removeAll();
        config.resetConfig();
        sandbox.restore();
        coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
      });

      it('delays auction if auctionDelay is set, timing out at auction delay', function () {
        config.setConfig({
          userSync: {
            auctionDelay: 33,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return runBidsHook(auctionSpy, {adUnits}).then(() => {
          // check auction was delayed
          startDelay.calledWith(33);
          auctionSpy.calledOnce.should.equal(false);

          // check ids were fetched
          mockIdCallback.calledOnce.should.equal(true);

          // mock timeout
          return startDelay.resolve();
        }).then(() => {
          auctionSpy.calledOnce.should.equal(true);

          // does not call auction again once ids are synced
          mockIdCallback.callArgWith(0, {'MOCKID': '1234'});
          auctionSpy.calledOnce.should.equal(true);

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });

      it('delays auction if auctionDelay is set, continuing auction if ids are fetched before timing out', function () {
        config.setConfig({
          userSync: {
            auctionDelay: 33,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return runBidsHook(auctionSpy, {adUnits}).then(() => {
          // check auction was delayed
          startDelay.calledWith(33);
          auctionSpy.calledOnce.should.equal(false);

          // check ids were fetched
          mockIdCallback.calledOnce.should.equal(true);

          // if ids returned, should continue auction
          mockIdCallback.callArgWith(0, {'MOCKID': '1234'});
          return clearStack();
        }).then(() => {
          auctionSpy.calledOnce.should.equal(true);

          // check ids were copied to bids
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid.userIdAsEids).to.not.exist;// "mid" is an un-known submodule for USER_IDS_CONFIG in eids.js
            });
          });

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });

      it('does not delay auction if set to 0, delays id fetch after auction ends with syncDelay', function () {
        config.setConfig({
          userSync: {
            auctionDelay: 0,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return expectImmediateBidHook(auctionSpy, {adUnits})
          .then(() => {
            // should not delay auction
            auctionSpy.calledOnce.should.equal(true);

            // check user sync is delayed after auction is ended
            mockIdCallback.calledOnce.should.equal(false);
            events.on.calledOnce.should.equal(true);
            events.on.calledWith(EVENTS.AUCTION_END, sinon.match.func);

            // once auction is ended, sync user ids after delay
            events.on.callArg(1);
            callbackDelay.calledWith(77);
            mockIdCallback.calledOnce.should.equal(false);

            return callbackDelay.resolve();
          }).then(() => {
            // once sync delay is over, ids should be fetched
            mockIdCallback.calledOnce.should.equal(true);
          });
      });

      it('does not delay user id sync after auction ends if set to 0', function () {
        config.setConfig({
          userSync: {
            auctionDelay: 0,
            syncDelay: 0,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return expectImmediateBidHook(auctionSpy, {adUnits})
          .then(() => {
            // auction should not be delayed
            auctionSpy.calledOnce.should.equal(true);

            // sync delay after auction is ended
            mockIdCallback.calledOnce.should.equal(false);
            events.on.calledOnce.should.equal(true);
            events.on.calledWith(EVENTS.AUCTION_END, sinon.match.func);

            // once auction is ended, if no sync delay, fetch ids
            events.on.callArg(1);
            callbackDelay.calledWith(0);
            return callbackDelay.resolve();
          }).then(() => {
            mockIdCallback.calledOnce.should.equal(true);
          });
      });

      it('does not delay auction if there are no ids to fetch', function () {
        coreStorage.getCookie.withArgs('MOCKID').returns('123456778');
        config.setConfig({
          userSync: {
            auctionDelay: 33,
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        return runBidsHook(auctionSpy, {adUnits}).then(() => {
          auctionSpy.calledOnce.should.equal(true);
          mockIdCallback.calledOnce.should.equal(false);

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });
    });

    describe('Start auction hook appends userId to first party data', function () {
      let adUnits;

      beforeEach(function () {
        adUnits = [getAdUnitMock()];
      });

      function getGlobalEids() {
        return new Promise((resolve) => {
          startAuctionHook(function ({ortb2Fragments}) {
            resolve(ortb2Fragments.global.user?.ext?.eids);
          }, {ortb2Fragments: { global: {} }})
        })
      }

      it('test hook from pubcommonid cookie', async function () {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
        try {
          const eids = await getGlobalEids();
          expect(eids).to.eql([{
            source: 'pubcid.org',
            uids: [{id: 'testpubcid', atype: 1}]
          }])
        } finally {
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        }
      });

      it('test hook from pubcommonid html5', async function () {
        // simulate existing browser local storage values
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', new Date(Date.now() + 100000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'html5']));

        try {
          const eids = await getGlobalEids();
          expect(eids).to.eql([{
            source: 'pubcid.org',
            uids: [{id: 'testpubcid', atype: 1}]
          }]);
        } finally {
          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');
        }
      });

      it('test hook from pubcommonid cookie&html5', async function () {
        const expiration = new Date(Date.now() + 100000).toUTCString();
        coreStorage.setCookie('pubcid', 'testpubcid', expiration);
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', expiration);

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie&html5']));

        try {
          const eids = await getGlobalEids();
          expect(eids).to.eql([{
            source: 'pubcid.org',
            uids: [{id: 'testpubcid', atype: 1}]
          }]);
        } finally {
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');
        }
      });

      it('test hook from pubcommonid cookie&html5, no cookie present', async function () {
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', new Date(Date.now() + 100000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie&html5']));

        try {
          const eids = await getGlobalEids();
          expect(eids).to.eql([{
            source: 'pubcid.org',
            uids: [{id: 'testpubcid', atype: 1}]
          }])
        } finally {
          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');
        }
      });

      it('test hook from pubcommonid cookie&html5, no local storage entry', async function () {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie&html5']));

        try {
          const eids = await getGlobalEids();
          expect(eids).to.eql([{
            source: 'pubcid.org',
            uids: [{id: 'testpubcid', atype: 1}]
          }]);
        } finally {
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        }
      });

      it('test hook from pubcommonid config value object', async function () {
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigValueMock('pubCommonId', {'pubcidvalue': 'testpubcidvalue'}));
        expect(await getGlobalEids()).to.not.exist; // "pubcidvalue" is an un-known submodule for USER_IDS_CONFIG in eids.js
      });

      it('test hook from pubProvidedId config params', async function () {
        init(config);
        setSubmoduleRegistry([pubProvidedIdSubmodule]);
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [{
              name: 'pubProvidedId',
              params: {
                eids: [{
                  source: 'example.com',
                  uids: [{
                    id: 'value read from cookie or local storage',
                    ext: {
                      stype: 'ppuid'
                    }
                  }]
                }, {
                  source: 'id-partner.com',
                  uids: [{
                    id: 'value read from cookie or local storage',
                    ext: {
                      stype: 'dmp'
                    }
                  }]
                }],
                eidsFunction: function () {
                  return [{
                    source: 'provider.com',
                    uids: [{
                      id: 'value read from cookie or local storage',
                      ext: {
                        stype: 'sha256email'
                      }
                    }]
                  }]
                }
              }
            }
            ]
          }
        });

        const eids = await getGlobalEids();
        expect(eids).to.deep.contain(
          {
            source: 'example.com',
            uids: [{
              id: 'value read from cookie or local storage',
              ext: {
                stype: 'ppuid'
              }
            }]
          });
        expect(eids).to.deep.contain({
          source: 'provider.com',
          uids: [{
            id: 'value read from cookie or local storage',
            ext: {
              stype: 'sha256email'
            }
          }]
        });
      });

      it('should add new id system ', async function () {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);

        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [{
              name: 'pubCommonId', storage: {name: 'pubcid', type: 'cookie'}
            }, {
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        // Add new submodule named 'mockId'
        attachIdSystem({
          name: 'mockId',
          decode: function (value) {
            return {
              'mid': value['MOCKID']
            };
          },
          getId: function (config, consentData, storedId) {
            if (storedId) return {};
            return {id: {'MOCKID': '1234'}};
          },
          eids: {
            mid: {
              source: 'mockid'
            }
          }
        });

        const eids = await getGlobalEids();
        expect(eids.find(eid => eid.source === 'mockid')).to.exist;
      });

      describe('storage disclosure', () => {
        let disclose;
        function discloseStorageHook(next, ...args) {
          disclose(...args);
          next(...args);
        }
        before(() => {
          discloseStorageUse.before(discloseStorageHook)
        })
        after(() => {
          discloseStorageUse.getHooks({hook: discloseStorageHook}).remove();
        })
        beforeEach(() => {
          disclose = sinon.stub();
          setSubmoduleRegistry([
            {
              name: 'mockId',
            }
          ]);
        });

        function setStorage(storage) {
          config.setConfig({
            userSync: {
              userIds: [{
                name: 'mockId',
                storage
              }]
            }
          })
        }

        function expectDisclosure(storageType, name, maxAgeSeconds) {
          const suffixes = storageType === STORAGE_TYPE_COOKIES ? COOKIE_SUFFIXES : HTML5_SUFFIXES;
          suffixes.forEach(suffix => {
            const expectation = {
              identifier: name + suffix,
              type: storageType === STORAGE_TYPE_COOKIES ? 'cookie' : 'web',
              purposes: [1, 2, 3, 4, 7],
            }
            if (storageType === STORAGE_TYPE_COOKIES) {
              Object.assign(expectation, {
                maxAgeSeconds: maxAgeSeconds,
                cookieRefresh: true
              })
            }
            sinon.assert.calledWith(disclose, 'userId', expectation)
          })
        }

        it('should disclose cookie storage', async () => {
          setStorage({
            name: 'mid_cookie',
            type: STORAGE_TYPE_COOKIES,
            expires: 1
          })
          await getGlobal().refreshUserIds();
          expectDisclosure(STORAGE_TYPE_COOKIES, 'mid_cookie', 1 * 24 * 60 * 60);
        });

        it('should disclose html5 storage', async () => {
          setStorage({
            name: 'mid_localStorage',
            type: STORAGE_TYPE_LOCALSTORAGE,
            expires: 1
          });
          await getGlobal().refreshUserIds();
          expectDisclosure(STORAGE_TYPE_LOCALSTORAGE, 'mid_localStorage');
        });

        it('should disclose both', async () => {
          setStorage({
            name: 'both',
            type: `${STORAGE_TYPE_COOKIES}&${STORAGE_TYPE_LOCALSTORAGE}`,
            expires: 1
          });
          await getGlobal().refreshUserIds();
          expectDisclosure(STORAGE_TYPE_COOKIES, 'both', 1 * 24 * 60 * 60);
          expectDisclosure(STORAGE_TYPE_LOCALSTORAGE, 'both');
        });

        it('should handle cookies with no expires', async () => {
          setStorage({
            name: 'cookie',
            type: STORAGE_TYPE_COOKIES
          });
          await getGlobal().refreshUserIds();
          expectDisclosure(STORAGE_TYPE_COOKIES, 'cookie', 0);
        })
      })

      describe('activity controls', () => {
        let isAllowed;
        const MOCK_IDS = ['mockId1', 'mockId2']
        beforeEach(() => {
          isAllowed = sinon.stub(dep, 'isAllowed');
          init(config);
          setSubmoduleRegistry([]);
          const mods = MOCK_IDS.map((name) => ({
            name,
            decode: function (value) {
              return {
                [name]: value
              };
            },
            getId: function () {
              return {id: `${name}Value`};
            },
            eids: {
              [name]: {
                source: name
              }
            }
          }));
          mods.forEach(attachIdSystem);
        });
        afterEach(() => {
          isAllowed.restore();
        });

        it('should check for enrichEids activity permissions', async () => {
          isAllowed.callsFake((activity, params) => {
            return !(activity === ACTIVITY_ENRICH_EIDS &&
              params[ACTIVITY_PARAM_COMPONENT_TYPE] === MODULE_TYPE_UID &&
              params[ACTIVITY_PARAM_COMPONENT_NAME] === MOCK_IDS[0])
          })

          config.setConfig({
            userSync: {
              syncDelay: 0,
              userIds: MOCK_IDS.map(name => ({
                name, storage: {name, type: 'cookie'}
              }))
            }
          });
          const eids = await getGlobalEids();
          const activeSources = eids.map(({source}) => source);
          expect(Array.from(new Set(activeSources))).to.have.members([MOCK_IDS[1]]);
        });
      })
    });

    describe('callbacks at the end of auction', function () {
      beforeEach(function () {
        config.setConfig({
          // callbacks run after auction end only when auctionDelay is 0
          userSync: {
            auctionDelay: 0,
          }
        })
        sinon.stub(events, 'getEvents').returns([]);
        sinon.stub(utils, 'triggerPixel');
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      });

      afterEach(function () {
        events.getEvents.restore();
        utils.triggerPixel.restore();
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        resetConsentData();
        delete window.__tcfapi;
      });

      function endAuction() {
        events.emit(EVENTS.AUCTION_END, {});
        return new Promise((resolve) => setTimeout(resolve));
      }

      it('pubcid callback with url', function () {
        let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
        customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.mergeConfig(customCfg);
        return runBidsHook(sinon.stub(), {}).then(() => {
          expect(utils.triggerPixel.called).to.be.false;
          return endAuction();
        }).then(() => {
          expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');
        });
      });
    });

    describe('Submodule ID storage', () => {
      let submodule;
      beforeEach(() => {
        submodule = {
          submodule: {},
          config: {
            name: 'mockId',
          },
          storageMgr: {
            setCookie: sinon.stub(),
            setDataInLocalStorage: sinon.stub()
          },
          enabledStorageTypes: ['cookie', 'html5']
        }
      });

      describe('Set cookie behavior', function () {
        beforeEach(() => {
          submodule.config.storage = {
            type: 'cookie'
          }
        });
        it('should allow submodules to override the domain', function () {
          submodule.submodule.domainOverride = function() {
            return 'foo.com'
          }
          setStoredValue(submodule, 'bar');
          expect(submodule.storageMgr.setCookie.getCall(0).args[4]).to.equal('foo.com');
        });

        it('should pass no domain if submodule does not override the domain', function () {
          setStoredValue(submodule, 'bar');
          expect(submodule.storageMgr.setCookie.getCall(0).args[4]).to.equal(null);
        });
      });
    });

    describe('Consent changes determine getId refreshes', function () {
      let expStr;
      let adUnits;
      let mockGetId;
      let mockDecode;
      let mockExtendId;
      let mockIdSystem;
      let userIdConfig;

      const mockIdCookieName = 'MOCKID';

      beforeEach(function () {
        mockGetId = sinon.stub();
        mockDecode = sinon.stub();
        mockExtendId = sinon.stub();
        mockIdSystem = {
          name: 'mockId',
          getId: mockGetId,
          decode: mockDecode,
          extendId: mockExtendId
        };
        userIdConfig = {
          userSync: {
            userIds: [{
              name: 'mockId',
              storage: {
                name: 'MOCKID',
                type: 'cookie',
                refreshInSeconds: 30
              }
            }],
            auctionDelay: 5
          }
        };

        // clear cookies
        expStr = (new Date(Date.now() + 25000).toUTCString());
        coreStorage.setCookie(mockIdCookieName, '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie(`${mockIdCookieName}_last`, '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie(`${mockIdCookieName}_cst`, '', EXPIRED_COOKIE_DATE);
        allConsent.reset();

        // init
        adUnits = [getAdUnitMock()];
        init(config);

        // init id system
        attachIdSystem(mockIdSystem);
      });

      afterEach(function () {
        config.resetConfig();
      });

      function setStorage({
        val = JSON.stringify({id: '1234'}),
        lastDelta = 60 * 1000,
        cst = null
      } = {}) {
        coreStorage.setCookie(mockIdCookieName, val, expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - lastDelta).toUTCString()), expStr);
        if (cst != null) {
          coreStorage.setCookie(`${mockIdCookieName}_cst`, cst, expStr);
        }
      }

      it('calls getId if no stored consent data and refresh is not needed', function () {
        setStorage({lastDelta: 1000});
        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('calls getId if no stored consent data but refresh is needed', function () {
        setStorage();
        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('calls getId if empty stored consent and refresh not needed', function () {
        setStorage({cst: ''});
        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('calls getId if stored consent does not match current consent and refresh not needed', function () {
        setStorage({cst: getConsentHash()});
        gdprDataHandler.setConsentData({
          consentString: 'different'
        });

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.notCalled(mockExtendId);
        });
      });

      it('does not call getId if stored consent matches current consent and refresh not needed', function () {
        setStorage({lastDelta: 1000, cst: getConsentHash()});

        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.notCalled(mockGetId);
          sinon.assert.calledOnce(mockDecode);
          sinon.assert.calledOnce(mockExtendId);
        });
      });

      it('calls getId with the list of enabled storage types', function() {
        setStorage({lastDelta: 1000});
        config.setConfig(userIdConfig);

        let innerAdUnits;
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          sinon.assert.calledOnce(mockGetId);

          expect(mockGetId.getCall(0).args[0].enabledStorageTypes).to.deep.equal([ userIdConfig.userSync.userIds[0].storage.type ]);
        });
      });
    });

    describe('requestDataDeletion', () => {
      function idMod(name, value) {
        return {
          name,
          getId() {
            return {id: value}
          },
          decode(d) {
            return {[name]: d}
          },
          onDataDeletionRequest: sinon.stub()
        }
      }
      let mod1, mod2, mod3, mod4, cfg1, cfg2, cfg3, cfg4;

      beforeEach(() => {
        init(config);
        mod1 = idMod('id1', 'val1');
        mod2 = idMod('id2', 'val2');
        mod3 = idMod('id3', 'val3');
        mod4 = idMod('id4', 'val4');
        cfg1 = getStorageMock('id1', 'id1', 'cookie');
        cfg2 = getStorageMock('id2', 'id2', 'html5');
        cfg3 = getStorageMock('id3', 'id3', 'cookie&html5');
        cfg4 = {name: 'id4', value: {id4: 'val4'}};
        setSubmoduleRegistry([mod1, mod2, mod3, mod4]);
        config.setConfig({
          auctionDelay: 1,
          userSync: {
            userIds: [cfg1, cfg2, cfg3, cfg4]
          }
        });
        return getGlobal().refreshUserIds();
      });

      it('deletes stored IDs', () => {
        expect(coreStorage.getCookie('id1')).to.exist;
        expect(coreStorage.getDataFromLocalStorage('id2')).to.exist;
        expect(coreStorage.getCookie('id3')).to.exist;
        expect(coreStorage.getDataFromLocalStorage('id3')).to.exist;
        requestDataDeletion(sinon.stub());
        expect(coreStorage.getCookie('id1')).to.not.exist;
        expect(coreStorage.getDataFromLocalStorage('id2')).to.not.exist;
        expect(coreStorage.getCookie('id3')).to.not.exist;
        expect(coreStorage.getDataFromLocalStorage('id3')).to.not.exist;
      });

      it('invokes onDataDeletionRequest', () => {
        requestDataDeletion(sinon.stub());
        sinon.assert.calledWith(mod1.onDataDeletionRequest, cfg1, {id1: 'val1'});
        sinon.assert.calledWith(mod2.onDataDeletionRequest, cfg2, {id2: 'val2'});
        sinon.assert.calledWith(mod3.onDataDeletionRequest, cfg3, {id3: 'val3'});
        sinon.assert.calledWith(mod4.onDataDeletionRequest, cfg4, {id4: 'val4'});
      });

      describe('does not choke when onDataDeletionRequest', () => {
        Object.entries({
          'is missing': () => { delete mod1.onDataDeletionRequest },
          'throws': () => { mod1.onDataDeletionRequest.throws(new Error()) }
        }).forEach(([t, setup]) => {
          it(t, () => {
            setup();
            const next = sinon.stub();
            const arg = {random: 'value'};
            requestDataDeletion(next, arg);
            sinon.assert.calledOnce(mod2.onDataDeletionRequest);
            sinon.assert.calledOnce(mod3.onDataDeletionRequest);
            sinon.assert.calledOnce(mod4.onDataDeletionRequest);
            sinon.assert.calledWith(next, arg);
          })
        })
      })
    });
  });

  describe('handles config with ESP configuration in user sync object', function() {
    before(() => {
      mockGpt.reset();
    })
    beforeEach(() => {
      window.googletag.secureSignalProviders = {
        push: sinon.stub()
      };
    });

    afterEach(() => {
      mockGpt.reset();
    })

    describe('Call registerSignalSources to register signal sources with gtag', function () {
      it('pbjs.registerSignalSources should be defined', () => {
        expect(typeof (getGlobal()).registerSignalSources).to.equal('function');
      });

      it('passes encrypted signal sources to GPT', function () {
        const clock = sandbox.useFakeTimers();
        init(config);
        config.setConfig({
          userSync: {
            encryptedSignalSources: {
              registerDelay: 0,
              sources: [{source: ['pubcid.org'], encrypt: false}]
            }
          }
        });
        getGlobal().registerSignalSources();
        clock.tick(1);
        sinon.assert.calledWith(window.googletag.secureSignalProviders.push, sinon.match({
          id: 'pubcid.org'
        }))
      });
    })

    describe('Call getEncryptedEidsForSource to get encrypted Eids for source', function() {
      const signalSources = ['pubcid.org'];

      it('pbjs.getEncryptedEidsForSource should be defined', () => {
        expect(typeof (getGlobal()).getEncryptedEidsForSource).to.equal('function');
      });

      it('pbjs.getEncryptedEidsForSource should return the string without encryption if encryption is false', () => {
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [
              {
                'name': 'sharedId',
                'storage': {
                  'type': 'cookie',
                  'name': '_pubcid',
                  'expires': 365
                }
              },
              {
                'name': 'pubcid.org'
              }
            ]
          },
        });
        const encrypt = false;
        return (getGlobal()).getEncryptedEidsForSource(signalSources[0], encrypt).then((data) => {
          const users = (getGlobal()).getUserIdsAsEids();
          expect(data).to.equal(users[0].uids[0].id);
        })
      });

      it('pbjs.getEncryptedEidsForSource should return prioritized id as non-encrypted string', (done) => {
        init(config);
        const EIDS = {
          uid2: {
            source: 'uidapi.com',
            getValue(data) {
              return data.id
            }
          },
          pubcid: {
            source: 'pubcid.org',
          },
          lipb: {
            source: 'liveintent.com',
            getValue(data) {
              return data.lipbid
            }
          },
          merkleId: {
            source: 'merkleinc.com',
            getValue(data) {
              return data.id
            }
          }
        }
        setSubmoduleRegistry([
          createMockIdSubmodule('mockId1Module', {id: {uid2: {id: 'uid2_value'}}}, null, EIDS),
          createMockIdSubmodule('mockId2Module', {id: {pubcid: 'pubcid_value', lipb: {lipbid: 'lipbid_value_from_mockId2Module'}}}, null, EIDS),
          createMockIdSubmodule('mockId3Module', {id: {uid2: {id: 'uid2_value_from_mockId3Module'}, pubcid: 'pubcid_value_from_mockId3Module', lipb: {lipbid: 'lipbid_value'}, merkleId: {id: 'merkleId_value_from_mockId3Module'}}}, null, EIDS),
          createMockIdSubmodule('mockId4Module', {id: {merkleId: {id: 'merkleId_value'}}}, null, EIDS)
        ]);
        config.setConfig({
          userSync: {
            idPriority: {
              uid2: ['mockId3Module', 'mockId1Module'],
              merkleId: ['mockId4Module', 'mockId3Module']
            },
            auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
            userIds: [
              { name: 'mockId1Module' },
              { name: 'mockId2Module' },
              { name: 'mockId3Module' },
              { name: 'mockId4Module' }
            ]
          }
        });

        const expctedIds = [
          'pubcid_value',
          'uid2_value_from_mockId3Module',
          'merkleId_value',
          'lipbid_value_from_mockId2Module'
        ];

        const encrypt = false;

        Promise.all([
          getGlobal().getEncryptedEidsForSource('pubcid.org', encrypt),
          getGlobal().getEncryptedEidsForSource('uidapi.com', encrypt),
          getGlobal().getEncryptedEidsForSource('merkleinc.com', encrypt),
          getGlobal().getEncryptedEidsForSource('liveintent.com', encrypt)
        ]).then((result) => {
          expect(result).to.deep.equal(expctedIds);
          done();
        })
      });

      describe('pbjs.getEncryptedEidsForSource', () => {
        beforeEach(() => {
          init(config);
          setSubmoduleRegistry([sharedIdSystemSubmodule]);
          config.setConfig({
            userSync: {
              auctionDelay: 10,
              userIds: [{
                name: 'pubCommonId', value: {'pubcid': '11111'}
              }]
            }
          });
        });

        it('should return the string base64 encryption if encryption is true', (done) => {
          const encrypt = true;
          (getGlobal()).getEncryptedEidsForSource(signalSources[0], encrypt).then((result) => {
            expect(result.startsWith('1||')).to.true;
            done();
          }).catch(done);
        });

        it('pbjs.getEncryptedEidsForSource should return string if custom function is defined', () => {
          const getCustomSignal = () => {
            return '{"keywords":["tech","auto"]}';
          }
          const expectedString = '1||eyJrZXl3b3JkcyI6WyJ0ZWNoIiwiYXV0byJdfQ==';
          const encrypt = false;
          const source = 'pubmatic.com';
          return (getGlobal()).getEncryptedEidsForSource(source, encrypt, getCustomSignal).then((result) => {
            expect(result).to.equal(expectedString);
          });
        });
      });

      it('pbjs.getUserIdsAsEidBySource', (done) => {
        const users = {
          'source': 'pubcid.org',
          'uids': [
            {
              'id': '11111',
              'atype': 1
            }
          ]
        }
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig({
          userSync: {
            auctionDelay: 10,
            userIds: [{
              name: 'pubCommonId', value: {'pubcid': '11111'}
            }]
          }
        });
        expect(typeof (getGlobal()).getUserIdsAsEidBySource).to.equal('function');
        (getGlobal()).getUserIdsAsync().then(() => {
          expect(getGlobal().getUserIdsAsEidBySource(signalSources[0])).to.deep.equal(users);
          done();
        });
      });

      it('pbjs.getUserIdsAsEidBySource with priority config available to core', () => {
        init(config);
        const uid2Eids = createMockEid('uid2', 'uidapi.com')
        const pubcEids = createMockEid('pubcid', 'pubcid.org')
        const liveIntentEids = createMockEid('lipb', 'liveintent.com')
        const merkleEids = createMockEid('merkleId', 'merkleinc.com')

        setSubmoduleRegistry([
          createMockIdSubmodule('mockId1Module', {id: {uid2: {id: 'uid2_value'}}}, null, uid2Eids),
          createMockIdSubmodule('mockId2Module', {id: {pubcid: 'pubcid_value', lipb: {lipbid: 'lipbid_value_from_mockId2Module'}}}, null, {...pubcEids, ...liveIntentEids}),
          createMockIdSubmodule('mockId3Module', {id: {uid2: {id: 'uid2_value_from_mockId3Module'}, pubcid: 'pubcid_value_from_mockId3Module', lipb: {lipbid: 'lipbid_value'}, merkleId: {id: 'merkleId_value_from_mockId3Module'}}}, null, {...uid2Eids, ...pubcEids, ...liveIntentEids}),
          createMockIdSubmodule('mockId4Module', {id: {merkleId: {id: 'merkleId_value'}}}, null, merkleEids)
        ]);
        config.setConfig({
          userSync: {
            idPriority: {
              uid2: ['mockId3Module', 'mockId1Module'],
              merkleId: ['mockId4Module', 'mockId3Module']
            },
            auctionDelay: 10, // with auctionDelay > 0, no auction is needed to complete init
            userIds: [
              { name: 'mockId1Module' },
              { name: 'mockId2Module' },
              { name: 'mockId3Module' },
              { name: 'mockId4Module' }
            ]
          }
        });

        const ids = {
          'uidapi.com': {'uid2': {id: 'uid2_value_from_mockId3Module'}},
          'pubcid.org': {'pubcid': 'pubcid_value'},
          'liveintent.com': {'lipb': {lipbid: 'lipbid_value_from_mockId2Module'}},
          'merkleinc.com': {'merkleId': {id: 'merkleId_value'}}
        };

        return getGlobal().getUserIdsAsync().then(() => {
          expect(getGlobal().getUserIdsAsEidBySource('pubcid.org')).to.deep.equal(createEidsArray(ids['pubcid.org'])[0]);
          expect(getGlobal().getUserIdsAsEidBySource('uidapi.com')).to.deep.equal(createEidsArray(ids['uidapi.com'])[0]);
          expect(getGlobal().getUserIdsAsEidBySource('merkleinc.com')).to.deep.equal(createEidsArray(ids['merkleinc.com'])[0]);
          expect(getGlobal().getUserIdsAsEidBySource('liveintent.com')).to.deep.equal(createEidsArray(ids['liveintent.com'])[0]);
        });
      });
    })
  });

  describe('enrichEids', () => {
    let idValues;

    function mockIdSubmodule(key, ...extraKeys) {
      return {
        name: `${key}Module`,
        decode(v) { return v },
        getId() {
          return {
            id: Object.fromEntries(
              idValues[key]?.map(mod => [mod, key === mod ? `${key}_value` : `${mod}_value_from_${key}Module`])
            )
          }
        },
        primaryIds: [key],
        eids: {
          [key]: {
            source: `${key}.com`,
            atype: 1,
          },
          ...Object.fromEntries(extraKeys.map(extraKey => [extraKey, {
            source: `${extraKey}.com`,
            atype: 1,
            getUidExt() {
              return {provider: `${key}Module`}
            }
          }]))
        }
      }
    }

    beforeEach(() => {
      idValues = {
        mockId1: ['mockId1'],
        mockId2: ['mockId2', 'mockId3'],
        mockId3: ['mockId1', 'mockId2', 'mockId3', 'mockId4'],
        mockId4: ['mockId4']
      }
      init(config);

      setSubmoduleRegistry([
        mockIdSubmodule('mockId1'),
        mockIdSubmodule('mockId2', 'mockId3'),
        mockIdSubmodule('mockId3', 'mockId1', 'mockId2', 'mockId4'),
        mockIdSubmodule('mockId4')
      ]);
    })

    function enrich({global = {}, bidder = {}} = {}) {
      return getGlobal().getUserIdsAsync().then(() => {
        enrichEids({global, bidder});
        return {global, bidder};
      })
    }

    function eidsFrom(nameFromModuleMapping) {
      return Object.entries(nameFromModuleMapping).map(([key, module]) => {
        const owner = `${key}Module` === module
        const uid = {
          id: owner ? `${key}_value` : `${key}_value_from_${module}`,
          atype: 1,
        };
        if (!owner) {
          uid.ext = {provider: module}
        }
        return {
          source: `${key}.com`,
          uids: [uid]
        }
      })
    }

    function bidderEids(bidderMappings) {
      return Object.fromEntries(
        Object.entries(bidderMappings).map(([bidder, mapping]) => [bidder, {user: {ext: {eids: eidsFrom(mapping)}}}])
      )
    }

    it('should use lower-priority module if higher priority module cannot provide an id', () => {
      idValues.mockId3 = []
      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId3Module', 'mockId1Module']
          },
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId3Module' },
          ]
        }
      });
      return enrich().then(({global}) => {
        expect(global.user.ext.eids).to.eql(eidsFrom({
          mockId1: 'mockId1Module'
        }))
      });
    });

    it('should not choke if no id is available for a module', () => {
      idValues.mockId1 = []
      config.setConfig({
        userSync: {
          userIds: [
            { name: 'mockId1Module' },
          ]
        }
      });
      return enrich().then(({global}) => {
        expect(global.user?.ext?.eids).to.not.exist;
      });
    });

    it('should add EIDs that are not bidder-restricted', () => {
      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId3Module', 'mockId1Module'],
            mockId4: ['mockId4Module', 'mockId3Module']
          },
          userIds: [
            { name: 'mockId1Module' },
            { name: 'mockId2Module' },
            { name: 'mockId3Module' },
            { name: 'mockId4Module' },
          ]
        }
      });
      return enrich().then(({global}) => {
        expect(global.user.ext.eids).to.eql(eidsFrom({
          mockId1: 'mockId3Module',
          mockId2: 'mockId2Module',
          mockId3: 'mockId3Module',
          mockId4: 'mockId4Module'
        }));
      });
    });

    it('should separate bidder-restricted eids', () => {
      config.setConfig({
        userSync: {
          userIds: [
            { name: 'mockId1Module', bidders: ['bidderA', 'bidderB'] },
            { name: 'mockId4Module' },
          ]
        }
      });
      return enrich().then(({global, bidder}) => {
        expect(global.user.ext.eids).to.eql(eidsFrom({
          mockId4: 'mockId4Module'
        }));
        [bidder.bidderA, bidder.bidderB].forEach(bidderCfg => {
          expect(bidderCfg.user.ext.eids).to.eql(eidsFrom({
            mockId1: 'mockId1Module'
          }))
        })
      });
    })

    describe('conflicting bidder filters', () => {
      beforeEach(() => {
        idValues.mockId2 = ['mockId1'];
        idValues.mockId3 = ['mockId1'];
        idValues.mockId4 = ['mockId1'];
        setSubmoduleRegistry([
          mockIdSubmodule('mockId1'),
          mockIdSubmodule('mockId2', 'mockId1'),
          mockIdSubmodule('mockId3', 'mockId1'),
          mockIdSubmodule('mockId4', 'mockId1')
        ]);
      })

      function bidderEids(bidderEidMap) {
        return Object.fromEntries(
          Object.entries(bidderEidMap).map(([bidder, eidMap]) => [bidder, {
            user: {
              ext: {
                eids: eidsFrom(eidMap)
              }
            }
          }])
        )
      }
      describe('primary provider is restricted', () => {
        function setup() {
          config.setConfig({
            userSync: {
              idPriority: {
                mockId1: ['mockId1Module', 'mockId2Module', 'mockId3Module', 'mockId4Module'],
              },
              userIds: [
                { name: 'mockId1Module', bidders: ['bidderA'] },
                { name: 'mockId2Module', bidders: ['bidderA', 'bidderB'] },
                { name: 'mockId3Module', bidders: ['bidderC'] },
                { name: 'mockId4Module' }
              ]
            }
          });
        }

        it('should restrict ID if it comes from restricted modules', async () => {
          setup();
          const {global, bidder} = await enrich();
          expect(global).to.eql({});
          expect(bidder).to.eql(bidderEids({
            bidderA: {
              mockId1: 'mockId1Module'
            },
            bidderB: {
              mockId1: 'mockId2Module'
            },
            bidderC: {
              mockId1: 'mockId3Module'
            }
          }))
        });
        it('should use secondary module restrictions if ID comes from it', async () => {
          idValues.mockId1 = [];
          setup();
          const {global, bidder} = await enrich();
          expect(global).to.eql({});
          expect(bidder).to.eql(bidderEids({
            bidderA: {
              mockId1: 'mockId2Module'
            },
            bidderB: {
              mockId1: 'mockId2Module'
            },
            bidderC: {
              mockId1: 'mockId3Module'
            }
          }));
        });
        it('should not restrict if ID comes from unrestricted module', async () => {
          idValues.mockId1 = [];
          idValues.mockId2 = [];
          idValues.mockId3 = [];
          setup();
          const {global, bidder} = await enrich();
          expect(global.user.ext.eids).to.eql(eidsFrom({
            mockId1: 'mockId4Module'
          }));
          expect(bidder).to.eql({});
        });
      });
      describe('secondary provider is restricted', () => {
        function setup() {
          config.setConfig({
            userSync: {
              idPriority: {
                mockId1: ['mockId1Module', 'mockId2Module', 'mockId3Module', 'mockId4Module'],
              },
              userIds: [
                { name: 'mockId1Module' },
                { name: 'mockId2Module', bidders: ['bidderA'] },
                { name: 'mockId3Module', bidders: ['bidderA', 'bidderB'] },
                { name: 'mockId4Module', bidders: ['bidderC'] },
              ]
            }
          });
        }
        it('should not restrict if primary id is available', async () => {
          setup();
          const {global, bidder} = await enrich();
          expect(global.user.ext.eids).to.eql(eidsFrom({
            mockId1: 'mockId1Module'
          }));
          expect(bidder).to.eql({});
        });
        it('should use secondary modules\' restrictions if they provide the ID', async () => {
          idValues.mockId1 = [];
          setup();
          const {global, bidder} = await enrich();
          expect(global).to.eql({});
          expect(bidder).to.eql(bidderEids({
            bidderA: {
              mockId1: 'mockId2Module'
            },
            bidderB: {
              mockId1: 'mockId3Module'
            },
            bidderC: {
              mockId1: 'mockId4Module'
            }
          }))
        });
      })
    })

    it('should provide bidder-specific IDs, even when they conflict across bidders', () => {
      config.setConfig({
        userSync: {
          idPriority: {
            mockId1: ['mockId1Module', 'mockId3Module'],
          },
          userIds: [
            { name: 'mockId1Module', bidders: ['bidderA'] },
            { name: 'mockId3Module', bidders: ['bidderB'] },
          ]
        }
      });
      return enrich().then(({global, bidder}) => {
        expect(global.user?.ext?.eids).to.not.exist;
        expect(bidder).to.eql(bidderEids({
          bidderA: {
            mockId1: 'mockId1Module'
          },
          bidderB: {
            mockId1: 'mockId3Module',
            mockId2: 'mockId3Module',
            mockId3: 'mockId3Module',
            mockId4: 'mockId3Module'
          }
        }));
      });
    });

    it('should not override pub-provided EIDS', () => {
      config.setConfig({
        userSync: {
          auctionDelay: 10,
          userIds: [
            { name: 'mockId1Module', bidders: ['bidderA', 'bidderB'] },
            { name: 'mockId4Module' },
          ]
        }
      });
      const globalEids = [{pub: 'provided'}];
      const bidderAEids = [{bidder: 'A'}]
      const fpd = {
        global: {user: {ext: {eids: globalEids}}},
        bidder: {
          bidderA: {
            user: {ext: {eids: bidderAEids}}
          }
        }
      }
      return enrich(fpd).then(({global, bidder}) => {
        expect(global.user.ext.eids).to.eql(globalEids.concat(eidsFrom({
          mockId4: 'mockId4Module'
        })));
        expect(bidder.bidderA.user.ext.eids).to.eql(bidderAEids.concat(eidsFrom({
          mockId1: 'mockId1Module'
        })));
        expect(bidder.bidderB.user.ext.eids).to.eql(eidsFrom({
          mockId1: 'mockId1Module'
        }));
      });
    })

    it('adUnits and ortbFragments should not contain ids from a submodule that was disabled by activityControls', () => {
      const UNALLOWED_MODULE = 'mockId3';
      const ALLOWED_MODULE = 'mockId1';
      const UNALLOWED_MODULE_FULLNAME = UNALLOWED_MODULE + 'Module';
      const ALLOWED_MODULE_FULLNAME = ALLOWED_MODULE + 'Module';
      const bidders = ['bidderA', 'bidderB'];

      idValues = {
        [ALLOWED_MODULE]: [ALLOWED_MODULE],
        [UNALLOWED_MODULE]: [UNALLOWED_MODULE],
      };
      init(config);

      setSubmoduleRegistry([
        mockIdSubmodule(ALLOWED_MODULE),
        mockIdSubmodule(UNALLOWED_MODULE),
      ]);

      const unregisterRule = registerActivityControl(ACTIVITY_ENRICH_EIDS, 'ruleName', ({componentName, init}) => {
        if (componentName === 'mockId3Module' && init === false) { return ({ allow: false, reason: "disabled" }); }
      });

      config.setConfig({
        userSync: {
          userIds: [
            { name: ALLOWED_MODULE_FULLNAME, bidders },
            { name: UNALLOWED_MODULE_FULLNAME, bidders },
          ]
        }
      });

      return getGlobal().getUserIdsAsync().then(() => {
        const ortb2Fragments = {
          global: {
            user: {}
          },
          bidder: {
            bidderA: {
              user: {}
            },
            bidderB: {
              user: {}
            }
          }
        };
        addIdData({ ortb2Fragments });

        bidders.forEach((bidderName) => {
          const userIdModules = ortb2Fragments.bidder[bidderName].user.ext.eids.map(eid => eid.source);
          expect(userIdModules).to.include(ALLOWED_MODULE + '.com');
          expect(userIdModules).to.not.include(UNALLOWED_MODULE + '.com');
        });

        unregisterRule();
      });
    })
  });
  describe('adUnitEidsHook', () => {
    let next, auction, adUnits, ortb2Fragments;
    beforeEach(() => {
      next = sinon.stub();
      adUnits = [
        {
          code: 'au1',
          bids: [
            {
              bidder: 'bidderA'
            },
            {
              bidder: 'bidderB'
            }
          ]
        },
        {
          code: 'au2',
          bids: [
            {
              bidder: 'bidderC'
            }
          ]
        }
      ]
      ortb2Fragments = {}
      auction = {
        getAdUnits: () => adUnits,
        getFPD: () => ortb2Fragments
      }
    });
    it('should not set userIdAsEids when no eids are provided', () => {
      adUnitEidsHook(next, auction);
      auction.getAdUnits().flatMap(au => au.bids).forEach(bid => {
        expect(bid.userIdAsEids).to.not.exist;
      })
    });
    it('should add global eids', () => {
      ortb2Fragments.global = {
        user: {
          ext: {
            eids: ['some-eid']
          }
        }
      };
      adUnitEidsHook(next, auction);
      auction.getAdUnits().flatMap(au => au.bids).forEach(bid => {
        expect(bid.userIdAsEids).to.eql(['some-eid']);
      })
    })
    it('should add bidder-specific eids', () => {
      ortb2Fragments.global = {
        user: {
          ext: {
            eids: ['global']
          }
        }
      };
      ortb2Fragments.bidder = {
        bidderA: {
          user: {
            ext: {
              eids: ['bidder']
            }
          }
        }
      }
      adUnitEidsHook(next, auction);
      auction.getAdUnits().flatMap(au => au.bids).forEach(bid => {
        const expected = bid.bidder === 'bidderA' ? ['global', 'bidder'] : ['global'];
        expect(bid.userIdAsEids).to.eql(expected);
      })
    });
    it('should add global eids to bidderless bids', () => {
      ortb2Fragments.global = {
        user: {
          ext: {
            eids: ['global']
          }
        }
      }
      delete adUnits[0].bids[0].bidder;
      adUnitEidsHook(next, auction);
      expect(adUnits[0].bids[0].userIdAsEids).to.eql(['global']);
    })
  });

  describe('generateSubmoduleContainers', () => {
    it('should properly map registry to submodule containers for empty previous submodule containers', () => {
      const previousSubmoduleContainers = [];
      const submoduleRegistry = [
        sharedIdSystemSubmodule,
        createMockIdSubmodule('mockId1Module', { id: { uid2: { id: 'uid2_value' } } }, null, null),
        createMockIdSubmodule('mockId2Module', { id: { uid2: { id: 'uid2_value' } } }, null, null),
      ];
      const configRegistry = [{ name: 'sharedId' }];
      const result = generateSubmoduleContainers({}, configRegistry, previousSubmoduleContainers, submoduleRegistry);
      expect(result).to.have.lengthOf(1);
      expect(result[0].submodule.name).to.eql('sharedId');
    });

    it('should properly map registry to submodule containers for non-empty previous submodule containers', () => {
      const previousSubmoduleContainers = [
        {submodule: {name: 'notSharedId'}, config: {name: 'notSharedId'}},
        {submodule: {name: 'notSharedId2'}, config: {name: 'notSharedId2'}},
      ];
      const submoduleRegistry = [
        sharedIdSystemSubmodule,
        createMockIdSubmodule('mockId1Module', { id: { uid2: { id: 'uid2_value' } } }, null, null),
        createMockIdSubmodule('mockId2Module', { id: { uid2: { id: 'uid2_value' } } }, null, null),
      ];
      const configRegistry = [{ name: 'sharedId' }];
      const result = generateSubmoduleContainers({}, configRegistry, previousSubmoduleContainers, submoduleRegistry);
      expect(result).to.have.lengthOf(1);
      expect(result[0].submodule.name).to.eql('sharedId');
    });

    it('should properly map registry to submodule containers for retainConfig flag', () => {
      const previousSubmoduleContainers = [
        {submodule: {name: 'shouldBeKept'}, config: {name: 'shouldBeKept'}},
      ];
      const submoduleRegistry = [
        sharedIdSystemSubmodule,
        createMockIdSubmodule('shouldBeKept', { id: { uid2: { id: 'uid2_value' } } }, null, null),
      ];
      const configRegistry = [{ name: 'sharedId' }];
      const result = generateSubmoduleContainers({retainConfig: true}, configRegistry, previousSubmoduleContainers, submoduleRegistry);
      expect(result).to.have.lengthOf(2);
      expect(result[0].submodule.name).to.eql('sharedId');
      expect(result[1].submodule.name).to.eql('shouldBeKept');
    });

    it('should properly map registry to submodule containers for autoRefresh flag', () => {
      const previousSubmoduleContainers = [
        {submodule: {name: 'modified'}, config: {name: 'modified', auctionDelay: 300}},
        {submodule: {name: 'unchanged'}, config: {name: 'unchanged', auctionDelay: 300}},
      ];
      const submoduleRegistry = [
        createMockIdSubmodule('modified', { id: { uid2: { id: 'uid2_value' } } }, null, null),
        createMockIdSubmodule('new', { id: { uid2: { id: 'uid2_value' } } }, null, null),
        createMockIdSubmodule('unchanged', { id: { uid2: { id: 'uid2_value' } } }, null, null),
      ];
      const configRegistry = [
        {name: 'modified', auctionDelay: 200},
        {name: 'new'},
        {name: 'unchanged', auctionDelay: 300},
      ];
      const result = generateSubmoduleContainers({autoRefresh: true}, configRegistry, previousSubmoduleContainers, submoduleRegistry);
      expect(result).to.have.lengthOf(3);
      const itemsWithRefreshIds = result.filter(item => item.refreshIds);
      const submoduleNames = itemsWithRefreshIds.map(item => item.submodule.name);
      expect(submoduleNames).to.deep.eql(['modified', 'new']);
    });
  });
  describe('user id modules - enforceStorageType', () => {
    let warnLogSpy;
    const UID_MODULE_NAME = 'userIdModule';
    const cookieName = 'testCookie';
    const userSync = {
      userIds: [
        {
          name: UID_MODULE_NAME,
          storage: {
            type: STORAGE_TYPE_LOCALSTORAGE,
            name: 'storageName'
          }
        }
      ]
    };

    before(() => {
      setSubmoduleRegistry([
        createMockIdSubmodule(UID_MODULE_NAME, {id: {uid2: {id: 'uid2_value'}}}, null, []),
      ]);
    })

    beforeEach(() => {
      warnLogSpy = sinon.spy(utils, 'logWarn');
    });

    afterEach(() => {
      warnLogSpy.restore();
      getCoreStorageManager('test').setCookie(cookieName, '', EXPIRED_COOKIE_DATE)
    });

    it('should not warn when reading', () => {
      config.setConfig({userSync});
      const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: UID_MODULE_NAME});
      storage.cookiesAreEnabled();
      sinon.assert.notCalled(warnLogSpy);
    })

    it('should warn and allow userId module to store data for enforceStorageType unset', () => {
      config.setConfig({userSync});
      const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: UID_MODULE_NAME});
      storage.setCookie(cookieName, 'value', 20000);
      sinon.assert.calledWith(warnLogSpy, `${UID_MODULE_NAME} attempts to store data in ${STORAGE_TYPE_COOKIES} while configuration allows ${STORAGE_TYPE_LOCALSTORAGE}.`);
      expect(storage.getCookie(cookieName)).to.eql('value');
    });

    it('should not allow userId module to store data for enforceStorageType set to true', () => {
      config.setConfig({
        userSync: {
          enforceStorageType: true,
          ...userSync,
        }
      })
      const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: UID_MODULE_NAME});
      storage.setCookie(cookieName, 'value', 20000);
      expect(storage.getCookie(cookieName)).to.not.exist;
    });
  });
});
