import {
  init,
  syncDelay,
  pubCommonIdSubmodule,
  unifiedIdSubmodule,
  requestBidsHook
} from '../../../modules/userId';
import {config} from '../../../src/config';
import * as utils from '../../../src/utils';
import { getAdUnits } from '../../../test/fixtures/fixtures';
import { registerBidder } from 'src/adapters/bidderFactory';
// import * as auctionModule from '../../../src/auction';
// used to emit event for AUCTION_END
// import events from '../../../src/events.js';
// used to set consentData
// import { gdprDataHandler } from '../../../src/adapterManager.js';
import {expect} from 'chai'
import sinon from 'sinon'

describe('User ID', function() {
  const PUBCOMMONID_COOKIE_KEY = 'pubcid';

  let mockSubmodules = [{
    name: 'pubCommonId',
    decode: function (value) { return { 'pubcid': value } },
    getId: function (submoduleConfig, consentData, syncDelay) {}
  }, {
    name: 'unifiedId',
    decode: function (value) { return { 'ttid': value } },
    getId: function (data, consentData, syncDelay) {}
  }];

  function getSubmodules() { return [pubCommonIdSubmodule, unifiedIdSubmodule] }

  function createStorageConfig(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30) {
    return { name: name, storage: { name: key, type: type, expires: expires } }
  }

  function removeCookie(key) { window.document.cookie = key + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;' }

  let clock;
  let sandbox;

  before(function () {
    clock = sinon.useFakeTimers(Date.now());
  });

  after(function () {
    clock.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    sinon.stub(utils, 'logInfo');
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
    utils.logInfo.restore();
    config.resetConfig();
    sandbox.restore();
  });

  describe('Decorate Ad Units', function() {
    after(function() {
      removeCookie(PUBCOMMONID_COOKIE_KEY);
    });

    it('Check same cookie behavior', function () {
      let adUnits1 = getAdUnits();
      let adUnits2 = getAdUnits();
      let innerAdUnits1;
      let innerAdUnits2;

      let pubcid = utils.getCookie(PUBCOMMONID_COOKIE_KEY);
      expect(pubcid).to.be.null; // there should be no cookie initially

      init(config, getSubmodules());
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });

      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid = utils.getCookie(PUBCOMMONID_COOKIE_KEY); // cookies is created after requestbidHook

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid);
        });
      });

      requestBidsHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
      assert.deepEqual(innerAdUnits1, innerAdUnits2);
    });

    it('Check different cookies', function () {
      let adUnits1 = getAdUnits();
      let adUnits2 = getAdUnits();
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      init(config, getSubmodules());
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid1 = utils.getCookie(PUBCOMMONID_COOKIE_KEY); // get first cookie
      utils.setCookie(PUBCOMMONID_COOKIE_KEY, '', -1); // erase cookie

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid1);
        });
      });

      init(config, getSubmodules());
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      requestBidsHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});

      pubcid2 = utils.getCookie(PUBCOMMONID_COOKIE_KEY); // get second cookie

      innerAdUnits2.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid2);
        });
      });

      expect(pubcid1).to.not.equal(pubcid2);
    });

    it('Check new cookie', function () {
      let adUnits = getAdUnits();
      let innerAdUnits;
      let pubcid = utils.generateUUID();

      utils.setCookie(PUBCOMMONID_COOKIE_KEY, pubcid, 600);

      init(config, getSubmodules());
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      requestBidsHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(pubcid);
        });
      });
    });
  });

  describe('opt out', function () {
    before(function () {
      utils.setCookie('_pbjs_id_optout', '1', 1);
    });

    afterEach(function () {
      removeCookie('_pbjs_id_optout');
    });

    it('fails initialization if opt out cookie exists', function () {
      init(config, getSubmodules());
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - opt-out cookie found, exit module');
    });

    it('initializes if no opt out cookie exists', function () {
      init(config, getSubmodules());
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - usersync config updated for 1 submodules');
    });
  });

  describe('handle variations of config values', function () {
    it('handles config with no usersync object', function () {
      init(config, mockSubmodules);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'UniversalId - usersync config updated'
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with empty usersync object', function () {
      init(config, mockSubmodules);
      config.setConfig({ usersync: {} });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds that are empty objs', function () {
      init(config, mockSubmodules);
      config.setConfig({
        usersync: {
          userIds: [{}]
        }
      });
      expect(typeof utils.logInfo.args[0]).to.equal('undefined');
    });

    it('handles config with usersync and userIds with empty names or that dont match a submodule.name', function () {
      init(config, mockSubmodules);
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
      init(config, mockSubmodules);
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'unifiedId',
            storage: { name: 'unifiedid', type: 'cookie' }
          }]
        }
      });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - usersync config updated for 1 submodules');
    });

    it('config with 2 configurations should result in 2 submodules add', function () {
      init(config, mockSubmodules);
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
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - usersync config updated for 2 submodules');
    });

    it('config syncDelay updates module correctly', function () {
      init(config, mockSubmodules);
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
});
