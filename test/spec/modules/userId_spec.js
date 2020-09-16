import {
  attachIdSystem,
  auctionDelay,
  init,
  requestBidsHook,
  setSubmoduleRegistry,
  syncDelay,
  coreStorage,
  setStoredValue,
  setStoredConsentData
} from 'modules/userId/index.js';
import {createEidsArray} from 'modules/userId/eids.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import {getGlobal} from 'src/prebidGlobal.js';
import {setConsentConfig, requestBidsHook as consentManagementRequestBidsHook, resetConsentData} from 'modules/consentManagement.js';
import {gdprDataHandler} from 'src/adapterManager.js';
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
import {server} from 'test/mocks/xhr.js';

let assert = require('chai').assert;
let expect = require('chai').expect;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';
const CONSENT_LOCAL_STORAGE_NAME = '_pbjs_userid_consent_data';

describe('User ID', function() {
  function getConfigMock(configArr1, configArr2, configArr3, configArr4, configArr5, configArr6, configArr7, configArr8, configArr9, configArr10) {
    return {
      userSync: {
        syncDelay: 0,
        userIds: [
          (configArr1 && configArr1.length >= 3) ? getStorageMock.apply(null, configArr1) : null,
          (configArr2 && configArr2.length >= 3) ? getStorageMock.apply(null, configArr2) : null,
          (configArr3 && configArr3.length >= 3) ? getStorageMock.apply(null, configArr3) : null,
          (configArr4 && configArr4.length >= 3) ? getStorageMock.apply(null, configArr4) : null,
          (configArr5 && configArr5.length >= 3) ? getStorageMock.apply(null, configArr5) : null,
          (configArr6 && configArr6.length >= 3) ? getStorageMock.apply(null, configArr6) : null,
          (configArr7 && configArr7.length >= 3) ? getStorageMock.apply(null, configArr7) : null,
          (configArr8 && configArr8.length >= 3) ? getStorageMock.apply(null, configArr8) : null,
          (configArr9 && configArr9.length >= 3) ? getStorageMock.apply(null, configArr9) : null,
          (configArr10 && configArr10.length >= 3) ? getStorageMock.apply(null, configArr10) : null
        ].filter(i => i)
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
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
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

  before(function() {
    coreStorage.setCookie('_pubcid_optout', '', EXPIRED_COOKIE_DATE);
    localStorage.removeItem('_pbjs_id_optout');
    localStorage.removeItem('_pubcid_optout');
  });

  beforeEach(function() {
    coreStorage.setCookie(CONSENT_LOCAL_STORAGE_NAME, '', EXPIRED_COOKIE_DATE);
  });

  describe('Decorate Ad Units', function() {
    beforeEach(function() {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 5000).toUTCString()));
      sinon.spy(coreStorage, 'setCookie');
    });

    afterEach(function() {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      coreStorage.setCookie.restore();
    });

    after(function() {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', '', EXPIRED_COOKIE_DATE);
    });

    it('Check same cookie behavior', function() {
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

    it('Check different cookies', function() {
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

    it('Use existing cookie', function() {
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

    it('Extend cookie', function() {
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

    it('Disable auto create', function() {
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

    it('pbjs.getUserIds', function() {
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

    it('pbjs.getUserIdsAsEids', function() {
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
  });

  describe('Opt out', function() {
    before(function() {
      coreStorage.setCookie('_pbjs_id_optout', '1', (new Date(Date.now() + 5000).toUTCString()));
    });

    beforeEach(function() {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function() {
      // removed cookie
      coreStorage.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    after(function() {
      coreStorage.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
    });

    it('fails initialization if opt out cookie exists', function() {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - opt-out cookie found, exit module');
    });

    it('initializes if no opt out cookie exists', function() {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
    });
  });

  describe('Handle variations of config values', function() {
    beforeEach(function() {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function() {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    it('handles config with no usersync object', function() {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig({userSync: {}});
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, merkleIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule]);
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
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid', 'cookie']));

      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
    });

    it('config with 10 configurations should result in 11 submodules add', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, liveIntentIdSubmodule, britepoolIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
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
            storage: { name: 'intentIqId', type: 'cookie' }
          }, {
            name: 'haloId',
            storage: { name: 'haloId', type: 'cookie' }
          }, {
            name: 'zeotapIdPlus'
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 11 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule]);
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
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule]);
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
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule]);
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

  describe('auction and user sync delays', function() {
    let sandbox;
    let adUnits;
    let mockIdCallback;
    let auctionSpy;

    beforeEach(function() {
      sandbox = sinon.createSandbox();
      sandbox.stub(global, 'setTimeout').returns(2);
      sandbox.stub(events, 'on');
      sandbox.stub(coreStorage, 'getCookie');

      // remove cookie
      coreStorage.setCookie('MOCKID', '', EXPIRED_COOKIE_DATE);

      adUnits = [getAdUnitMock()];

      auctionSpy = sandbox.spy();
      mockIdCallback = sandbox.stub();
      const mockIdSystem = {
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: function() {
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

    afterEach(function() {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      sandbox.restore();
    });

    it('delays auction if auctionDelay is set, timing out at auction delay', function() {
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

    it('delays auction if auctionDelay is set, continuing auction if ids are fetched before timing out', function(done) {
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

    it('does not delay auction if not set, delays id fetch after auction ends with syncDelay', function() {
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

    it('does not delay user id sync after auction ends if set to 0', function() {
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

    it('does not delay auction if there are no ids to fetch', function() {
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

  describe('Request bids hook appends userId to bid objs in adapters', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [getAdUnitMock()];
    });

    it('test hook from pubcommonid cookie', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from pubcommonid config value object', function(done) {
      setSubmoduleRegistry([pubCommonIdSubmodule]);
      init(config);
      config.setConfig(getConfigValueMock('pubCommonId', {'pubcidvalue': 'testpubcidvalue'}));

      requestBidsHook(function() {
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

    it('test hook from pubcommonid html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('unifiedid_alt', JSON.stringify({'TDID': 'testunifiedid_alt'}));
      localStorage.setItem('unifiedid_alt_exp', '');

      setSubmoduleRegistry([unifiedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid_alt', 'html5']));

      requestBidsHook(function() {
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

    it('test hook from identityLink html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('idl_env', 'AiGNC8Z5ONyZKSpIPf');
      localStorage.setItem('idl_env_exp', '');

      setSubmoduleRegistry([identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['identityLink', 'idl_env', 'html5']));
      requestBidsHook(function() {
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

    it('test hook from identityLink cookie', function(done) {
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([identityLinkSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['identityLink', 'idl_env', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from liveIntentId html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('_li_pbid', JSON.stringify({'unifiedId': 'random-ls-identifier'}));
      localStorage.setItem('_li_pbid_exp', '');

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'html5']));
      requestBidsHook(function() {
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

    it('test hook from liveIntentId cookie', function(done) {
      coreStorage.setCookie('_li_pbid', JSON.stringify({'unifiedId': 'random-cookie-identifier'}), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from sharedId html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('sharedid', JSON.stringify({'id': 'test_sharedId', 'ts': 1590525289611}));
      localStorage.setItem('sharedid_exp', '');

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'html5']));
      requestBidsHook(function() {
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

    it('test hook from sharedId html5 (id not synced)', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('sharedid', JSON.stringify({'id': 'test_sharedId', 'ns': true, 'ts': 1590525289611}));
      localStorage.setItem('sharedid_exp', '');

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'html5']));
      requestBidsHook(function() {
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
    it('test hook from sharedId cookie', function(done) {
      coreStorage.setCookie('sharedid', JSON.stringify({'id': 'test_sharedId', 'ts': 1590525289611}), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'cookie']));

      requestBidsHook(function() {
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
    it('test hook from sharedId cookie (id not synced) ', function(done) {
      coreStorage.setCookie('sharedid', JSON.stringify({'id': 'test_sharedId', 'ns': true, 'ts': 1590525289611}), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([sharedIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from liveIntentId html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('_li_pbid', JSON.stringify({'unifiedId': 'random-ls-identifier', 'segments': ['123']}));
      localStorage.setItem('_li_pbid_exp', '');

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'html5']));
      requestBidsHook(function() {
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

    it('test hook from liveIntentId cookie', function(done) {
      coreStorage.setCookie('_li_pbid', JSON.stringify({
        'unifiedId': 'random-cookie-identifier',
        'segments': ['123']
      }), (new Date(Date.now() + 100000).toUTCString()));

      setSubmoduleRegistry([liveIntentIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['liveIntentId', '_li_pbid', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from britepoolid cookies', function(done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': '279c0161-5152-487f-809e-05d7f7e653fd'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([britepoolIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['britepoolId', 'britepoolid', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from netId cookies', function(done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'fH5A3n2O8_CZZyPoJVD-eabc6ECb7jhxCicsds7qSg'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([netIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['netId', 'netId', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from intentIqId cookies', function(done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('intentIqId', 'abcdefghijk', (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([intentIqIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['intentIqId', 'intentIqId', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from haloId html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('haloId', JSON.stringify({'haloId': 'random-ls-identifier'}));
      localStorage.setItem('haloId_exp', '');

      setSubmoduleRegistry([haloIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['haloId', 'haloId', 'html5']));

      requestBidsHook(function() {
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

    it('test hook from merkleId cookies', function(done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('merkleId', JSON.stringify({'ppid': {'id': 'testmerkleId'}}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([merkleIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['merkleId', 'merkleId', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook from zeotapIdPlus cookies', function(done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('IDP', btoa(JSON.stringify('abcdefghijk')), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([zeotapIdPlusSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['zeotapIdPlus', 'IDP', 'cookie']));

      requestBidsHook(function() {
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

    it('test hook when pubCommonId, unifiedId, id5Id, identityLink, britepoolId, intentIqId, zeotapIdPlus, sharedId, netId and haloId have data to pass', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'testunifiedid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('sharedid', JSON.stringify({'id': 'test_sharedId', 'ts': 1590525289611}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('haloId', JSON.stringify({'haloId': 'testHaloId'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule, sharedIdSubmodule, intentIqIdSubmodule, zeotapIdPlusSubmodule, haloIdSubmodule]);
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
        ['haloId', 'haloId', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
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
        done();
      }, {adUnits});
    });

    it('test hook when pubCommonId, unifiedId, id5Id, britepoolId, intentIqId, zeotapIdPlus, sharedId, netId and haloId have their modules added before and after init', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('sharedid', JSON.stringify({'id': 'test_sharedId', 'ts': 1590525289611}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('intentIqId', 'testintentIqId', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('IDP', btoa(JSON.stringify('zeotapId')), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('haloId', JSON.stringify({'haloId': 'testHaloId'}), (new Date(Date.now() + 5000).toUTCString()));

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

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie'],
        ['britepoolId', 'britepoolid', 'cookie'],
        ['netId', 'netId', 'cookie'],
        ['sharedId', 'sharedid', 'cookie'],
        ['intentIqId', 'intentIqId', 'cookie'],
        ['zeotapIdPlus', 'IDP', 'cookie'],
        ['haloId', 'haloId', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
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
        done();
      }, {adUnits});
    });

    it('test hook when sharedId(opted out) have their modules added before and after init', function(done) {
      coreStorage.setCookie('sharedid', JSON.stringify({'id': '00000000000000000000000000', 'ts': 1590525289611}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([]);
      init(config);

      attachIdSystem(sharedIdSubmodule);

      config.setConfig(getConfigMock(['sharedId', 'sharedid', 'cookie']));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid.userIdAsEids).to.be.undefined;
          });
        });
        coreStorage.setCookie('sharedid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('should add new id system ', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('id5id', JSON.stringify({'universal_uid': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('sharedid', JSON.stringify({'id': 'test_sharedId', 'ts': 1590525289611}), new Date(Date.now() + 5000).toUTCString());
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
            name: 'intentIqId', storage: { name: 'intentIqId', type: 'cookie' }
          }, {
            name: 'zeotapIdPlus'
          }, {
            name: 'haloId', storage: { name: 'haloId', type: 'cookie' }
          }, {
            name: 'mockId', storage: {name: 'MOCKID', type: 'cookie'}
          }]
        }
      });

      // Add new submodule named 'mockId'
      attachIdSystem({
        name: 'mockId',
        decode: function(value) {
          return {
            'mid': value['MOCKID']
          };
        },
        getId: function(params, storedId) {
          if (storedId) return {};
          return {id: {'MOCKID': '1234'}};
        }
      });

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // check PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // check UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('cookie-value-add-module-variations');
            // also check that Id5Id id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
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

  describe('callbacks at the end of auction', function() {
    beforeEach(function() {
      sinon.stub(events, 'getEvents').returns([]);
      sinon.stub(utils, 'triggerPixel');
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('_parrable_eid', '', EXPIRED_COOKIE_DATE);
    });

    afterEach(function() {
      events.getEvents.restore();
      utils.triggerPixel.restore();
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('_parrable_eid', '', EXPIRED_COOKIE_DATE);
    });

    it('pubcid callback with url', function() {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
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

    it('unifiedid callback with url', function() {
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

    it('unifiedid callback with partner', function() {
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
  });

  describe('Set cookie behavior', function() {
    let coreStorageSpy;
    beforeEach(function () {
      coreStorageSpy = sinon.spy(coreStorage, 'setCookie');
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

  describe('Consent changes determine getId refreshes', function() {
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

    const sharedBeforeFunction = function() {
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

    describe('TCF v1', function() {
      testConsentData = {
        gdprApplies: true,
        consentData: 'xyz',
        apiVersion: 1
      };

      beforeEach(function () {
        sharedBeforeFunction();

        // init v1 consent management
        window.__cmp = function () { };
        delete window.__tcfapi;
        cmpStub = sinon.stub(window, '__cmp').callsFake((...args) => {
          args[2](testConsentData);
        });
        setConsentConfig(consentConfig);
      });

      afterEach(function() {
        sharedAfterFunction();
      });

      it('does not call getId if no stored consent data and refresh is not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({ id: '1234' }), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        let innerAdUnits;
        consentManagementRequestBidsHook(() => { }, {});
        requestBidsHook((config) => { innerAdUnits = config.adUnits }, { adUnits });

        sinon.assert.notCalled(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.calledOnce(mockExtendId);
      });

      it('calls getId if no stored consent data but refresh is needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({ id: '1234' }), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 60 * 1000).toUTCString()), expStr);

        let innerAdUnits;
        consentManagementRequestBidsHook(() => { }, {});
        requestBidsHook((config) => { innerAdUnits = config.adUnits }, { adUnits });

        sinon.assert.calledOnce(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.notCalled(mockExtendId);
      });

      it('calls getId if empty stored consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({ id: '1234' }), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData();

        let innerAdUnits;
        consentManagementRequestBidsHook(() => { }, {});
        requestBidsHook((config) => { innerAdUnits = config.adUnits }, { adUnits });

        sinon.assert.calledOnce(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.notCalled(mockExtendId);
      });

      it('calls getId if stored consent does not match current consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({ id: '1234' }), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData({
          gdprApplies: testConsentData.gdprApplies,
          consentString: 'abc',
          apiVersion: testConsentData.apiVersion
        });

        let innerAdUnits;
        consentManagementRequestBidsHook(() => { }, {});
        requestBidsHook((config) => { innerAdUnits = config.adUnits }, { adUnits });

        sinon.assert.calledOnce(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.notCalled(mockExtendId);
      });

      it('does not call getId if stored consent matches current consent and refresh not needed', function () {
        coreStorage.setCookie(mockIdCookieName, JSON.stringify({ id: '1234' }), expStr);
        coreStorage.setCookie(`${mockIdCookieName}_last`, (new Date(Date.now() - 1 * 1000).toUTCString()), expStr);

        setStoredConsentData({
          gdprApplies: testConsentData.gdprApplies,
          consentString: testConsentData.consentData,
          apiVersion: testConsentData.apiVersion
        });

        let innerAdUnits;
        consentManagementRequestBidsHook(() => { }, {});
        requestBidsHook((config) => { innerAdUnits = config.adUnits }, { adUnits });

        sinon.assert.notCalled(mockGetId);
        sinon.assert.calledOnce(mockDecode);
        sinon.assert.calledOnce(mockExtendId);
      });
    });
  });
});
