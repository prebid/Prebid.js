import {
  attachIdSystem,
  auctionDelay,
  coreStorage,
  init,
  requestBidsHook,
  setStoredConsentData,
  setStoredValue,
  setSubmoduleRegistry,
  syncDelay,
  PBJS_USER_ID_OPTOUT_NAME,
  findRootDomain,
} from 'modules/userId/index.js';
import {createEidsArray} from 'modules/userId/eids.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import {getGlobal} from 'src/prebidGlobal.js';
import {
  requestBidsHook as consentManagementRequestBidsHook,
  resetConsentData,
  setConsentConfig
} from 'modules/consentManagement.js';
import {server} from 'test/mocks/xhr.js';
import find from 'core-js-pure/features/array/find.js';
import {unifiedIdSubmodule} from 'modules/unifiedIdSystem.js';
import {pubCommonIdSubmodule} from 'modules/pubCommonIdSystem.js';
import {britepoolIdSubmodule} from 'modules/britepoolIdSystem.js';
import {id5IdSubmodule} from 'modules/id5IdSystem.js';
import {identityLinkSubmodule} from 'modules/identityLinkIdSystem.js';
import {liveIntentIdSubmodule} from 'modules/liveIntentIdSystem.js';
import {merkleIdSubmodule} from 'modules/merkleIdSystem.js';
import {netIdSubmodule} from 'modules/netIdSystem.js';
import {intentIqIdSubmodule} from 'modules/intentIqIdSystem.js';
import {zeotapIdPlusSubmodule} from 'modules/zeotapIdPlusIdSystem.js';
import {sharedIdSubmodule} from 'modules/sharedIdSystem.js';
import {haloIdSubmodule} from 'modules/haloIdSystem.js';
import {pubProvidedIdSubmodule} from 'modules/pubProvidedIdSystem.js';
import {criteoIdSubmodule} from 'modules/criteoIdSystem.js';
import {tapadIdSubmodule} from 'modules/tapadIdSystem.js';
import {getPrebidInternal} from 'src/utils.js';

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

  function findEid(eids, source) {
    return find(eids, (eid) => {
      if (eid.source === source) { return true; }
    });
  }

  before(function () {
    localStorage.removeItem(PBJS_USER_ID_OPTOUT_NAME);
  });

  beforeEach(function () {
    coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);
  });

  describe('Decorate Ad Units', function () {
    beforeEach(function () {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 5000).toUTCString()));
      sinon.spy(coreStorage, 'setCookie');
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      coreStorage.setCookie.restore();
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

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      requestBidsHook(config => {
        innerAdUnits1 = config.adUnits
      }, {adUnits: adUnits1});
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

      requestBidsHook(config => {
        innerAdUnits2 = config.adUnits
      }, {adUnits: adUnits2});
      assert.deepEqual(innerAdUnits1, innerAdUnits2);
    });

    it('Check different cookies', function () {
      let adUnits1 = [getAdUnitMock()];
      let adUnits2 = [getAdUnitMock()];
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      requestBidsHook((config) => {
        innerAdUnits1 = config.adUnits
      }, {adUnits: adUnits1});
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

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      requestBidsHook((config) => {
        innerAdUnits2 = config.adUnits
      }, {adUnits: adUnits2});

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

    it('Use existing cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']));
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});
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
      // Because the cookie exists already, there should be no setCookie call by default; the only setCookie call is
      // to store consent data
      expect(coreStorage.setCookie.callCount).to.equal(1);
    });

    it('Extend cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {extend: true});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customConfig);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});
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
      // Because extend is true, the cookie will be updated even if it exists already. The second setCookie call
      // is for storing consentData
      expect(coreStorage.setCookie.callCount).to.equal(2);
    });

    it('Disable auto create', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {create: false});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customConfig);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.not.have.deep.nested.property('userId.pubcid');
          expect(bid).to.not.have.deep.nested.property('userIdAsEids');
        });
      });
      // setCookie is called once in order to store consentData
      expect(coreStorage.setCookie.callCount).to.equal(1);
    });

    it('pbjs.getUserIds', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }]
        }
      });
      expect(typeof (getGlobal()).getUserIds).to.equal('function');
      expect((getGlobal()).getUserIds()).to.deep.equal({pubcid: '11111'});
    });

    it('pbjs.getUserIdsAsEids', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }]
        }
      });
      expect(typeof (getGlobal()).getUserIdsAsEids).to.equal('function');
      expect((getGlobal()).getUserIdsAsEids()).to.deep.equal(createEidsArray((getGlobal()).getUserIds()));
    });

    it('pbjs.refreshUserIds refreshes', function() {
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

      setSubmoduleRegistry([mockIdSystem]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'mockId',
            value: {id: {mockId: '1111'}}
          }]
        }
      });
      expect(typeof (getGlobal()).refreshUserIds).to.equal('function');

      getGlobal().getUserIds(); // force initialization

      // update config so that getId will be called
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'mockId',
            storage: {name: 'mockid', type: 'cookie'},
          }]
        }
      });

      getGlobal().refreshUserIds();
      expect(mockIdCallback.callCount).to.equal(1);
    });

    it('pbjs.refreshUserIds refreshes single', function() {
      coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('REFRESH', '', EXPIRED_COOKIE_DATE);

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

      setSubmoduleRegistry([refreshedIdSystem, mockIdSystem]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
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

      getGlobal().getUserIds(); // force initialization

      getGlobal().refreshUserIds({submoduleNames: 'refreshedId'}, refreshUserIdsCallback);

      expect(refreshedIdCallback.callCount).to.equal(2);
      expect(mockIdCallback.callCount).to.equal(1);
      expect(refreshUserIdsCallback.callCount).to.equal(1);
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

    it('fails initialization if opt out cookie exists', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - opt-out cookie found, exit module');
    });

    it('initializes if no opt out cookie exists', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
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
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({userSync: {}});
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
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
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid', 'cookie']));

      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 1 submodules');
    });

    it('config with 14 configurations should result in 14 submodules add', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, liveIntentIdSubmodule, britepoolIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubProvidedId'
          }, {
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }, {
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }, {
            name: 'id5Id',
            storage: {name: 'id5id', type: 'cookie'}
          }, {
            name: 'identityLink',
            storage: {name: 'idl_env', type: 'cookie'}
          }, {
            name: 'liveIntentId',
            storage: {name: '_li_pbid', type: 'cookie'}
          }, {
            name: 'britepoolId',
            value: {'primaryBPID': '279c0161-5152-487f-809e-05d7f7e653fd'}
          }, {
            name: 'netId',
            storage: {name: 'netId', type: 'cookie'}
          }, {
            name: 'sharedId',
            storage: {name: 'sharedid', type: 'cookie'}
          }, {
            name: 'intentIqId',
            storage: {name: 'intentIqId', type: 'cookie'}
          }, {
            name: 'haloId',
            storage: {name: 'haloId', type: 'cookie'}
          }, {
            name: 'zeotapIdPlus'
          }, {
            name: 'criteo'
          }, {
            name: 'tapadId',
            storage: {name: 'tapad_id', type: 'cookie'}
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.contain('User ID - usersync config updated for 14 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 99,
          userIds: [{
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }]
        }
      });
      expect(syncDelay).to.equal(99);
    });

    it('config auctionDelay updates module correctly', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          auctionDelay: 100,
          userIds: [{
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }]
        }
      });
      expect(auctionDelay).to.equal(100);
    });

    it('config auctionDelay defaults to 0 if not a number', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule, pubProvidedIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          auctionDelay: '',
          userIds: [{
            name: 'unifiedId',
            storage: {name: 'unifiedid', type: 'cookie'}
          }]
        }
      });
      expect(auctionDelay).to.equal(0);
    });
  });

  describe('auction and user sync delays', function () {
    let sandbox;
    let adUnits;
    let mockIdCallback;
    let auctionSpy;

    beforeEach(function () {
      sandbox = sinon.createSandbox();
      sandbox.stub(global, 'setTimeout').returns(2);
      sandbox.stub(global, 'clearTimeout');
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

      init(config);

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

      requestBidsHook(auctionSpy, {adUnits});

      // check auction was delayed
      global.clearTimeout.calledOnce.should.equal(false);
      global.setTimeout.calledOnce.should.equal(true);
      global.setTimeout.calledWith(sinon.match.func, 33);
      auctionSpy.calledOnce.should.equal(false);

      // check ids were fetched
      mockIdCallback.calledOnce.should.equal(true);

      // callback to continue auction if timed out
      global.setTimeout.callArg(0);
      auctionSpy.calledOnce.should.equal(true);

      // does not call auction again once ids are synced
      mockIdCallback.callArgWith(0, {'MOCKID': '1234'});
      auctionSpy.calledOnce.should.equal(true);

      // no sync after auction ends
      events.on.called.should.equal(false);
    });

    it('delays auction if auctionDelay is set, continuing auction if ids are fetched before timing out', function (done) {
      config.setConfig({
        userSync: {
          auctionDelay: 33,
          syncDelay: 77,
          userIds: [{
            name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
          }]
        }
      });

      requestBidsHook(auctionSpy, {adUnits});

      // check auction was delayed
      // global.setTimeout.calledOnce.should.equal(true);
      global.clearTimeout.calledOnce.should.equal(false);
      global.setTimeout.calledWith(sinon.match.func, 33);
      auctionSpy.calledOnce.should.equal(false);

      // check ids were fetched
      mockIdCallback.calledOnce.should.equal(true);

      // if ids returned, should continue auction
      mockIdCallback.callArgWith(0, {'MOCKID': '1234'});
      auctionSpy.calledOnce.should.equal(true);

      // check ids were copied to bids
      adUnits.forEach(unit => {
        unit.bids.forEach(bid => {
          expect(bid).to.have.deep.nested.property('userId.mid');
          expect(bid.userId.mid).to.equal('1234');
          expect(bid.userIdAsEids.length).to.equal(0);// "mid" is an un-known submodule for USER_IDS_CONFIG in eids.js
        });
        done();
      });

      // no sync after auction ends
      events.on.called.should.equal(false);
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

      requestBidsHook(auctionSpy, {adUnits});

      // should not delay auction
      global.setTimeout.calledOnce.should.equal(false);
      auctionSpy.calledOnce.should.equal(true);

      // check user sync is delayed after auction is ended
      mockIdCallback.calledOnce.should.equal(false);
      events.on.calledOnce.should.equal(true);
      events.on.calledWith(CONSTANTS.EVENTS.AUCTION_END, sinon.match.func);

      // once auction is ended, sync user ids after delay
      events.on.callArg(1);
      global.setTimeout.calledOnce.should.equal(true);
      global.setTimeout.calledWith(sinon.match.func, 77);
      mockIdCallback.calledOnce.should.equal(false);

      // once sync delay is over, ids should be fetched
      global.setTimeout.callArg(0);
      mockIdCallback.calledOnce.should.equal(true);
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

      requestBidsHook(auctionSpy, {adUnits});

      // auction should not be delayed
      global.setTimeout.calledOnce.should.equal(false);
      auctionSpy.calledOnce.should.equal(true);

      // sync delay after auction is ended
      mockIdCallback.calledOnce.should.equal(false);
      events.on.calledOnce.should.equal(true);
      events.on.calledWith(CONSTANTS.EVENTS.AUCTION_END, sinon.match.func);

      // once auction is ended, if no sync delay, fetch ids
      events.on.callArg(1);
      global.setTimeout.calledOnce.should.equal(false);
      mockIdCallback.calledOnce.should.equal(true);
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

      requestBidsHook(auctionSpy, {adUnits});

      global.setTimeout.calledOnce.should.equal(false);
      auctionSpy.calledOnce.should.equal(true);
      mockIdCallback.calledOnce.should.equal(false);

      // no sync after auction ends
      events.on.called.should.equal(false);
    });
  });

  describe('Request bids hook appends userId to bid objs in adapters', function () {
    let adUnits;

    beforeEach(function () {
      adUnits = [getAdUnitMock()];
    });

    it('test hook from pubcommonid cookie', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
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

            // verify no sharedid was added
            expect(bid.userId).to.not.have.property('sharedid');
            expect(findEid(bid.userIdAsEids, 'sharedid.org')).to.be.undefined;
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

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
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

            // verify no sharedid was added
            expect(bid.userId).to.not.have.property('sharedid');
            expect(findEid(bid.userIdAsEids, 'sharedid.org')).to.be.undefined;
          });
        });
        localStorage.removeItem('pubcid');
        localStorage.removeItem('pubcid_exp');
        done();
      }, {adUnits});
    });

    it('test hook from pubcommonid config value object', function (done) {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
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

    it('test hook from UnifiedId html5', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('unifiedid_alt', JSON.stringify({'TDID': 'testunifiedid_alt'}));
      localStorage.setItem('unifiedid_alt_exp', '');

      setSubmoduleRegistry([unifiedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid_alt', 'html5']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid_alt');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'adserver.org',
              uids: [{id: 'testunifiedid_alt', atype: 1, ext: {rtiPartner: 'TDID'}}]
            });
          });
        });
        localStorage.removeItem('unifiedid_alt');
        localStorage.removeItem('unifiedid_alt_exp');
        done();
      }, {adUnits});
    });

    it('test hook from identityLink html5', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('idl_env', 'AiGNC8Z5ONyZKSpIPf');
      localStorage.setItem('idl_env_exp', '');

      setSubmoduleRegistry([identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['identityLink', 'idl_env', 'html5']));
      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'liveramp.com',
              uids: [{id: 'AiGNC8Z5ONyZKSpIPf', atype: 1}]
            });
          });
        });
        localStorage.removeItem('idl_env');
        localStorage.removeItem('idl_env_exp');
        done();
      }, {adUnits});
    });

    it('test hook from identityLink cookie', function (done) {
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['identityLink', 'idl_env', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'liveramp.com',
              uids: [{id: 'AiGNC8Z5ONyZKSpIPf', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from criteoIdModule cookie', function (done) {
      coreStorage.setCookie('storage_bidid', JSON.stringify({'criteoId': 'test_bidid'}), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([criteoIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['criteo', 'storage_bidid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.criteoId');
            expect(bid.userId.criteoId).to.equal('test_bidid');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'criteo.com',
              uids: [{id: 'test_bidid', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('storage_bidid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from tapadIdModule cookie', function (done) {
      coreStorage.setCookie('tapad_id', 'test-tapad-id', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([tapadIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['tapadId', 'tapad_id', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.tapadId');
            expect(bid.userId.tapadId).to.equal('test-tapad-id');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'tapad.com',
              uids: [{id: 'test-tapad-id', atype: 1}]
            });
          });
        })
        coreStorage.setCookie('tapad_id', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from liveIntentId html5', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('_li_pbid', JSON.stringify({'unifiedId': 'random-ls-identifier'}));
      localStorage.setItem('_li_pbid_exp', '');

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'html5']));
      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.lipb');
            expect(bid.userId.lipb.lipbid).to.equal('random-ls-identifier');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'liveintent.com',
              uids: [{id: 'random-ls-identifier', atype: 1}]
            });
          });
        });
        localStorage.removeItem('_li_pbid');
        localStorage.removeItem('_li_pbid_exp');
        done();
      }, {adUnits});
    });

    it('test hook from liveIntentId cookie', function (done) {
      coreStorage.setCookie('_li_pbid', JSON.stringify({'unifiedId': 'random-cookie-identifier'}), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.lipb');
            expect(bid.userId.lipb.lipbid).to.equal('random-cookie-identifier');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'liveintent.com',
              uids: [{id: 'random-cookie-identifier', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('_li_pbid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from sharedId html5', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('sharedid', JSON.stringify({'id': 'test_sharedId', 'ts': 1590525289611}));
      localStorage.setItem('sharedid_exp', '');

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'html5']));
      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.have.deep.nested.property('id');
            expect(bid.userId.sharedid).to.have.deep.nested.property('third');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId',
              third: 'test_sharedId'
            });
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'sharedid.org',
              uids: [{
                id: 'test_sharedId',
                atype: 1,
                ext: {
                  third: 'test_sharedId'
                }
              }]
            });
          });
        });
        localStorage.removeItem('sharedid');
        localStorage.removeItem('sharedid_exp');
        done();
      }, {adUnits});
    });

    it('test hook from sharedId html5 (id not synced)', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('sharedid', JSON.stringify({'id': 'test_sharedId', 'ns': true, 'ts': 1590525289611}));
      localStorage.setItem('sharedid_exp', '');

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'html5']));
      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.have.deep.nested.property('id');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId'
            });
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'sharedid.org',
              uids: [{
                id: 'test_sharedId',
                atype: 1
              }]
            });
          });
        });
        localStorage.removeItem('sharedid');
        localStorage.removeItem('sharedid_exp');
        done();
      }, {adUnits});
    });
    it('test hook from sharedId cookie', function (done) {
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test_sharedId',
        'ts': 1590525289611
      }), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.have.deep.nested.property('id');
            expect(bid.userId.sharedid).to.have.deep.nested.property('third');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId',
              third: 'test_sharedId'
            });
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'sharedid.org',
              uids: [{
                id: 'test_sharedId',
                atype: 1,
                ext: {
                  third: 'test_sharedId'
                }
              }]
            });
          });
        });
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });
    it('test hook from sharedId cookie (id not synced) ', function (done) {
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test_sharedId',
        'ns': true,
        'ts': 1590525289611
      }), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.have.deep.nested.property('id');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId'
            });
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'sharedid.org',
              uids: [{
                id: 'test_sharedId',
                atype: 1
              }]
            });
          });
        });
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('eidPermissions fun with bidders', function (done) {
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test222',
        'ts': 1590525289611
      }), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([sharedIdSubmodule]);
      let eidPermissions;
      getPrebidInternal().setEidPermissions = function (newEidPermissions) {
        eidPermissions = newEidPermissions;
      }
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [
            {
              name: 'sharedId',
              bidders: [
                'sampleBidder'
              ],
              storage: {
                type: 'cookie',
                name: 'sharedid',
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
              source: 'sharedid.org'
            }
          ]
        );
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            if (bid.bidder === 'sampleBidder') {
              expect(bid).to.have.deep.nested.property('userId.sharedid');
              expect(bid.userId.sharedid.id).to.equal('test222');
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'sharedid.org',
                uids: [
                  {
                    id: 'test222',
                    atype: 1,
                    ext: {
                      third: 'test222'
                    }
                  }
                ]
              });
            }
            if (bid.bidder === 'anotherSampleBidder') {
              expect(bid).to.not.have.deep.nested.property('userId.sharedid');
              expect(bid).to.not.have.property('userIdAsEids');
            }
          });
        });
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        getPrebidInternal().setEidPermissions = undefined;
        done();
      }, {adUnits});
    });

    it('eidPermissions fun without bidders', function (done) {
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test222',
        'ts': 1590525289611
      }), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([sharedIdSubmodule]);
      let eidPermissions;
      getPrebidInternal().setEidPermissions = function (newEidPermissions) {
        eidPermissions = newEidPermissions;
      }
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [
            {
              name: 'sharedId',
              storage: {
                type: 'cookie',
                name: 'sharedid',
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
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid.id).to.equal('test222');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'sharedid.org',
              uids: [
                {
                  id: 'test222',
                  atype: 1,
                  ext: {
                    third: 'test222'
                  }
                }]
            });
          });
        });
        getPrebidInternal().setEidPermissions = undefined;
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from pubProvidedId config params', function (done) {
      setSubmoduleRegistry([pubProvidedIdSubmodule]);
      init(config);
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

    it('test hook from liveIntentId html5', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('_li_pbid', JSON.stringify({'unifiedId': 'random-ls-identifier', 'segments': ['123']}));
      localStorage.setItem('_li_pbid_exp', '');

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'html5']));
      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.lipb');
            expect(bid.userId.lipb.lipbid).to.equal('random-ls-identifier');
            expect(bid.userId.lipb.segments).to.include('123');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'liveintent.com',
              uids: [{id: 'random-ls-identifier', atype: 1}],
              ext: {segments: ['123']}
            });
          });
        });
        localStorage.removeItem('_li_pbid');
        localStorage.removeItem('_li_pbid_exp');
        done();
      }, {adUnits});
    });

    it('test hook from liveIntentId cookie', function (done) {
      coreStorage.setCookie('_li_pbid', JSON.stringify({
        'unifiedId': 'random-cookie-identifier',
        'segments': ['123']
      }), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.lipb');
            expect(bid.userId.lipb.lipbid).to.equal('random-cookie-identifier');
            expect(bid.userId.lipb.segments).to.include('123');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'liveintent.com',
              uids: [{id: 'random-cookie-identifier', atype: 1}],
              ext: {segments: ['123']}
            });
          });
        });
        coreStorage.setCookie('_li_pbid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from britepoolid cookies', function (done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': '279c0161-5152-487f-809e-05d7f7e653fd'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([britepoolIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['britepoolId', 'britepoolid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.britepoolid');
            expect(bid.userId.britepoolid).to.equal('279c0161-5152-487f-809e-05d7f7e653fd');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'britepool.com',
              uids: [{id: '279c0161-5152-487f-809e-05d7f7e653fd', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from netId cookies', function (done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([netIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['netId', 'netId', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.netId');
            expect(bid.userId.netId).to.equal('fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'netid.de',
              uids: [{id: 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from intentIqId cookies', function (done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('intentIqId', 'abcdefghijk', (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([intentIqIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['intentIqId', 'intentIqId', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.intentIqId');
            expect(bid.userId.intentIqId).to.equal('abcdefghijk');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'intentiq.com',
              uids: [{id: 'abcdefghijk', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from haloId html5', function (done) {
      // simulate existing browser local storage values
      localStorage.setItem('haloId', JSON.stringify({'haloId': 'random-ls-identifier'}));
      localStorage.setItem('haloId_exp', '');

      setSubmoduleRegistry([haloIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['haloId', 'haloId', 'html5']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.haloId');
            expect(bid.userId.haloId).to.equal('random-ls-identifier');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'audigent.com',
              uids: [{id: 'random-ls-identifier', atype: 1}]
            });
          });
        });
        localStorage.removeItem('haloId');
        localStorage.removeItem('haloId_exp', '');
        done();
      }, {adUnits});
    });

    it('test hook from merkleId cookies', function (done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('merkleId', JSON.stringify({'ppid': {'id': 'testmerkleId'}}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([merkleIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['merkleId', 'merkleId', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.merkleId');
            expect(bid.userId.merkleId).to.equal('testmerkleId');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'merkleinc.com',
              uids: [{id: 'testmerkleId', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('merkleId', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from zeotapIdPlus cookies', function (done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('IDP', btoa(JSON.stringify('abcdefghijk')), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['zeotapIdPlus', 'IDP', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.IDP');
            expect(bid.userId.IDP).to.equal('abcdefghijk');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'zeotap.com',
              uids: [{id: 'abcdefghijk', atype: 1}]
            });
          });
        });
        coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook when pubCommonId, unifiedId, id5Id, identityLink, britepoolId, intentIqId, zeotapIdPlus, sharedId, netId, haloId and Criteo have data to pass', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'testunifiedid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test_sharedId',
        'ts': 1590525289611
      }), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('haloId', JSON.stringify({'haloId': 'testHaloId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('storage_criteo', JSON.stringify({'criteoId': 'test_bidid'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule, criteoIdSubmodule, tapadIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie'],
        ['britepoolId', 'britepoolid', 'cookie'],
        ['netId', 'netId', 'cookie'],
        ['sharedId', 'sharedid', 'cookie'],
        ['intentIqId', 'intentIqId', 'cookie'],
        ['zeotapIdPlus', 'IDP', 'cookie'],
        ['haloId', 'haloId', 'cookie'],
        ['criteo', 'storage_criteo', 'cookie'],
        ['tapadId', 'tapad_id', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id.uid');
            expect(bid.userId.id5id.uid).to.equal('testid5id');
            // check that identityLink id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
            // also check that britepoolId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.britepoolid');
            expect(bid.userId.britepoolid).to.equal('testbritepoolid');
            // also check that netId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.netId');
            expect(bid.userId.netId).to.equal('testnetId');
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId',
              third: 'test_sharedId'
            });
            // also check that intentIqId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.intentIqId');
            expect(bid.userId.intentIqId).to.equal('testintentIqId');
            // also check that zeotapIdPlus id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.IDP');
            expect(bid.userId.IDP).to.equal('zeotapId');
            // also check that haloId id was copied to bid
            expect(bid).to.have.deep.nested.property('userId.haloId');
            expect(bid.userId.haloId).to.equal('testHaloId');
            // also check that criteo id was copied to bid
            expect(bid).to.have.deep.nested.property('userId.criteoId');
            expect(bid.userId.criteoId).to.equal('test_bidid');

            expect(bid.userIdAsEids.length).to.equal(11);
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('haloId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('storage_criteo', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook when pubCommonId, unifiedId, id5Id, britepoolId, intentIqId, zeotapIdPlus, sharedId, criteo, netId and haloId have their modules added before and after init', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test_sharedId',
        'ts': 1590525289611
      }), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('haloId', JSON.stringify({'haloId': 'testHaloId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('storage_criteo', JSON.stringify({'criteoId': 'test_bidid'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([]);

      // attaching before init
      attachIdSystem(pubCommonIdSubmodule);

      init(config);

      // attaching after init
      attachIdSystem(unifiedIdSubmodule);
      attachIdSystem(id5IdSubmodule);
      attachIdSystem(identityLinkSubmodule);
      attachIdSystem(britepoolIdSubmodule);
      attachIdSystem(netIdSubmodule);
      attachIdSystem(sharedIdSubmodule);
      attachIdSystem(intentIqIdSubmodule);
      attachIdSystem(zeotapIdPlusSubmodule);
      attachIdSystem(haloIdSubmodule);
      attachIdSystem(criteoIdSubmodule);
      attachIdSystem(tapadIdSubmodule);

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie'],
        ['britepoolId', 'britepoolid', 'cookie'],
        ['netId', 'netId', 'cookie'],
        ['sharedId', 'sharedid', 'cookie'],
        ['intentIqId', 'intentIqId', 'cookie'],
        ['zeotapIdPlus', 'IDP', 'cookie'],
        ['haloId', 'haloId', 'cookie'],
        ['criteo', 'storage_criteo', 'cookie'],
        ['tapadId', 'tapad_id', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id.uid');
            expect(bid.userId.id5id.uid).to.equal('testid5id');
            // also check that identityLink id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
            // also check that britepoolId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.britepoolid');
            expect(bid.userId.britepoolid).to.equal('testbritepoolid');
            // also check that britepoolId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.netId');
            expect(bid.userId.netId).to.equal('testnetId');
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId',
              third: 'test_sharedId'
            });
            // also check that intentIqId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.intentIqId');
            expect(bid.userId.intentIqId).to.equal('testintentIqId');

            // also check that zeotapIdPlus id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.IDP');
            expect(bid.userId.IDP).to.equal('zeotapId');
            // also check that haloId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.haloId');
            expect(bid.userId.haloId).to.equal('testHaloId');

            // also check that criteo id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.criteoId');
            expect(bid.userId.criteoId).to.equal('test_bidid');

            expect(bid.userIdAsEids.length).to.equal(11);
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('haloId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('storage_criteo', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook when sharedId(opted out) have their modules added before and after init', function (done) {
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': '00000000000000000000000000',
        'ts': 1590525289611
      }), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([]);
      init(config);

      attachIdSystem(sharedIdSubmodule);

      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid.userIdAsEids).to.be.undefined;
          });
        });
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test sharedid enabled via pubcid cookie', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('pubcid_sharedid', 'testsharedid', (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);

      const customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      addConfig(customCfg, 'params', {enableSharedId: true});
      config.setConfig(customCfg);

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            expect(findEid(bid.userIdAsEids, 'pubcid.org')).to.deep.equal(
              {'source': 'pubcid.org', 'uids': [{'id': 'testpubcid', 'atype': 1}]}
            );
            // verify that the sharedid was also copied to bid
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.deep.equal({id: 'testsharedid'});
            expect(findEid(bid.userIdAsEids, 'sharedid.org')).to.deep.equal(
              {'source': 'sharedid.org', 'uids': [{'id': 'testsharedid', 'atype': 1}]}
            );
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('pubcid_sharedid', '', EXPIRED_COOKIE_DATE);

        done();
      }, {adUnits});
    });

    it('test sharedid disabled via pubcid cookie', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('pubcid_sharedid', 'testsharedid', (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);

      // pubCommonId's support for sharedId is off by default
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            expect(findEid(bid.userIdAsEids, 'pubcid.org')).to.deep.equal(
              {'source': 'pubcid.org', 'uids': [{'id': 'testpubcid', 'atype': 1}]}
            );
            // verify that the sharedid was not added to bid
            expect(bid.userId).to.not.have.property('sharedid');
            expect(findEid(bid.userIdAsEids, 'sharedid.org')).to.be.undefined;
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('pubcid_sharedid', '', EXPIRED_COOKIE_DATE);

        done();
      }, {adUnits});
    });

    it('test sharedid enabled via pubcid html5', function (done) {
      coreStorage.setDataInLocalStorage('pubcid', 'testpubcid');
      coreStorage.setDataInLocalStorage('pubcid_exp', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setDataInLocalStorage('pubcid_sharedid', 'testsharedid');
      coreStorage.setDataInLocalStorage('pubcid_sharedid_exp', new Date(Date.now() + 5000).toUTCString());

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);

      const customCfg = getConfigMock(['pubCommonId', 'pubcid', 'html5']);
      addConfig(customCfg, 'params', {enableSharedId: true});
      config.setConfig(customCfg);

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            expect(findEid(bid.userIdAsEids, 'pubcid.org')).to.deep.equal(
              {'source': 'pubcid.org', 'uids': [{'id': 'testpubcid', 'atype': 1}]}
            );
            // verify that the sharedid was also copied to bid
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.deep.equal({id: 'testsharedid'});
            expect(findEid(bid.userIdAsEids, 'sharedid.org')).to.deep.equal(
              {'source': 'sharedid.org', 'uids': [{'id': 'testsharedid', 'atype': 1}]}
            );
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('pubcid_sharedid', '', EXPIRED_COOKIE_DATE);

        coreStorage.removeDataFromLocalStorage('pubcid');
        coreStorage.removeDataFromLocalStorage('pubcid_exp');
        coreStorage.removeDataFromLocalStorage('pubcid_sharedid');
        coreStorage.removeDataFromLocalStorage('pubcid_sharedid_exp');
        done();
      }, {adUnits});
    });

    it('test expired sharedid via pubcid html5', function (done) {
      coreStorage.setDataInLocalStorage('pubcid', 'testpubcid');
      coreStorage.setDataInLocalStorage('pubcid_exp', new Date(Date.now() + 5000).toUTCString());

      // set sharedid to expired already
      coreStorage.setDataInLocalStorage('pubcid_sharedid', 'testsharedid');
      coreStorage.setDataInLocalStorage('pubcid_sharedid_exp', new Date(Date.now() - 100).toUTCString());

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);

      const customCfg = getConfigMock(['pubCommonId', 'pubcid', 'html5']);
      addConfig(customCfg, 'params', {enableSharedId: true});
      config.setConfig(customCfg);

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            expect(findEid(bid.userIdAsEids, 'pubcid.org')).to.deep.equal(
              {'source': 'pubcid.org', 'uids': [{'id': 'testpubcid', 'atype': 1}]}
            );
            // verify that the sharedid was not added
            expect(bid.userId).to.not.have.property('sharedid');
            expect(findEid(bid.userIdAsEids, 'sharedid.org')).to.be.undefined;
          });
        });

        coreStorage.removeDataFromLocalStorage('pubcid');
        coreStorage.removeDataFromLocalStorage('pubcid_exp');
        coreStorage.removeDataFromLocalStorage('pubcid_sharedid');
        coreStorage.removeDataFromLocalStorage('pubcid_sharedid_exp');
        done();
      }, {adUnits});
    });

    it('test pubcid coexisting with sharedid', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('pubcid_sharedid', 'test111', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test222',
        'ts': 1590525289611
      }), (new Date(Date.now() + 5000).toUTCString()));

      // When both pubcommon and sharedid are configured, pubcommon are invoked first due to
      // module loading order.  This mean the output from the primary sharedid module will overwrite
      // the one in pubcommon.

      setSubmoduleRegistry([pubCommonIdSubmodule, sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['sharedId', 'sharedid', 'cookie'],
      ));

      requestBidsHook(function () {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            expect(findEid(bid.userIdAsEids, 'pubcid.org')).to.deep.equal(
              {'source': 'pubcid.org', 'uids': [{'id': 'testpubcid', 'atype': 1}]}
            );
            // verify that the sharedid was also copied to bid
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid.id).to.equal('test222');
            expect(findEid(bid.userIdAsEids, 'sharedid.org').uids[0].id).to.equal('test222');
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('pubcid_sharedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);

        done();
      }, {adUnits});
    });

    it('should add new id system ', function (done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('sharedid', JSON.stringify({
        'id': 'test_sharedId',
        'ts': 1590525289611
      }), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('haloId', JSON.stringify({'haloId': 'testHaloId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('MOCKID', JSON.stringify({'MOCKID': '123456778'}), new Date(Date.now() + 5000).toUTCString());

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule]);
      init(config);

      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', storage: {name: 'pubcid', type: 'cookie'}
          }, {
            name: 'unifiedId', storage: {name: 'unifiedid', type: 'cookie'}
          }, {
            name: 'id5Id', storage: {name: 'id5id', type: 'cookie'}
          }, {
            name: 'identityLink', storage: {name: 'idl_env', type: 'cookie'}
          }, {
            name: 'britepoolId', storage: {name: 'britepoolid', type: 'cookie'}
          }, {
            name: 'netId', storage: {name: 'netId', type: 'cookie'}
          }, {
            name: 'sharedId', storage: {name: 'sharedid', type: 'cookie'}
          }, {
            name: 'intentIqId', storage: {name: 'intentIqId', type: 'cookie'}
          }, {
            name: 'zeotapIdPlus'
          }, {
            name: 'haloId', storage: {name: 'haloId', type: 'cookie'}
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
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // check UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id.uid');
            expect(bid.userId.id5id.uid).to.equal('testid5id');
            // also check that identityLink id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.idl_env');
            expect(bid.userId.idl_env).to.equal('AiGNC8Z5ONyZKSpIPf');
            // also check that britepoolId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.britepoolid');
            expect(bid.userId.britepoolid).to.equal('testbritepoolid');
            // check MockId data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.netId');
            expect(bid.userId.netId).to.equal('testnetId');
            // also check that sharedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.sharedid');
            expect(bid.userId.sharedid).to.deep.equal({
              id: 'test_sharedId',
              third: 'test_sharedId'
            });
            // check MockId data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.mid');
            expect(bid.userId.mid).to.equal('123456778');
            // also check that intentIqId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.intentIqId');
            expect(bid.userId.intentIqId).to.equal('testintentIqId');
            // also check that zeotapIdPlus id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.IDP');
            expect(bid.userId.IDP).to.equal('zeotapId');
            // also check that haloId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.haloId');
            expect(bid.userId.haloId).to.equal('testHaloId');
            expect(bid.userIdAsEids.length).to.equal(10);
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('intentIqId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('IDP', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('haloId', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });
  });

  describe('callbacks at the end of auction', function () {
    beforeEach(function () {
      sinon.stub(events, 'getEvents').returns([]);
      sinon.stub(utils, 'triggerPixel');
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_sharedid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('_parrable_eid', '', EXPIRED_COOKIE_DATE);
    });

    afterEach(function () {
      events.getEvents.restore();
      utils.triggerPixel.restore();
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_sharedid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('_parrable_eid', '', EXPIRED_COOKIE_DATE);
      resetConsentData();
      delete window.__tcfapi;
    });

    it('pubcid callback with url', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});

      expect(utils.triggerPixel.called).to.be.false;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');
    });

    it('unifiedid callback with url', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['unifiedId', 'unifiedid', 'cookie']);
      addConfig(customCfg, 'params', {url: '/any/unifiedid/url'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});

      expect(server.requests).to.be.empty;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(server.requests[0].url).to.equal('/any/unifiedid/url');
    });

    it('unifiedid callback with partner', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['unifiedId', 'unifiedid', 'cookie']);
      addConfig(customCfg, 'params', {partner: 'rubicon'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});

      expect(server.requests).to.be.empty;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(server.requests[0].url).to.equal('https://match.adsrvr.org/track/rid?ttd_pid=rubicon&fmt=json');
    });

    it('verify sharedid callback via pubcid when enabled', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url', enableSharedId: true});

      server.respondWith('https://id.sharedid.org/id', function(xhr) {
        xhr.respond(200, {}, '{"sharedId":"testsharedid"}');
      });
      server.respondImmediately = true;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});

      expect(utils.triggerPixel.called).to.be.false;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');

      expect(server.requests[0].url).to.equal('https://id.sharedid.org/id');
      expect(coreStorage.getCookie('pubcid_sharedid')).to.equal('testsharedid');
    });

    it('verify no sharedid callback via pubcid when disabled', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

      server.respondWith('https://id.sharedid.org/id', function(xhr) {
        xhr.respond(200, {}, '{"sharedId":"testsharedid"}');
      });
      server.respondImmediately = true;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});

      expect(utils.triggerPixel.called).to.be.false;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');

      expect(server.requests).to.have.lengthOf(0);
      expect(coreStorage.getCookie('pubcid_sharedid')).to.be.null;
    });

    it('verify sharedid optout via pubcid when enabled', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url', enableSharedId: true});
      coreStorage.setCookie('pubcid_sharedid', 'testsharedid', (new Date(Date.now() + 5000).toUTCString()));

      server.respondWith('https://id.sharedid.org/id', function(xhr) {
        xhr.respond(200, {}, '{"sharedId":"00000000000000000000000000"}');
      });
      server.respondImmediately = true;

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => {
        innerAdUnits = config.adUnits
      }, {adUnits});

      expect(utils.triggerPixel.called).to.be.false;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');

      expect(server.requests[0].url).to.equal('https://id.sharedid.org/id');
      expect(coreStorage.getCookie('pubcid_sharedid')).to.be.null;
    });

    it('verify sharedid called with consent data when gdpr applies', function () {
      let adUnits = [getAdUnitMock()];
      let customCfg = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      let consentConfig = {
        cmpApi: 'iab',
        timeout: 7500,
        allowAuctionWithoutConsent: false
      };
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url', enableSharedId: true});

      server.respondWith('https://id.sharedid.org/id?gdpr=1&gdpr_consent=abc12345234', function(xhr) {
        xhr.respond(200, {}, '{"sharedId":"testsharedid"}');
      });
      server.respondImmediately = true;

      let testConsentData = {
        tcString: 'abc12345234',
        gdprApplies: true,
        purposeOneTreatment: false,
        eventStatus: 'tcloaded',
        vendor: {consents: {887: true}},
        purpose: {
          consents: {
            1: true
          }
        }
      };

      window.__tcfapi = function () { };
      sinon.stub(window, '__tcfapi').callsFake((...args) => {
        args[2](testConsentData, true);
      });

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      setConsentConfig(consentConfig);

      consentManagementRequestBidsHook(() => {
      }, {});
      requestBidsHook((config) => {
      }, {adUnits});

      expect(utils.triggerPixel.called).to.be.false;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(utils.triggerPixel.getCall(0).args[0]).to.include('/any/pubcid/url');

      expect(server.requests[0].url).to.equal('https://id.sharedid.org/id?gdpr=1&gdpr_consent=abc12345234');
      expect(coreStorage.getCookie('pubcid_sharedid')).to.equal('testsharedid');
    });
  });

  describe('Set cookie behavior', function () {
    let coreStorageSpy;
    beforeEach(function () {
      coreStorageSpy = sinon.spy(coreStorage, 'setCookie');
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
    });
    afterEach(function () {
      coreStorageSpy.restore();
    });
    it('should allow submodules to override the domain', function () {
      const submodule = {
        submodule: {
          domainOverride: function () {
            return 'foo.com'
          }
        },
        config: {
          storage: {
            type: 'cookie'
          }
        }
      }
      setStoredValue(submodule, 'bar');
      expect(coreStorage.setCookie.getCall(0).args[4]).to.equal('foo.com');
    });

    it('should pass null for domain if submodule does not override the domain', function () {
      const submodule = {
        submodule: {},
        config: {
          storage: {
            type: 'cookie'
          }
        }
      }
      setStoredValue(submodule, 'bar');
      expect(coreStorage.setCookie.getCall(0).args[4]).to.equal(null);
    });
  });

  describe('Consent changes determine getId refreshes', function () {
    let expStr;
    let adUnits;

    const mockIdCookieName = 'MOCKID';
    let mockGetId = sinon.stub();
    let mockDecode = sinon.stub();
    let mockExtendId = sinon.stub();
    const mockIdSystem = {
      name: 'mockId',
      getId: mockGetId,
      decode: mockDecode,
      extendId: mockExtendId
    };
    const userIdConfig = {
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

    let cmpStub;
    let testConsentData;
    const consentConfig = {
      cmpApi: 'iab',
      timeout: 7500,
      allowAuctionWithoutConsent: false
    };

    const sharedBeforeFunction = function () {
      // clear cookies
      expStr = (new Date(Date.now() + 25000).toUTCString());
      coreStorage.setCookie(mockIdCookieName, '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie(`${mockIdCookieName}_last`, '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);

      // init
      adUnits = [getAdUnitMock()];
      init(config);

      // init id system
      attachIdSystem(mockIdSystem);
      config.setConfig(userIdConfig);
    }
    const sharedAfterFunction = function () {
      config.resetConfig();
      mockGetId.reset();
      mockDecode.reset();
      mockExtendId.reset();
      cmpStub.restore();
      resetConsentData();
      delete window.__cmp;
      delete window.__tcfapi;
    };

    describe('TCF v1', function () {
      testConsentData = {
        gdprApplies: true,
        consentData: 'xyz',
        apiVersion: 1
      };

      beforeEach(function () {
        sharedBeforeFunction();

        // init v1 consent management
        window.__cmp = function () {
        };
        delete window.__tcfapi;
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });
        setConsentConfig(consentConfig);
      });

      afterEach(function () {
        sharedAfterFunction();
      });

      it('does not call getId if no stored consent data and refresh is not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        let innerAdUnits;
        consentManagementRequestBidsHook(() => {
        }, {});
        requestBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits});

        sinon.assert.notCalled(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.calledOnce(mockExtendId);
      });

      it('calls getId if no stored consent data but refresh is needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 60 * 1000).toUTCString()), expStr);

        let innerAdUnits;
        consentManagementRequestBidsHook(() => {
        }, {});
        requestBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits});

        sinon.assert.calledOnce(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.notCalled(mockExtendId);
      });

      it('calls getId if empty stored consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData();

        let innerAdUnits;
        consentManagementRequestBidsHook(() => {
        }, {});
        requestBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits});

        sinon.assert.calledOnce(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.notCalled(mockExtendId);
      });

      it('calls getId if stored consent does not match current consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData({
          gdprApplies: testConsentData.gdprApplies,
          consentString: 'abc',
          apiVersion: testConsentData.apiVersion
        });

        let innerAdUnits;
        consentManagementRequestBidsHook(() => {
        }, {});
        requestBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits});

        sinon.assert.calledOnce(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.notCalled(mockExtendId);
      });

      it('does not call getId if stored consent matches current consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({id: '1234'}), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData({
          gdprApplies: testConsentData.gdprApplies,
          consentString: testConsentData.consentData,
          apiVersion: testConsentData.apiVersion
        });

        let innerAdUnits;
        consentManagementRequestBidsHook(() => {
        }, {});
        requestBidsHook((config) => {
          innerAdUnits = config.adUnits
        }, {adUnits});

        sinon.assert.notCalled(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.calledOnce(mockExtendId);
      });
    });

    describe('findRootDomain', function () {
      let sandbox;

      beforeEach(function () {
        setSubmoduleRegistry([pubCommonIdSubmodule]);
        init(config);
        config.setConfig({
          userSync: {
            syncDelay: 0,
            userIds: [
              {
                name: 'pubCommonId',
                value: { pubcid: '11111' },
              },
            ],
          },
        });
        sandbox = sinon.createSandbox();
        sandbox
          .stub(coreStorage, 'getCookie')
          .onFirstCall()
          .returns(null) // .co.uk
          .onSecondCall()
          .returns('writeable'); // realdomain.co.uk;
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('should just find the root domain', function () {
        var domain = findRootDomain('sub.realdomain.co.uk');
        expect(domain).to.be.eq('realdomain.co.uk');
      });

      it('should find the full domain when no subdomain is present', function () {
        var domain = findRootDomain('realdomain.co.uk');
        expect(domain).to.be.eq('realdomain.co.uk');
      });
    });
  });
});
