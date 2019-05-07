import {
  init,
  syncDelay,
  pubCommonIdSubmodule,
  unifiedIdSubmodule,
  requestBidsHook
} from 'modules/userId';
import {config} from 'src/config';
import * as utils from 'src/utils';

let assert = require('chai').assert;
let expect = require('chai').expect;

describe('User ID', function() {
  const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:01 GMT';

  function createStorageConfig(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30) {
    return { name: name, storage: { name: key, type: type, expires: expires } }
  }

  function createAdUnit(code = 'adUnit-code') {
    return {
      code,
      mediaTypes: {banner: {}, native: {}},
      sizes: [[300, 200], [300, 600]],
      bids: [{bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}]
    };
  }

  before(function() {
    utils.setCookie('_pubcid_optout', '', EXPIRED_COOKIE_DATE);
  });

  describe('Decorate Ad Units', function() {
    beforeEach(function() {
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('pubcid_alt', 'altpubcid200000', (new Date(Date.now() + 5000).toUTCString()));
    });

    afterEach(function () {
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      config.resetConfig();
    });

    after(function() {
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
      utils.setCookie('pubcid_alt', '', EXPIRED_COOKIE_DATE);
    });

    it('Check same cookie behavior', function () {
      let adUnits1 = [createAdUnit()];
      let adUnits2 = [createAdUnit()];
      let innerAdUnits1;
      let innerAdUnits2;

      let pubcid = utils.getCookie('pubcid');
      expect(pubcid).to.be.null; // there should be no cookie initially

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });

      requestBidsHook(config => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid = utils.getCookie('pubcid'); // cookies is created after requestbidHook

      innerAdUnits1.forEach(unit => {
        unit.bids.forEach(bid => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid);
        });
      });

      requestBidsHook(config => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
      assert.deepEqual(innerAdUnits1, innerAdUnits2);
    });

    it('Check different cookies', function () {
      let adUnits1 = [createAdUnit()];
      let adUnits2 = [createAdUnit()];
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid1 = utils.getCookie('pubcid'); // get first cookie
      utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE); // erase cookie

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid1);
        });
      });

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      requestBidsHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});

      pubcid2 = utils.getCookie('pubcid'); // get second cookie

      innerAdUnits2.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid2);
        });
      });

      expect(pubcid1).to.not.equal(pubcid2);
    });

    it('Check new cookie', function () {
      let adUnits = [createAdUnit()];
      let innerAdUnits;

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [createStorageConfig('pubCommonId', 'pubcid_alt', 'cookie')]}
      });
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal('altpubcid200000');
        });
      });
    });
  });

  describe('Opt out', function () {
    before(function () {
      utils.setCookie('_pbjs_id_optout', '1', (new Date(Date.now() + 5000).toUTCString()));
    });

    beforeEach(function () {
      sinon.stub(utils, 'logInfo');
    });

    afterEach(function () {
      // removed cookie
      utils.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
      $$PREBID_GLOBAL$$.requestBids.removeAll();
      utils.logInfo.restore();
      config.resetConfig();
    });

    after(function () {
      utils.setCookie('_pbjs_id_optout', '', EXPIRED_COOKIE_DATE);
    });

    it('fails initialization if opt out cookie exists', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - opt-out cookie found, exit module');
    });

    it('initializes if no opt out cookie exists', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
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
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'User ID - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: {} });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
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
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 1 submodules');
    });

    it('config with 2 configurations should result in 2 submodules add', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId', value: {'pubcid': '11111'}
          }, {
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('User ID - usersync config updated for 2 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 99,
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(syncDelay).to.equal(99);
    });
  });

  describe('Request bids hook appends userId to bid objs in adapters', function() {
    let adUnits;

    beforeEach(function() {
      adUnits = [createAdUnit()];
    });

    it('test hook from pubcommonid cookie', function(done) {
      utils.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 100000).toUTCString()));

      init(config, [pubCommonIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [createStorageConfig('pubCommonId', 'pubcid', 'cookie')]
        }
      });

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
          });
        });
        utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });

    it('test hook from pubcommonid config value object', function(done) {
      init(config, [pubCommonIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId',
            value: {'pubcidvalue': 'testpubcidvalue'}
          }]}
      });

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.pubcidvalue');
            expect(bid.userId.pubcidvalue).to.equal('testpubcidvalue');
          });
        });
        done();
      }, {adUnits});
    });

    it('test hook from pubcommonid html5', function(done) {
      // simulate existing browser local storage values
      localStorage.setItem('unifiedid_alt', JSON.stringify({'TDID': 'testunifiedid_alt'}));
      localStorage.setItem('unifiedid_alt_exp', '');

      init(config, [unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [createStorageConfig('unifiedId', 'unifiedid_alt', 'html5')]}
      });

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid_alt');
          });
        });
        localStorage.removeItem('unifiedid_alt');
        localStorage.removeItem('unifiedid_alt_exp');
        done();
      }, {adUnits});
    });

    it('test hook when both pubCommonId and unifiedId have data to pass', function(done) {
      utils.setCookie('pubcid', 'testpubcid', (new Date(Date.now() + 5000).toUTCString()));
      utils.setCookie('unifiedid', JSON.stringify({'TDID': 'testunifiedid'}), (new Date(Date.now() + 5000).toUTCString()));

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [
            createStorageConfig('pubCommonId', 'pubcid', 'cookie'),
            createStorageConfig('unifiedId', 'unifiedid', 'cookie')
          ]}
      });

      requestBidsHook(function() {
        adUnits.forEach(unit => {
          unit.bids.forEach(bid => {
            // verify that the PubCommonId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.pubcid');
            expect(bid.userId.pubcid).to.equal('testpubcid');
            // also check that UnifiedId id data was copied to bid
            expect(bid).to.have.deep.nested.property('userId.tdid');
            expect(bid.userId.tdid).to.equal('testunifiedid');
          });
        });
        utils.setCookie('pubcid', '', EXPIRED_COOKIE_DATE);
        utils.setCookie('unifiedid', '', EXPIRED_COOKIE_DATE);
        done();
      }, {adUnits});
    });
  })
});
