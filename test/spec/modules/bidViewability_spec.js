import * as bidViewability from 'modules/bidViewability.js';
import { config } from 'src/config.js';
import * as events from 'src/events.js';
import * as utils from 'src/utils.js';
import * as sinon from 'sinon';
import {expect, spy} from 'chai';
import * as prebidGlobal from 'src/prebidGlobal.js';
import CONSTANTS from 'src/constants.json';
import adapterManager, { gdprDataHandler, uspDataHandler } from 'src/adapterManager.js';
import parse from 'url-parse';

const GPT_SLOT = {
  getAdUnitPath() {
    return '/harshad/Jan/2021/';
  },

  getSlotElementId() {
    return 'DIV-1';
  }
};

const PBJS_WINNING_BID = {
  'adUnitCode': '/harshad/Jan/2021/',
  'bidderCode': 'pubmatic',
  'bidder': 'pubmatic',
  'width': 300,
  'height': 250,
  'statusMessage': 'Bid available',
  'adId': 'id',
  'requestId': 1024,
  'source': 'client',
  'no_bid': false,
  'cpm': '1.1495',
  'ttl': 180,
  'creativeId': 'id',
  'netRevenue': true,
  'currency': 'USD',
  'vurls': [
    'https://domain-1.com/end-point?a=1',
    'https://domain-2.com/end-point/',
    'https://domain-3.com/end-point?a=1'
  ]
};

describe('#bidViewability', function() {
  let gptSlot;
  let pbjsWinningBid;

  beforeEach(function() {
    gptSlot = Object.assign({}, GPT_SLOT);
    pbjsWinningBid = Object.assign({}, PBJS_WINNING_BID);
  });

  describe('isBidAdUnitCodeMatchingSlot', function() {
    it('match found by GPT Slot getAdUnitPath', function() {
      expect(bidViewability.isBidAdUnitCodeMatchingSlot(pbjsWinningBid, gptSlot)).to.equal(true);
    });

    it('match found by GPT Slot getSlotElementId', function() {
      pbjsWinningBid.adUnitCode = 'DIV-1';
      expect(bidViewability.isBidAdUnitCodeMatchingSlot(pbjsWinningBid, gptSlot)).to.equal(true);
    });

    it('match not found', function() {
      pbjsWinningBid.adUnitCode = 'DIV-10';
      expect(bidViewability.isBidAdUnitCodeMatchingSlot(pbjsWinningBid, gptSlot)).to.equal(false);
    });
  });

  describe('getMatchingWinningBidForGPTSlot', function() {
    let winningBidsArray;
    let sandbox
    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      // mocking winningBidsArray
      winningBidsArray = [];
      sandbox.stub(prebidGlobal, 'getGlobal').returns({
        getAllWinningBids: function (number) {
          return winningBidsArray;
        }
      });
    });

    afterEach(function() {
      sandbox.restore();
    })

    it('should find a match by using customMatchFunction provided in config', function() {
      // Needs config to be passed with customMatchFunction
      let bidViewabilityConfig = {
        customMatchFunction(bid, slot) {
          return ('AD-' + slot.getAdUnitPath()) === bid.adUnitCode;
        }
      };
      let newWinningBid = Object.assign({}, PBJS_WINNING_BID, {adUnitCode: 'AD-' + PBJS_WINNING_BID.adUnitCode});
      // Needs pbjs.getWinningBids to be implemented with match
      winningBidsArray.push(newWinningBid);
      let wb = bidViewability.getMatchingWinningBidForGPTSlot(bidViewabilityConfig, gptSlot);
      expect(wb).to.deep.equal(newWinningBid);
    });

    it('should NOT find a match by using customMatchFunction provided in config', function() {
      // Needs config to be passed with customMatchFunction
      let bidViewabilityConfig = {
        customMatchFunction(bid, slot) {
          return ('AD-' + slot.getAdUnitPath()) === bid.adUnitCode;
        }
      };
      // Needs pbjs.getWinningBids to be implemented without match; winningBidsArray is set to empty in beforeEach
      let wb = bidViewability.getMatchingWinningBidForGPTSlot(bidViewabilityConfig, gptSlot);
      expect(wb).to.equal(null);
    });

    it('should find a match by using default matching function', function() {
      // Needs config to be passed without customMatchFunction
      // Needs pbjs.getWinningBids to be implemented with match
      winningBidsArray.push(PBJS_WINNING_BID);
      let wb = bidViewability.getMatchingWinningBidForGPTSlot({}, gptSlot);
      expect(wb).to.deep.equal(PBJS_WINNING_BID);
    });

    it('should NOT find a match by using default matching function', function() {
      // Needs config to be passed without customMatchFunction
      // Needs pbjs.getWinningBids to be implemented without match; winningBidsArray is set to empty in beforeEach
      let wb = bidViewability.getMatchingWinningBidForGPTSlot({}, gptSlot);
      expect(wb).to.equal(null);
    });
  });

  describe('fireViewabilityPixels', function() {
    let sandbox;
    let triggerPixelSpy;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      triggerPixelSpy = sandbox.spy(utils, ['triggerPixel']);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('DO NOT fire pixels if NOT mentioned in module config', function() {
      let moduleConfig = {};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      expect(triggerPixelSpy.callCount).to.equal(0);
    });

    it('fire pixels if mentioned in module config', function() {
      let moduleConfig = {firePixels: true};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0]).to.equal(url);
      });
    });

    it('USP: should include the us_privacy key when USP Consent is available', function () {
      let uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
      uspDataHandlerStub.returns('1YYY');
      let moduleConfig = {firePixels: true};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0].indexOf(url)).to.equal(0);
        const testurl = parse(call.args[0]);
        const queryObject = utils.parseQS(testurl.query);
        expect(queryObject.us_privacy).to.equal('1YYY');
      });
      uspDataHandlerStub.restore();
    });

    it('USP: should not include the us_privacy key when USP Consent is not available', function () {
      let moduleConfig = {firePixels: true};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0].indexOf(url)).to.equal(0);
        const testurl = parse(call.args[0]);
        const queryObject = utils.parseQS(testurl.query);
        expect(queryObject.us_privacy).to.equal(undefined);
      });
    });

    it('GDPR: should include the GDPR keys when GDPR Consent is available', function() {
      let gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      gdprDataHandlerStub.returns({
        gdprApplies: true,
        consentString: 'consent',
        addtlConsent: 'moreConsent'
      });
      let moduleConfig = {firePixels: true};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0].indexOf(url)).to.equal(0);
        const testurl = parse(call.args[0]);
        const queryObject = utils.parseQS(testurl.query);
        expect(queryObject.gdpr).to.equal('1');
        expect(queryObject.gdpr_consent).to.equal('consent');
        expect(queryObject.addtl_consent).to.equal('moreConsent');
      });
      gdprDataHandlerStub.restore();
    });

    it('GDPR: should not include the GDPR keys when GDPR Consent is not available', function () {
      let moduleConfig = {firePixels: true};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0].indexOf(url)).to.equal(0);
        const testurl = parse(call.args[0]);
        const queryObject = utils.parseQS(testurl.query);
        expect(queryObject.gdpr).to.equal(undefined);
        expect(queryObject.gdpr_consent).to.equal(undefined);
        expect(queryObject.addtl_consent).to.equal(undefined);
      });
    });

    it('GDPR: should only include the GDPR keys for GDPR Consent fields with values', function () {
      let gdprDataHandlerStub = sinon.stub(gdprDataHandler, 'getConsentData');
      gdprDataHandlerStub.returns({
        gdprApplies: true,
        consentString: 'consent'
      });
      let moduleConfig = {firePixels: true};
      bidViewability.fireViewabilityPixels(moduleConfig, PBJS_WINNING_BID);
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0].indexOf(url)).to.equal(0);
        const testurl = parse(call.args[0]);
        const queryObject = utils.parseQS(testurl.query);
        expect(queryObject.gdpr).to.equal('1');
        expect(queryObject.gdpr_consent).to.equal('consent');
        expect(queryObject.addtl_consent).to.equal(undefined);
      });
      gdprDataHandlerStub.restore();
    })
  });

  describe('impressionViewableHandler', function() {
    let sandbox;
    let triggerPixelSpy;
    let eventsEmitSpy;
    let logWinningBidNotFoundSpy;
    let callBidViewableBidderSpy;
    let winningBidsArray;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      triggerPixelSpy = sandbox.spy(utils, ['triggerPixel']);
      eventsEmitSpy = sandbox.spy(events, ['emit']);
      callBidViewableBidderSpy = sandbox.spy(adapterManager, ['callBidViewableBidder']);
      // mocking winningBidsArray
      winningBidsArray = [];
      sandbox.stub(prebidGlobal, 'getGlobal').returns({
        getAllWinningBids: function (number) {
          return winningBidsArray;
        }
      });
    });

    afterEach(function() {
      sandbox.restore();
    })

    it('matching winning bid is found', function() {
      let moduleConfig = {
        firePixels: true
      };
      winningBidsArray.push(PBJS_WINNING_BID);
      bidViewability.impressionViewableHandler(moduleConfig, GPT_SLOT, null);
      // fire pixels should be called
      PBJS_WINNING_BID.vurls.forEach((url, i) => {
        let call = triggerPixelSpy.getCall(i);
        expect(call.args[0]).to.equal(url);
      });
      // adapterManager.callBidViewableBidder is called with required args
      let call = callBidViewableBidderSpy.getCall(0);
      expect(call.args[0]).to.equal(PBJS_WINNING_BID.bidder);
      expect(call.args[1]).to.deep.equal(PBJS_WINNING_BID);
      // CONSTANTS.EVENTS.BID_VIEWABLE is triggered
      call = eventsEmitSpy.getCall(0);
      expect(call.args[0]).to.equal(CONSTANTS.EVENTS.BID_VIEWABLE);
      expect(call.args[1]).to.deep.equal(PBJS_WINNING_BID);
    });

    it('matching winning bid is NOT found', function() {
      // fire pixels should NOT be called
      expect(triggerPixelSpy.callCount).to.equal(0);
      // adapterManager.callBidViewableBidder is NOT called
      expect(callBidViewableBidderSpy.callCount).to.equal(0);
      // CONSTANTS.EVENTS.BID_VIEWABLE is NOT triggered
      expect(eventsEmitSpy.callCount).to.equal(0);
    });
  });
});
