import {
  init,
  syncDelay,
  submodules,
  pubCommonIdSubmodule,
  unifiedIdSubmodule,
  requestBidsHook
} from 'modules/userId';
import {config} from 'src/config';
import * as utils from 'src/utils';
import {getAdUnits} from 'test/fixtures/fixtures';
import {registerBidder} from 'src/adapters/bidderFactory';
import * as auctionModule from '../../../src/auction';
import { gdprDataHandler } from '../../../src/adapterManager.js';
import {expect} from 'chai'
import sinon from 'sinon'

const TIMEOUT = 2000;

function createStorageConfig(name = 'pubCommonId', key = 'pubcid', type = 'cookie', expires = 30) {
  return { name: name, storage: { name: key, type: type, expires: expires } }
}

describe('User ID', function() {
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
    sandbox.stub(gdprDataHandler, 'getConsentData').returns({
      consentString: 'consenttest1',
      vendorData: {
        purposeConsents: {
          '1': true
        }
      },
      gdprApplies: true
    });
    sinon.stub(utils, 'logInfo');
  });

  afterEach(function () {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
    utils.logInfo.restore();
    config.resetConfig();
    // events.getEvents.restore();
    sandbox.restore();
  });

  describe('Decorate Ad Units', function() {
    after(function() {
      utils.setCookie('pubcid', '', -1);
    });

    it('Check same cookie behavior', function () {
      let adUnits1 = getAdUnits();
      let adUnits2 = getAdUnits();
      let innerAdUnits1;
      let innerAdUnits2;

      let pubcid = utils.getCookie('pubcid');
      expect(pubcid).to.be.null; // there should be no cookie initially

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });

      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid = utils.getCookie('pubcid'); // cookies is created after requestbidHook

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

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      requestBidsHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid1 = utils.getCookie('pubcid'); // get first cookie
      utils.setCookie('pubcid', '', -1); // erase cookie

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
      let adUnits = getAdUnits();
      let innerAdUnits;
      let pubcid = utils.generateUUID();

      utils.setCookie('pubcid', pubcid, 1);

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
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
      // removed cookie
      utils.setCookie('_pbjs_id_optout', '', -1);
    });

    it('fails initialization if opt out cookie exists', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - opt-out cookie found, exit module');
    });

    it('initializes if no opt out cookie exists', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({ usersync: { syncDelay: 0, userIds: [ createStorageConfig() ] } });
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - usersync config updated for 1 submodules');
    });
  });

  describe('handle variations of config values', function () {
    it('handles config with no usersync object', function () {
      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);
      config.setConfig({});
      // usersync is undefined, and no logInfo message for 'UniversalId - usersync config updated'
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
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - usersync config updated for 1 submodules');
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
      expect(utils.logInfo.args[0][0]).to.exist.and.to.equal('UserId - usersync config updated for 2 submodules');
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

  describe('Invoking requestBid', function () {
    let storageResetCount = 0;
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let capturedReqs;
    let sampleSpec = {
      code: 'sampleBidder',
      isBidRequestValid: () => {},
      buildRequest: (reqs) => {},
      interpretResponse: () => {},
      getUserSyncs: () => {}
    };

    after(function() {
      utils.setCookie('pubcid', '', -1);
      utils.setCookie('unifiedid', '', -1);
      localStorage.removeItem('unifiedid_alt');
      localStorage.removeItem('unifiedid_alt_exp');
    });

    beforeEach(function () {
      // simulate existing browser cookie values
      utils.setCookie('pubcid', `testpubcid${storageResetCount}`, 1);
      utils.setCookie('unifiedid', JSON.stringify({
        'TDID': `testunifiedid${storageResetCount}`
      }), 1);

      // simulate existing browser local storage values
      localStorage.setItem('unifiedid_alt', JSON.stringify({
        'TDID': `testunifiedid_alt${storageResetCount}`
      }));
      localStorage.setItem('unifiedid_alt_exp', '');

      adUnits = [{
        code: 'adUnit-code',
        mediaTypes: {
          banner: {},
          native: {},
        },
        sizes: [[300, 200], [300, 600]],
        bids: [
          {bidder: 'sampleBidder', params: {placementId: 'banner-only-bidder'}}
        ]
      }];
      adUnitCodes = ['adUnit-code'];
      let auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: TIMEOUT});
      createAuctionStub = sinon.stub(auctionModule, 'newAuction');
      createAuctionStub.returns(auction);

      init(config, [pubCommonIdSubmodule, unifiedIdSubmodule]);

      registerBidder(sampleSpec);
    });

    afterEach(function () {
      auctionModule.newAuction.restore();
      storageResetCount++;
    });

    it('test hook from pubcommonid cookie', function() {
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [createStorageConfig('pubCommonId', 'pubcid', 'cookie')]
        }
      });

      $$PREBID_GLOBAL$$.requestBids({adUnits});

      adUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(`testpubcid${storageResetCount}`);
        });
      });
    });

    it('test hook from pubcommonid config value object', function() {
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [{
            name: 'pubCommonId',
            value: {'pubcidvalue': 'testpubcidvalue'}
          }]}
      });

      $$PREBID_GLOBAL$$.requestBids({adUnits});

      adUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.pubcidvalue');
          expect(bid.userId.pubcidvalue).to.equal('testpubcidvalue');
        });
      });
    });

    it('test hook from pubcommonid html5', function() {
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [createStorageConfig('unifiedId', 'unifiedid_alt', 'html5')]}
      });

      $$PREBID_GLOBAL$$.requestBids({adUnits});

      adUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('userId.tdid');
          expect(bid.userId.tdid).to.equal(`testunifiedid_alt${storageResetCount}`);
        });
      });
    });

    it('test hook when both pubCommonId and unifiedId have data to pass', function() {
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [
            createStorageConfig('pubCommonId', 'pubcid', 'cookie'),
            createStorageConfig('unifiedId', 'unifiedid', 'cookie')
          ]}
      });

      $$PREBID_GLOBAL$$.requestBids({adUnits});

      adUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          // verify that the PubCommonId id data was copied to bid
          expect(bid).to.have.deep.nested.property('userId.pubcid');
          expect(bid.userId.pubcid).to.equal(`testpubcid${storageResetCount}`);

          // also check that UnifiedId id data was copied to bid
          expect(bid).to.have.deep.nested.property('userId.tdid');
          expect(bid.userId.tdid).to.equal(`testunifiedid${storageResetCount}`);
        });
      });
    });

    it('test that hook does not add a userId property if not submodule data was available', function() {
      config.setConfig({
        usersync: {
          syncDelay: 0,
          userIds: [createStorageConfig('unifiedId', 'unifiedid', 'html5')]}
      });

      $$PREBID_GLOBAL$$.requestBids({adUnits});

      // unifiedId configured to execute callback to load user id data after the auction ends
      const submodulesWithCallbacks = submodules.filter(item => (typeof item.callback === 'function' && typeof item.idObj === 'undefined'));
      expect(submodulesWithCallbacks.length).to.equal(1);
      expect(submodulesWithCallbacks[0].submodule).to.equal(unifiedIdSubmodule);

      adUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(typeof bid.userId).to.equal('undefined');
        });
      });
    });
  });
});
