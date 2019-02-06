import {
  requestBidHook,
  getCookie,
  setCookie,
  setConfig,
  isPubcidEnabled,
  getExpInterval,
  initPubcid } from 'modules/pubCommonId';
import { getAdUnits } from 'test/fixtures/fixtures';
import * as auctionModule from 'src/auction';
import { registerBidder } from 'src/adapters/bidderFactory';
import * as utils from 'src/utils';

var assert = require('chai').assert;
var expect = require('chai').expect;

const COOKIE_NAME = '_pubcid';
const TIMEOUT = 2000;

describe('Publisher Common ID', function () {
  afterEach(function () {
    $$PREBID_GLOBAL$$.requestBids.removeAll();
  });
  describe('Decorate adUnits', function () {
    before(function() {
      window.document.cookie = COOKIE_NAME + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    });

    it('Check same cookie', function () {
      let adUnits1 = getAdUnits();
      let adUnits2 = getAdUnits();
      let innerAdUnits1;
      let innerAdUnits2;
      let pubcid = getCookie(COOKIE_NAME);

      expect(pubcid).to.be.null; // there should be no cookie initially

      requestBidHook((config) => { innerAdUnits1 = config.adUnits }, {adUnits: adUnits1});
      pubcid = getCookie(COOKIE_NAME); // cookies is created after requestbidHook

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid);
        });
      });
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
      pubcid1 = getCookie(COOKIE_NAME); // get first cookie
      setCookie(COOKIE_NAME, '', -1); // erase cookie

      innerAdUnits1.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid1);
        });
      });

      requestBidHook((config) => { innerAdUnits2 = config.adUnits }, {adUnits: adUnits2});
      pubcid2 = getCookie(COOKIE_NAME); // get second cookie

      innerAdUnits2.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid2);
        });
      });

      expect(pubcid1).to.not.equal(pubcid2);
    });

    it('Check new cookie', function () {
      let adUnits = getAdUnits();
      let innerAdUnits;
      let pubcid = utils.generateUUID();

      setCookie(COOKIE_NAME, pubcid, 600);
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid);
        });
      });
    });
  });

  describe('Configuration', function () {
    it('empty config', function () {
      // this should work as usual
      setConfig({});
      let adUnits = getAdUnits();
      let innerAdUnits;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      let pubcid = getCookie(COOKIE_NAME);
      innerAdUnits.forEach((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
          expect(bid.crumbs.pubcid).to.equal(pubcid);
        });
      });
    });

    it('disable', function () {
      setConfig({enable: false});
      setCookie(COOKIE_NAME, '', -1); // erase cookie
      let adUnits = getAdUnits();
      let unmodified = getAdUnits();
      let innerAdUnits;
      expect(isPubcidEnabled()).to.be.false;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      expect(getCookie(COOKIE_NAME)).to.be.null;
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
      setCookie(COOKIE_NAME, '', -1); // erase cookie
      expect(getExpInterval()).to.equal(100);
      let adUnits = getAdUnits();
      let innerAdUnits;
      requestBidHook((config) => { innerAdUnits = config.adUnits }, {adUnits});
      innerAdUnits.every((unit) => {
        unit.bids.forEach((bid) => {
          expect(bid).to.have.deep.nested.property('crumbs.pubcid');
        });
      })
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
});
