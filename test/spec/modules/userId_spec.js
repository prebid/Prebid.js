import {
  attachIdSystem,
  auctionDelay,
  coreStorage,
  dep,
  findRootDomain,
  getConsentHash,
  init,
  PBJS_USER_ID_OPTOUT_NAME,
  requestBidsHook,
  requestDataDeletion,
  setStoredValue,
  setSubmoduleRegistry,
  syncDelay,
} from 'modules/userId/index.js';
import {UID1_EIDS} from 'libraries/uid1Eids/uid1Eids.js';
import {createEidsArray, EID_CONFIG} from 'modules/userId/eids.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import {getPrebidInternal} from 'src/utils.js';
import * as events from 'src/events.js';
import {EVENTS} from 'src/constants.js';
import {getGlobal} from 'src/prebidGlobal.js';
import {resetConsentData} from 'modules/consentManagement.js';
import {setEventFiredFlag as liveIntentIdSubmoduleDoNotFireEvent} from 'modules/liveIntentIdSystem.js';
import {sharedIdSystemSubmodule} from 'modules/sharedIdSystem.js';
import {pubProvidedIdSubmodule} from 'modules/pubProvidedIdSystem.js';
import * as mockGpt from '../integration/faker/googletag.js';
import 'src/prebid.js';
import {hook} from '../../../src/hook.js';
import {mockGdprConsent} from '../../helpers/consentData.js';
import {getPPID} from '../../../src/adserver.js';
import {uninstall as uninstallGdprEnforcement} from 'modules/gdprEnforcement.js';
import {allConsent, GDPR_GVLIDS, gdprDataHandler} from '../../../src/consentHandler.js';
import {MODULE_TYPE_UID} from '../../../src/activities/modules.js';
import {ACTIVITY_ENRICH_EIDS} from '../../../src/activities/activities.js';
import {ACTIVITY_PARAM_COMPONENT_NAME, ACTIVITY_PARAM_COMPONENT_TYPE} from '../../../src/activities/params.js';

let assert = require('chai').assert;
let expect = require('chai').expect;
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

    const result = requestBidsHook(...args, {delay: startDelay});
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
    return init(config, {delay: callbackDelay});
  }

  before(function () {
    hook.ready();
    uninstallGdprEnforcement();
    localStorage.removeItem(PBJS_USER_ID_OPTOUT_NAME);
    liveIntentIdSubmoduleDoNotFireEvent();
  });

  beforeEach(function () {
    // TODO: this whole suite needs to be redesigned; it is passing by accident
    // some tests do not pass if consent data is available
    // (there are functions here with signature `getId(config, storedId)`, but storedId is actually consentData)
    // also, this file is ginormous; do we really need to test *all* id systems as one?
    resetConsentData();
    sandbox = sinon.sandbox.create();
    consentData = null;
    mockGdprConsent(sandbox, () => consentData);
    coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);
  });

  afterEach(() => {
    sandbox.restore();
  });

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
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      coreStorage.setCookie.restore();
      utils.logWarn.restore();
    });

    after(function () {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', '', EXPIRED_COOKIE_DATE);
    });

    it('Check same cookie behavior', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;

      let pubcid = coreStorage.getCookie('pubcid');
      expect(pubcid).to.be.null; // there should be no cookie initially

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      return expectImmediateBidHook(config => {
        innerAdUnits1 = config.adUnits
      }, {adUnits: adUnits1}).then(() => {
        pubcid = coreStorage.getCookie('pubcid'); // cookies is created after requestbidHook

        innerAdUnits1.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal(pubcid);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: pubcid, atype: 1}]
            });
          });
        });

        return expectImmediateBidHook(config => {
          innerAdUnits2 = config.adUnits
        }, {adUnits: adUnits2}).then(() => {
          assert.deepEqual(innerAdUnits1, innerAdUnits2);
        });
      });
    });

    it('Check different cookies', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      return expectImmediateBidHook((config) => {
        innerAdUnits1 = config.adUnits
      }, {adUnits: adUnits1}).then(() => {
        pubcid1 = coreStorage.getCookie('pubcid'); // get first cookie
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE); // erase cookie

        innerAdUnits1.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal(pubcid1);
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: pubcid1, atype: 1}]
            });
          });
        });

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);

        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
        return expectImmediateBidHook((config) => {
          innerAdUnits2 = config.adUnits
        }, {adUnits: adUnits2}).then(() => {
          pubcid2 = coreStorage.getCookie('pubcid'); // get second cookie

          innerAdUnits2.forEach((unit) => {
            unit.bids.forEach((bid) => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal(pubcid2);
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: pubcid2, atype: 1}]
              });
            });
          });

          expect(pubcid1).to.not.equal(pubcid2);
        });
      });
    });

    it('Use existing cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']));
      return expectImmediateBidHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits}).then(() => {
        innerAdUnits.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('altpubcid200000');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: 'altpubcid200000', atype: 1}]
            });
          });
        });
      });
    });

    it('Extend cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {extend: true});

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(customConfig);
      return expectImmediateBidHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits}).then(() => {
        innerAdUnits.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('altpubcid200000');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'pubcid.org',
              uids: [{id: 'altpubcid200000', atype: 1}]
            });
          });
        });
      });
    });

    it('Disable auto create', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {create: false});

      init(config);
      setSubmoduleRegistry([sharedIdSystemSubmodule]);

      config.setConfig(customConfig);
      return expectImmediateBidHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits}).then(() => {
        innerAdUnits.forEach((unit) => {
          unit.bids.forEach((bid) => {
            expect(bid).to.not.have.deep.nested.property('userId.pubcid');
            expect(bid).to.not.have.deep.nested.property('userIdAsEids');
          });
        });
      });
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
        ]);
      });

      it('should group UIDs by source and ext', () => {
        const eids = createEidsArray({
          mockId1: ['mock-1-1', 'mock-1-2'],
          mockId2v1: ['mock-2-1', 'mock-2-2'],
          mockId2v2: ['mock-2-1', 'mock-2-2']
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
          }
        ])
      });

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
      let adUnits = [getAdUnitMock()];
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
      let adUnits = [getAdUnitMock()];
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
      let adUnits = [getAdUnitMock()];
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
      let adUnits = [getAdUnitMock()];

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
        let mockIdSystem = {
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

      it('should still resolve promises returned by getUserIdsAsync', () => {
        startInit();
        let result = null;
        getGlobal().getUserIdsAsync().then((val) => { result = val; });
        return clearStack().then(() => {
          expect(result).to.equal(null); // auction has not ended, callback should not have been called
          mockIdCallback.callsFake((cb) => cb(MOCK_ID));
          return getGlobal().refreshUserIds().then(clearStack);
        }).then(() => {
          expect(result).to.deep.equal(getGlobal().getUserIds()) // auction still not over, but refresh was explicitly forced
        });
      });

      it('should not stop auctions', (done) => {
        // simulate an infinite `auctionDelay`; refreshing should still allow the auction to continue
        // as soon as ID submodules have completed init
        startInit();
        requestBidsHook(() => {
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
        requestBidsHook(() => {
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
      let sandbox = sinon.createSandbox();
      let mockIdCallback = sandbox.stub().returns({id: {'MOCKID': '1111'}});
      let mockIdSystem = {
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

      let sandbox = sinon.createSandbox();
      let mockIdCallback = sandbox.stub().returns({id: {'MOCKID': '1111'}});
      let refreshUserIdsCallback = sandbox.stub();

      let mockIdSystem = {
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: mockIdCallback
      };

      let refreshedIdCallback = sandbox.stub().returns({id: {'REFRESH': '1111'}});

      let refreshedIdSystem = {
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
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
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
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
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

    it('config auctionDelay defaults to 0 if not a number', function () {
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
      expect(auctionDelay).to.equal(0);
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
        $$PREBID_GLOBAL$$.requestBids.removeAll();
        config.resetConfig();
        sandbox.restore();
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
              expect(bid).to.have.deep.nested.property('userId.mid');
              expect(bid.userId.mid).to.equal('1234');
              expect(bid.userIdAsEids.length).to.equal(0);// "mid" is an un-known submodule for USER_IDS_CONFIG in eids.js
            });
          });

          // no sync after auction ends
          events.on.called.should.equal(false);
        });
      });

      it('does not delay auction if not set, delays id fetch after auction ends with syncDelay', function () {
        config.setConfig({
          userSync: {
            syncDelay: 77,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        // check config has been set correctly
        expect(auctionDelay).to.equal(0);
        expect(syncDelay).to.equal(77);

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
            syncDelay: 0,
            userIds: [{
              name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
            }]
          }
        });

        expect(syncDelay).to.equal(0);

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

    describe('Request bids hook appends userId to bid objs in adapters', function () {
      let adUnits;

      beforeEach(function () {
        adUnits = [getAdUnitMock()];
      });

      it('test hook from pubcommonid cookie', function (done) {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid html5', function (done) {
        // simulate existing browser local storage values
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', new Date(Date.now() + 100000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });
          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');
          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid cookie&html5', function (done) {
        const expiration = new Date(Date.now() + 100000).toUTCString();
        coreStorage.setCookie('pubcid', 'testpubcid', expiration);
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', expiration);

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie&html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });

          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');

          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid cookie&html5, no cookie present', function (done) {
        localStorage.setItem('pubcid', 'testpubcid');
        localStorage.setItem('pubcid_exp', new Date(Date.now() + 100000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie&html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });

          localStorage.removeItem('pubcid');
          localStorage.removeItem('pubcid_exp');

          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid cookie&html5, no local storage entry', function (done) {
        coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie&html5']));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('testpubcid');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [{id: 'testpubcid', atype: 1}]
              });
            });
          });

          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);

          done();
        }, {adUnits});
      });

      it('test hook from pubcommonid config value object', function (done) {
        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(getConfigValueMock('pubCommonId', {'pubcidvalue': 'testpubcidvalue'}));

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcidvalue');
              expect(bid.userId.pubcidvalue).to.equal('testpubcidvalue');
              expect(bid.userIdAsEids.length).to.equal(0);// "pubcidvalue" is an un-known submodule for USER_IDS_CONFIG in eids.js
            });
          });
          done();
        }, {adUnits});
      });

      it('eidPermissions fun with bidders', function (done) {
        coreStorage.setCookie('pubcid', 'test222', (new Date(Date.now() + 5000).toUTCString()));

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        let eidPermissions;
        getPrebidInternal().setEidPermissions = function (newEidPermissions) {
          eidPermissions = newEidPermissions;
        }
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [
              {
                name: 'pubCommonId',
                bidders: [
                  'sampleBidder'
                ],
                storage: {
                  type: 'cookie',
                  name: 'pubcid',
                  expires: 28
                }
              }
            ]
          }
        });

        requestBidsHook(function () {
          expect(eidPermissions).to.deep.equal(
            [
              {
                bidders: [
                  'sampleBidder'
                ],
                source: 'pubcid.org'
              }
            ]
          );
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              if (bid.bidder === 'sampleBidder') {
                expect(bid).to.have.deep.nested.property('userId.pubcid');
                expect(bid.userId.pubcid).to.equal('test222');
                expect(bid.userIdAsEids[0]).to.deep.equal({
                  source: 'pubcid.org',
                  uids: [
                    {
                      id: 'test222',
                      atype: 1
                    }
                  ]
                });
              }
              if (bid.bidder === 'anotherSampleBidder') {
                expect(bid).to.not.have.deep.nested.property('userId.pubcid');
                expect(bid).to.not.have.property('userIdAsEids');
              }
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          getPrebidInternal().setEidPermissions = undefined;
          done();
        }, {adUnits});
      });

      it('eidPermissions fun without bidders', function (done) {
        coreStorage.setCookie('pubcid', 'test222', new Date(Date.now() + 5000).toUTCString());

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        let eidPermissions;
        getPrebidInternal().setEidPermissions = function (newEidPermissions) {
          eidPermissions = newEidPermissions;
        }
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [
              {
                name: 'pubCommonId',
                storage: {
                  type: 'cookie',
                  name: 'pubcid',
                  expires: 28
                }
              }
            ]
          }
        });

        requestBidsHook(function () {
          expect(eidPermissions).to.deep.equal(
            []
          );
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              expect(bid.userId.pubcid).to.equal('test222');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'pubcid.org',
                uids: [
                  {
                    id: 'test222',
                    atype: 1
                  }]
              });
            });
          });
          getPrebidInternal().setEidPermissions = undefined;
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

      it('test hook from pubProvidedId config params', function (done) {
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

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.pubProvidedId');
              expect(bid.userId.pubProvidedId).to.deep.equal([{
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
              }, {
                source: 'provider.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'sha256email'
                  }
                }]
              }]);

              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'example.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'ppuid'
                  }
                }]
              });
              expect(bid.userIdAsEids[2]).to.deep.equal({
                source: 'provider.com',
                uids: [{
                  id: 'value read from cookie or local storage',
                  ext: {
                    stype: 'sha256email'
                  }
                }]
              });
            });
          });
          done();
        }, {adUnits});
      });
      it('should add new id system ', function (done) {
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
          getId: function (config, storedId) {
            if (storedId) return {};
            return {id: {'MOCKID': '1234'}};
          }
        });

        requestBidsHook(function () {
          adUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              // check PubCommonId id data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.pubcid');
              // check MockId data was copied to bid
              expect(bid).to.have.deep.nested.property('userId.mid');
              expect(bid.userId.mid).to.equal('1234');
            });
          });
          coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
          coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
          done();
        }, {adUnits});
      });

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
            }
          }));
          mods.forEach(attachIdSystem);
        });
        afterEach(() => {
          isAllowed.restore();
        });

        it('should check for enrichEids activity permissions', (done) => {
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
          requestBidsHook((req) => {
            const activeIds = req.adUnits.flatMap(au => au.bids).flatMap(bid => Object.keys(bid.userId));
            expect(Array.from(new Set(activeIds))).to.have.members([MOCK_IDS[1]]);
            done();
          }, {adUnits})
        });
      })
    });

    describe('callbacks at the end of auction', function () {
      beforeEach(function () {
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
        let adUnits = [getAdUnitMock()];
        let innerAdUnits;
        let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
        customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

        init(config);
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        config.setConfig(customCfg);
        return runBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits}).then(() => {
          expect(utils.triggerPixel.called).to.be.false;
          return endAuction();
        }).then(() => {
          expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');
        });
      });
    });

    describe('Set cookie behavior', function () {
      let cookie, cookieStub;

      beforeEach(function () {
        setSubmoduleRegistry([sharedIdSystemSubmodule]);
        init(config);
        cookie = document.cookie;
        cookieStub = sinon.stub(document, 'cookie');
        cookieStub.get(() => cookie);
        cookieStub.set((val) => cookie = val);
      });

      afterEach(function () {
        cookieStub.restore();
      });

      it('should allow submodules to override the domain', function () {
        const submodule = {
          submodule: {
            domainOverride: function () {
              return 'foo.com'
            }
          },
          config: {
            name: 'mockId',
            storage: {
              type: 'cookie'
            }
          },
          storageMgr: {
            setCookie: sinon.stub()
          },
          enabledStorageTypes: [ 'cookie' ]
        }
        setStoredValue(submodule, 'bar');
        expect(submodule.storageMgr.setCookie.getCall(0).args[4]).to.equal('foo.com');
      });

      it('should pass no domain if submodule does not override the domain', function () {
        const submodule = {
          submodule: {},
          config: {
            name: 'mockId',
            storage: {
              type: 'cookie'
            }
          },
          storageMgr: {
            setCookie: sinon.stub()
          },
          enabledStorageTypes: [ 'cookie' ]
        }
        setStoredValue(submodule, 'bar');
        expect(submodule.storageMgr.setCookie.getCall(0).args[4]).to.equal(null);
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
    describe('Call registerSignalSources to register signal sources with gtag', function () {
      it('pbjs.registerSignalSources should be defined', () => {
        expect(typeof (getGlobal()).registerSignalSources).to.equal('function');
      });
    })

    describe('Call getEncryptedEidsForSource to get encrypted Eids for source', function() {
      const signalSources = ['pubcid.org'];

      it('pbjs.getEncryptedEidsForSource should be defined', () => {
        expect(typeof (getGlobal()).getEncryptedEidsForSource).to.equal('function');
      });

      it('pbjs.getEncryptedEidsForSource should return the string without encryption if encryption is false', (done) => {
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
        (getGlobal()).getEncryptedEidsForSource(signalSources[0], encrypt).then((data) => {
          let users = (getGlobal()).getUserIdsAsEids();
          expect(data).to.equal(users[0].uids[0].id);
          done();
        }).catch(done);
      });

      it('pbjs.getEncryptedEidsForSource should return prioritized id as non-encrypted string', (done) => {
        init(config);
        setSubmoduleRegistry([
          createMockIdSubmodule('mockId1Module', {id: {uid2: {id: 'uid2_value'}}}),
          createMockIdSubmodule('mockId2Module', {id: {pubcid: 'pubcid_value', lipb: {lipbid: 'lipbid_value_from_mockId2Module'}}}),
          createMockIdSubmodule('mockId3Module', {id: {uid2: {id: 'uid2_value_from_mockId3Module'}, pubcid: 'pubcid_value_from_mockId3Module', lipb: {lipbid: 'lipbid_value'}, merkleId: {id: 'merkleId_value_from_mockId3Module'}}}, null, {
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
            }
          }),
          createMockIdSubmodule('mockId4Module', {id: {merkleId: {id: 'merkleId_value'}}}, null, {
            merkleId: {
              source: 'merkleinc.com',
              getValue(data) {
                return data.id
              }
            }
          })
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
});
