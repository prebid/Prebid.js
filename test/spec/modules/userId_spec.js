import {
  attachIdSystem,
  auctionDelay,
  init,
  requestBidsHook,
  setSubmoduleRegistry,
  syncDelay,
  coreStorage
} from 'modules/userId/index.js';
import {config} from 'src/config.js';
import * as utils from 'src/utils.js';
import events from 'src/events.js';
import CONSTANTS from 'src/constants.json';
import {unifiedIdSubmodule} from 'modules/unifiedIdSystem.js';
import {pubCommonIdSubmodule} from 'modules/pubCommonIdSystem.js';
import {britepoolIdSubmodule} from 'modules/britepoolIdSystem.js';
import {id5IdSubmodule} from 'modules/id5IdSystem.js';
import {identityLinkSubmodule} from 'modules/identityLinkIdSystem.js';
import {liveIntentIdSubmodule} from 'modules/liveIntentIdSystem.js';
import {netIdSubmodule} from 'modules/netIdSystem.js';
import {server} from 'test/mocks/xhr.js';

let assert = require('chai').assert;
let expect = require('chai').expect;
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

describe('User ID', function() {
  function getConfigMock(configArr1, configArr2, configArr3, configArr4, configArr5, configArr6) {
    return {
      userSync: {
        syncDelay: 0,
        userIds: [
          (configArr1 && configArr1.length >= 3) ? getStorageMock.apply(null, configArr1) : null,
          (configArr2 && configArr2.length >= 3) ? getStorageMock.apply(null, configArr2) : null,
          (configArr3 && configArr3.length >= 3) ? getStorageMock.apply(null, configArr3) : null,
          (configArr4 && configArr4.length >= 3) ? getStorageMock.apply(null, configArr4) : null,
          (configArr5 && configArr5.length >= 3) ? getStorageMock.apply(null, configArr5) : null,
          (configArr6 && configArr6.length >= 3) ? getStorageMock.apply(null, configArr6) : null
        ].filter(i => i)}
    }
  }
  function getStorageMock(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30, refreshInSeconds) {
    return { name: name, storage: { name: key, type: type, expires: expires, refreshInSeconds: refreshInSeconds } }
  }
  function getConfigValueMock(name, value) {
    return {
      userSync: { syncDelay: 0, userIds: [{ name: name, value: value }] }
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
        if (element[name] !== undefined) { element[name] = Object.assign(element[name], value); } else { element[name] = value; }
      });
    }

    return cfg;
  }

  before(function() {
    coreStorage.setCookie('_pubcid_optout', '', EXPIRED_COOKIE_DATE);
    localStorage.removeItem('_pbjs_id_optout');
    localStorage.removeItem('_pubcid_optout');
  });

  describe('Decorate Ad Units', function() {
    beforeEach(function() {
      coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      coreStorage.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 5000).toUTCString()));
      sinon.spy(coreStorage, 'setCookie');
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
      coreStorage.setCookie.restore();
    });

    after(function() {
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

      requestBidsHook(config => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
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

      requestBidsHook(config => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
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
      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
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
      requestBidsHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});

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
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
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
      // Because the cookie exists already, there should be no setCookie call by default
      expect(coreStorage.setCookie.callCount).to.equal(0);
    });

    it('Extend cookie', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {extend: true});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customConfig);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
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
      // Because extend is true, the cookie will be updated even if it exists already
      expect(coreStorage.setCookie.callCount).to.equal(1);
    });

    it('Disable auto create', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customConfig = getConfigMock(['pubCommonId', 'pubcid', 'cookie']);
      customConfig = addConfig(customConfig, 'params', {create: false});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customConfig);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.not.have.deep.nested.property('userId.pubcid');
          expect(bid).to.not.have.deep.nested.property('userIdAsEids');
        });
      });
      expect(coreStorage.setCookie.callCount).to.equal(0);
    });
  });

  describe('Opt out', function () {
    before(function () {
      coreStorage.setCookie('_pbjs_id_optout', '1', (new Date(Date.now() + 5000).toUTCString()));
    });

    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      // removed cookie
      coreStorage.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    after(function () {
      coreStorage.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
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
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
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
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({ userSync: {} });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          userIds: [{
            name: '',
            value: { test: '1' }
          }, {
            name: 'foo',
            value: { test: '1' }
          }]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('config with 1 configurations should create 1 submodules', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['unifiedId', 'unifiedid', 'cookie']));

      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
    });

    it('config with 7 configurations should result in 7 submodules add', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, liveIntentIdSubmodule, britepoolIdSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }, {
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }, {
            name: 'id5Id',
            storage: { name: 'id5id', type: 'cookie' }
          }, {
            name: 'identityLink',
            storage: { name: 'idl_env', type: 'cookie' }
          }, {
            name: 'liveIntentId',
            storage: { name: '_li_pbid', type: 'cookie' }
          }, {
            name: 'britepoolId',
            value: { 'primaryBPID': '279c0161-5152-487f-809e-05d7f7e653fd' }
          }, {
            name: 'netId',
            storage: { name: 'netId', type: 'cookie' }
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 7 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          syncDelay: 99,
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(syncDelay).to.equal(99);
    });

    it('config auctionDelay updates module correctly', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          auctionDelay: 100,
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(auctionDelay).to.equal(100);
    });

    it('config auctionDelay defaults to 0 if not a number', function () {
      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig({
        userSync: {
          auctionDelay: '',
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
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

    afterEach(function () {
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
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
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
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
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
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
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
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
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
      coreStorage.setCookie('MOCKID', JSON.stringify({'MOCKID': '123456778'}), new Date(Date.now() + 5000).toUTCString());

      config.setConfig({
        usersync: {
          auctionDelay: 200,
          syncDelay: 77,
          userIds: [{
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
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
              uids: [{id: 'testunifiedid_alt', atype: 1, ext: { rtiPartner: 'TDID' }}]
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

    it('test hook from id5id cookies when refresh needed', function(done) {
      // simulate existing browser local storage values
      coreStorage.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('id5id_last', (new Date(Date.now() - 7200 * 1000)).toUTCString(), (new Date(Date.now() + 5000).toUTCString()));

      sinon.stub(utils, 'logError'); // getId should failed with a logError as it has no partnerId

      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['id5Id', 'id5id', 'cookie', 10, 3600]));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'id5-sync.com',
              uids: [{id: 'testid5id', atype: 1}]
            });
          });
        });
        sinon.assert.calledOnce(utils.logError);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        utils.logError.restore();
        done();
      }, {adUnits});
    });

    it('test hook from id5id value-based config', function(done) {
      setSubmoduleRegistry([id5IdSubmodule]);
      init(config);
      config.setConfig(getConfigValueMock('id5Id', {'id5id': 'testid5id'}));

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.id5id');
            expect(bid.userId.id5id).to.equal('testid5id');
            expect(bid.userIdAsEids[0]).to.deep.equal({
              source: 'id5-sync.com',
              uids: [{id: 'testid5id', atype: 1}]
            });
          });
        });
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
      coreStorage.setCookie('_li_pbid', JSON.stringify({'unifiedId': 'random-cookie-identifier', 'segments': ['123']}), (new Date(Date.now() + 100000).toUTCString()));

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

    it('test hook when pubCommonId, unifiedId, id5Id, identityLink, britepoolId and netId have data to pass', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'testunifiedid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule]);
      init(config);
      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie'],
        ['britepoolId', 'britepoolid', 'cookie'],
        ['netId', 'netId', 'cookie']));

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
            expect(bid.userIdAsEids.length).to.equal(6);
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook when pubCommonId, unifiedId, id5Id, britepoolId and netId have their modules added before and after init', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), (new Date(Date.now() + 5000).toUTCString()));

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

      config.setConfig(getConfigMock(['pubCommonId', 'pubcid', 'cookie'],
        ['unifiedId', 'unifiedid', 'cookie'],
        ['id5Id', 'id5id', 'cookie'],
        ['identityLink', 'idl_env', 'cookie'],
        ['britepoolId', 'britepoolid', 'cookie'],
        ['netId', 'netId', 'cookie']));

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
            expect(bid.userIdAsEids.length).to.equal(6);
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('should add new id system ', function(done) {
      coreStorage.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('unifiedid', JSON.stringify({'TDID': 'cookie-value-add-module-variations'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('id5id', JSON.stringify({'ID5ID': 'testid5id'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('idl_env', 'AiGNC8Z5ONyZKSpIPf', new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('britepoolid', JSON.stringify({'primaryBPID': 'testbritepoolid'}), (new Date(Date.now() + 5000).toUTCString()));
      coreStorage.setCookie('netId', JSON.stringify({'netId': 'testnetId'}), new Date(Date.now() + 5000).toUTCString());
      coreStorage.setCookie('MOCKID', JSON.stringify({'MOCKID': '123456778'}), new Date(Date.now() + 5000).toUTCString());

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule, id5IdSubmodule, identityLinkSubmodule, britepoolIdSubmodule, netIdSubmodule]);
      init(config);

      config.setConfig({
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', storage: { name: 'pubcid', type: 'cookie' }
          }, {
            name: 'unifiedId', storage: { name: 'unifiedid', type: 'cookie' }
          }, {
            name: 'id5Id', storage: { name: 'id5id', type: 'cookie' }
          }, {
            name: 'identityLink', storage: { name: 'idl_env', type: 'cookie' }
          }, {
            name: 'britepoolId', storage: { name: 'britepoolid', type: 'cookie' }
          }, {
            name: 'netId', storage: { name: 'netId', type: 'cookie' }
          }, {
            name: 'mockId', storage: { name: 'MOCKID', type: 'cookie' }
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
            // check MockId data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.mid');
            expect(bid.userId.mid).to.equal('123456778');
            expect(bid.userIdAsEids.length).to.equal(6);// mid is unknown for eids.js
          });
        });
        coreStorage.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('id5id', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('idl_env', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('britepoolid', '', EXPIRED_COOKIE_DATE);
        coreStorage.setCookie('netId', '', EXPIRED_COOKIE_DATE);
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

    it('pubcid callback with url', function () {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      let customCfg = getConfigMock(['pubCommonId', 'pubcid_alt', 'cookie']);
      customCfg = addConfig(customCfg, 'params', {pixelUrl: '/any/pubcid/url'});

      setSubmoduleRegistry([pubCommonIdSubmodule, unifiedIdSubmodule]);
      init(config);
      config.setConfig(customCfg);
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

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
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

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
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(server.requests).to.be.empty;
      events.emit(CONSTANTS.EVENTS.AUCTION_END, {});
      expect(server.requests[0].url).to.equal('https://match.adsrvr.org/track/rid?ttd_pid=rubicon&fmt=json');
    });

    it('callback for submodules that always need to refresh stored id', function(done) {
      let adUnits = [getAdUnitMock()];
      let innerAdUnits;
      const parrableStoredId = '01.1111111111.test-eid';
      const parrableRefreshedId = '02.2222222222.test-eid';
      coreStorage.setCookie('_parrable_eid', parrableStoredId, (new Date(Date.now() + 5000).toUTCString()));

      const parrableIdSubmoduleMock = {
        name: 'parrableId',
        decode: function(value) {
          return { 'parrableid': value };
        },
        getId: function() {
          return {
            callback: function(cb) {
              cb(parrableRefreshedId);
            }
          };
        }
      };

      const parrableConfigMock = {
        userSync: {
          syncDelay: 0,
          userIds: [{
            name: 'parrableId',
            storage: {
              type: 'cookie',
              name: '_parrable_eid'
            }
          }]
        }
      };

      setSubmoduleRegistry([parrableIdSubmoduleMock]);
      attachIdSystem(parrableIdSubmoduleMock);
      init(config);
      config.setConfig(parrableConfigMock);

      // make first bid request, should use stored id value
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach(unit => {
        unit.bids.forEach(bid => {
          expect(bid).to.have.deep.nested.property('userId.parrableid');
          expect(bid.userId.parrableid).to.equal(parrableStoredId);
          expect(bid.userIdAsEids[0]).to.deep.equal({
            source: 'parrable.com',
            uids: [{id: parrableStoredId, atype: 1}]
          });
        });
      });

      // attach a handler for auction end event to run the second bid request
      events.on(CONSTANTS.EVENTS.AUCTION_END, function handler(submodule) {
        if (submodule === 'parrableIdSubmoduleMock') {
          // make the second bid request, id should have been refreshed
          requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
          innerAdUnits.forEach(unit => {
            unit.bids.forEach(bid => {
              expect(bid).to.have.deep.nested.property('userId.parrableid');
              expect(bid.userId.parrableid).to.equal(parrableRefreshedId);
              expect(bid.userIdAsEids[0]).to.deep.equal({
                source: 'parrable.com',
                uids: [{id: parrableRefreshedId, atype: 1}]
              });
            });
          });
          events.off(CONSTANTS.EVENTS.AUCTION_END, handler);
          done();
        }
      });

      // emit an auction end event to run the submodule callback
      events.emit(CONSTANTS.EVENTS.AUCTION_END, 'parrableIdSubmoduleMock');
    });
  });
});
