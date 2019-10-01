import {
  requestBidHook,
  getCookie,
  setCookie,
  setConfig,
  isPubcidEnabled,
  getExpInterval,
  initPubcid,
  setStorageItem,
  getStorageItem,
  removeStorageItem,
  getPubcidConfig } from 'modules/pubCommonId';
import { getAdUnits } from 'test/fixtures/fixtures';
import * as auctionModule from 'src/auction';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

var assert = require('chai').assert;
var expect = require('chai').expect;

const ID_NAME = '_pubcid';
const EXP = '_exp';
const TIMEOUT = 2000;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89a-f][0-9a-f]{3}-[0-9a-f]{12}$/;

function cleanUp() {
  window.document.cookie = ID_NAME + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  localStorage.removeItem(ID_NAME);
  localStorage.removeItem(ID_NAME + EXP);
}

describe('Publisher Common ID', function () {
  afterEach(function () {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
  });
  describe('Decorate adUnits', function () {
    beforeEach(function() {
      cleanUp();
    });
    afterEach(function() {
      cleanUp();
    });

    it('Check same cookie', function () {
      let adUnits1 = getAdUnits();
      let adUnits2 = getAdUnits();
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid;

      expect(getCookie(ID_NAME)).to.be.null; // there should be no cookie initially
      expect(localStorage.getItem(ID_NAME)).to.be.null; // there should be no local storage item either

      requestBidHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid = localStorage.getItem(ID_NAME); // local storage item is created after requestbidHook

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid);
        });
      });

      // verify cookie is null
      expect(getCookie(ID_NAME)).to.be.null;

      // verify same pubcid is preserved
      requestBidHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
      assert.deepEqual(innerAdUnits1, innerAdUnits2);
    });

    it('Check different cookies', function () {
      let adUnits1 = getAdUnits();
      let adUnits2 = getAdUnits();
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid1;
      let pubcid2;

      requestBidHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid1 = localStorage.getItem(ID_NAME); // get first pubcid
      removeStorageItem(ID_NAME); // remove storage

      expect(pubcid1).to.not.be.null;

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid1);
        });
      });

      requestBidHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
      pubcid2 = localStorage.getItem(ID_NAME); // get second pubcid

      innerAdUnits2.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid2);
        });
      });

      expect(pubcid2).to.not.be.null;
      expect(pubcid1).to.not.equal(pubcid2);
    });

    it('Check new cookie', function () {
      let adUnits = getAdUnits();
      let innerAdUnits;
      let pubcid = utils.generateUUID();

      setCookie(ID_NAME, pubcid, 600);
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid);
        });
      });
    });

    it('Replicate cookie to storage', function() {
      let adUnits = getAdUnits();
      let innerAdUnits;
      let pubcid = utils.generateUUID();

      setCookie(ID_NAME, pubcid, 600);
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(getStorageItem(ID_NAME)).to.equal(pubcid);
    });

    it('Does not replicate storage to cookie', function() {
      let adUnits = getAdUnits();
      let innerAdUnits;
      let pubcid = utils.generateUUID();

      setStorageItem(ID_NAME, pubcid, 600);
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(getCookie(ID_NAME)).to.be.null;
    });

    it('Cookie only', function() {
      setConfig({type: 'cookie'});
      let adUnits = getAdUnits();
      let innerAdUnits;

      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(getCookie(ID_NAME)).to.match(uuidPattern);
      expect(getStorageItem(ID_NAME)).to.be.null;
    });

    it('Storage only', function() {
      setConfig({type: 'html5'});
      let adUnits = getAdUnits();
      let innerAdUnits;

      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(getCookie(ID_NAME)).to.be.null;
      expect(getStorageItem(ID_NAME)).to.match(uuidPattern);
    });

    it('Bad id recovery', function() {
      let adUnits = getAdUnits();
      let innerAdUnits;

      setStorageItem(ID_NAME, 'undefined', 600);
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      expect(getStorageItem(ID_NAME)).to.match(uuidPattern);
    });
  });

  describe('Configuration', function () {
    beforeEach(() => {
      setConfig();
      cleanUp();
    });
    afterEach(() => {
      setConfig();
      cleanUp();
    });

    it('empty config', function () {
      // this should work as usual
      setConfig({});
      let adUnits = getAdUnits();
      let innerAdUnits;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      let pubcid = localStorage.getItem(ID_NAME);
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid);
        });
      });
    });

    it('disable', function () {
      setConfig({enable: false});
      let adUnits = getAdUnits();
      let unmodified = getAdUnits();
      let innerAdUnits;
      expect(isPubcidEnabled()).to.be.false;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      expect(getCookie(ID_NAME)).to.be.null;
      assert.deepEqual(innerAdUnits, unmodified);
      setConfig({enable: true}); // reset
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
        });
      });
    });

    it('change expiration time', function () {
      setConfig({expInterval: 100});
      expect(getExpInterval()).to.equal(100);
      let adUnits = getAdUnits();
      let innerAdUnits;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.every((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
        });
      });
    });

    it('read only', function() {
      setConfig({
        readOnly: true
      });

      const config = getPubcidConfig();
      expect(config.readOnly).to.be.true;
      expect(config.typeEnabled).to.equal('html5');

      let adUnits = getAdUnits();
      let innerAdUnits;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});

      const pubcid = localStorage.getItem(ID_NAME);
      expect(pubcid).to.be.null;
    });
  });

  describe('Invoking requestBid', function () {
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

    beforeEach(function () {
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
      initPubcid();
      registerBidder(sampleSpec);
    });

    afterEach(function () {
      auctionModule.newAuction.restore();
    });

    it('test hook', function() {
      $$PREBID_GLOBAL$$.requestBids({adUnits});
      adUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
        });
      });
    });
  });

  describe('Storage item functions', () => {
    beforeEach(() => { cleanUp(); });
    afterEach(() => { cleanUp(); });

    it('Test set', () => {
      const key = ID_NAME;
      const val = 'test-set-value';
      // Set item in localStorage
      const now = Date.now();
      setStorageItem(key, val, 100);
      // Check both item and expiry time are stored
      const expVal = localStorage.getItem(key + EXP);
      const storedVal = localStorage.getItem(key);
      // Verify expiry
      expect(expVal).to.not.be.null;
      const expDate = new Date(expVal);
      expect((expDate.getTime() - now) / 1000).to.be.closeTo(100 * 60, 5);
      // Verify value
      expect(storedVal).to.equal(val);
    });

    it('Test get and remove', () => {
      const key = ID_NAME;
      const val = 'test-get-remove';
      setStorageItem(key, val, 10);
      expect(getStorageItem(key)).to.equal(val);
      removeStorageItem(key);
      expect(getStorageItem(key)).to.be.null;
    });

    it('Test expiry', () => {
      const key = ID_NAME;
      const val = 'test-expiry';
      setStorageItem(key, val, -1);
      expect(localStorage.getItem(key)).to.equal(val);
      expect(getStorageItem(key)).to.be.null;
      expect(localStorage.getItem(key)).to.be.null;
    });
  });
});
