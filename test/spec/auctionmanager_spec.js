import { auctionManager, newAuctionManager } from 'src/auctionManager';
import { getKeyValueTargetingPairs } from 'src/auction';
import CONSTANTS from 'src/constants.json';
import { adjustBids } from 'src/auction';
import * as auctionModule from 'src/auction';
import { newBidder, registerBidder } from 'src/adapters/bidderFactory';
import * as ajaxLib from 'src/ajax';

var assert = require('assert');

/* use this method to test individual files instead of the whole prebid.js project */

// TODO refactor to use the spec files
var utils = require('../../src/utils');
var bidfactory = require('../../src/bidfactory');
var fixtures = require('../fixtures/fixtures');
var adaptermanager = require('src/adaptermanager');
var events = require('src/events');

function timestamp() {
  return new Date().getTime();
}

describe('auctionmanager.js', function () {
  describe('getKeyValueTargetingPairs', function () {
    var bid = {};
    var bidPriceCpm = 5.578;
    var bidPbLg = 5.50;
    var bidPbMg = 5.50;
    var bidPbHg = 5.57;
    var bidPbAg = 5.50;

    var adUnitCode = '12345';
    var bidderCode = 'appnexus';
    var size = '300x250';
    var adId = '1adId';
    var source = 'client';

    before(function () {
      bid.cpm = bidPriceCpm;
      bid.pbLg = bidPbLg;
      bid.pbMg = bidPbMg;
      bid.pbHg = bidPbHg;
      bid.pbAg = bidPbAg;

      bid.height = 300;
      bid.width = 250;
      bid.adUnitCode = adUnitCode;
      bid.getSize = function () {
        return this.height + 'x' + this.width;
      };
      bid.bidderCode = bidderCode;
      bid.adId = adId;
      bid.source = source;
    });

    it('No bidder level configuration defined - default', function () {
      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbMg,
        'hb_size': size,
        'hb_source': source
      };
      var response = getKeyValueTargetingPairs(bidderCode, bid, CONSTANTS.GRANULARITY_OPTIONS.MEDIUM);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for all bidders', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            },
            {
              key: 'hb_source',
              val: function (bidResponse) {
                return bidResponse.source;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbHg,
        'hb_size': size,
        'hb_source': source
      };
      var response = getKeyValueTargetingPairs(bidderCode, bid, CONSTANTS.GRANULARITY_OPTIONS.MEDIUM);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbHg,
        'hb_size': size,
        'hb_source': source
      };
      var response = getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder - not matched', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        nonExistentBidder: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': bidPbMg,
        'hb_size': size,
        'hb_source': source
      };
      var response = getKeyValueTargetingPairs(bidderCode, bid, CONSTANTS.GRANULARITY_OPTIONS.MEDIUM);
      assert.deepEqual(response, expected);
    });

    it('Custom bidCpmAdjustment for one bidder and inherit standard but doesn\'t use standard bidCpmAdjustment', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
        },
        standard: {
          bidCpmAdjustment: function (bidCpm) {
            return 200;
          },
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 10.00;
              }
            }
          ]

        }
      };

      var expected = { 'hb_bidder': bidderCode, 'hb_adid': adId, 'hb_pb': 10.0 };
      var response = getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Standard bidCpmAdjustment changes the bid of any bidder', function () {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      assert.equal(bid.cpm, 0.5);

      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.5;
          }
        }
      };

      adjustBids(bid)
      assert.equal(bid.cpm, 0.25);
    });

    it('Custom bidCpmAdjustment AND custom configuration for one bidder and inherit standard settings', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          bidCpmAdjustment: function (bidCpm) {
            return bidCpm * 0.7;
          },
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 15.00;
              }
            }
          ]
        },
        standard: {
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                // change default here
                return 10.00;
              },
            },
            {
              key: 'hb_size',
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': 15.0,
        'hb_size': '300x250'
      };
      var response = getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('sendStandardTargeting=false, and inherit custom', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          sendStandardTargeting: false,
          adserverTargeting: [
            {
              key: 'hb_bidder',
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: 'hb_adid',
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: 'hb_pb',
              val: function (bidResponse) {
                return bidResponse.pbHg;
              }
            }
          ]
        }
      };

      var expected = {
        'hb_bidder': bidderCode,
        'hb_adid': adId,
        'hb_pb': 5.57,
        'hb_size': '300x250',
        'hb_source': source
      };
      var response = getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
      assert.equal(bid.sendStandardTargeting, false);
    });

    it('suppressEmptyKeys=true', function() {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          suppressEmptyKeys: true,
          adserverTargeting: [
            {
              key: 'aKeyWithAValue',
              val: 42
            },
            {
              key: 'aKeyWithAnEmptyValue',
              val: ''
            }
          ]
        }
      };

      var expected = {
        'aKeyWithAValue': 42
      };

      var response = getKeyValueTargetingPairs(bidderCode, bid);
      assert.deepEqual(response, expected);
    });
  });

  describe('adjustBids', () => {
    it('should adjust bids if greater than zero and pass copy of bid object', () => {
      const bid = Object.assign({},
        bidfactory.createBid(2),
        fixtures.getBidResponses()[5]
      );

      assert.equal(bid.cpm, 0.5);

      $$PREBID_GLOBAL$$.bidderSettings =
      {
        brealtime: {
          bidCpmAdjustment: function (bidCpm, bidObj) {
            assert.deepEqual(bidObj, bid);
            if (bidObj.adUnitCode === 'negative') {
              return bidCpm * -0.5;
            }
            if (bidObj.adUnitCode === 'zero') {
              return 0;
            }
            return bidCpm * 0.5;
          },
        },
        standard: {
          adserverTargeting: [
          ]
        }
      };

      // negative
      bid.adUnitCode = 'negative';
      adjustBids(bid)
      assert.equal(bid.cpm, 0.5);

      // positive
      bid.adUnitCode = 'normal';
      adjustBids(bid)
      assert.equal(bid.cpm, 0.25);

      // zero
      bid.adUnitCode = 'zero';
      adjustBids(bid)
      assert.equal(bid.cpm, 0);

      // reset bidderSettings so we don't mess up further tests
      $$PREBID_GLOBAL$$.bidderSettings = {};
    });
  });

  describe('addBidResponse', () => {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let auction;
    let ajaxStub;
    const BIDDER_CODE = 'sampleBidder';
    let makeRequestsStub;
    let bids = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'bidderCode': BIDDER_CODE,
      'requestId': '4d0a6829338a07',
      'creativeId': 'id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];

    let bidRequests = [{
      'bidderCode': BIDDER_CODE,
      'auctionId': '20882439e3238c',
      'bidderRequestId': '331f3cf3f1d9c8',
      'bids': [
        {
          'bidder': BIDDER_CODE,
          'params': {
            'placementId': 'id'
          },
          'adUnitCode': 'adUnit-code',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4d0a6829338a07',
          'bidderRequestId': '331f3cf3f1d9c8',
          'auctionId': '20882439e3238c'
        }
      ],
      'auctionStart': 1505250713622,
      'timeout': 3000
    }];

    before(() => {
      makeRequestsStub = sinon.stub(adaptermanager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);

      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder', function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success('response body', { getResponseHeader: fakeResponse });
        }
      });
    });

    after(() => {
      ajaxStub.restore();
      adaptermanager.makeBidRequests.restore();
    });

    describe('when auction timeout is 3000', () => {
      beforeEach(() => {
        adUnits = [{
          code: 'adUnit-code',
          bids: [
            {bidder: BIDDER_CODE, params: {placementId: 'id'}},
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);

        spec = {
          code: BIDDER_CODE,
          isBidRequestValid: sinon.stub(),
          buildRequests: sinon.stub(),
          interpretResponse: sinon.stub(),
          getUserSyncs: sinon.stub()
        };
      });

      afterEach(() => {
        auctionModule.newAuction.restore();
      });

      it('should return proper price bucket increments for dense mode when cpm is in range 0-3', () => {
        bids[0].cpm = '1.99';
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.pbDg, '1.99', '0 - 3 hits at to 1 cent increment');
      });

      it('should return proper price bucket increments for dense mode when cpm is in range 3-8', () => {
        bids[0].cpm = '4.39';
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.pbDg, '4.35', '3 - 8 hits at 5 cent increment');
      });

      it('should return proper price bucket increments for dense mode when cpm is in range 8-20', () => {
        bids[0].cpm = '19.99';
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.pbDg, '19.50', '8 - 20 hits at 50 cent increment');
      });

      it('should return proper price bucket increments for dense mode when cpm is 20+', () => {
        bids[0].cpm = '73.07';
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.pbDg, '20.00', '20+ caps at 20.00');
      });

      it('should place dealIds in adserver targeting', () => {
        bids[0].dealId = 'test deal';
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.adserverTargeting[`hb_deal`], 'test deal', 'dealId placed in adserverTargeting');
      });

      it('should pass through default adserverTargeting sent from adapter', () => {
        bids[0].adserverTargeting = {};
        bids[0].adserverTargeting.extra = 'stuff';
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.adserverTargeting.hb_bidder, 'sampleBidder');
        assert.equal(registeredBid.adserverTargeting.extra, 'stuff');
      });

      it('installs publisher-defined renderers on bids', () => {
        let bidRequests = [{
          'bidderCode': BIDDER_CODE,
          'auctionId': '20882439e3238c',
          'bidderRequestId': '331f3cf3f1d9c8',
          'bids': [
            {
              'bidder': BIDDER_CODE,
              'params': {
                'placementId': 'id'
              },
              'adUnitCode': 'adUnit-code',
              'sizes': [[300, 250], [300, 600]],
              'bidId': '4d0a6829338a07',
              'bidderRequestId': '331f3cf3f1d9c8',
              'auctionId': '20882439e3238c',
              'renderer': {
                url: 'renderer.js',
                render: (bid) => bid
              }
            }
          ],
          'auctionStart': 1505250713622,
          'timeout': 3000
        }];

        makeRequestsStub.returns(bidRequests);
        let bids1 = Object.assign({},
          bids[0],
          {
            bidderCode: BIDDER_CODE,
            mediaType: 'video-outstream',
          }
        );
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids1);
        auction.callBids();
        const addedBid = auction.getBidsReceived().pop();
        assert.equal(addedBid.renderer.url, 'renderer.js');
      });
    });

    describe('with auction timeout 20', () => {
      let auction;
      let adUnits;
      let adUnitCodes;
      let createAuctionStub;
      let spec;
      let getBidderRequestStub;
      let eventsEmitSpy;

      beforeEach(() => {
        adUnits = [{
          code: 'adUnit-code',
          bids: [
            {bidder: BIDDER_CODE, params: {placementId: 'id'}},
          ]
        }];
        adUnitCodes = ['adUnit-code'];
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 20});
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);
        getBidderRequestStub = sinon.stub(utils, 'getBidderRequest');

        let newBidRequest = Object.assign({}, bidRequests[0], {'start': 1000});
        getBidderRequestStub.returns(newBidRequest);

        spec = {
          code: BIDDER_CODE,
          isBidRequestValid: sinon.stub(),
          buildRequests: sinon.stub(),
          interpretResponse: sinon.stub(),
          getUserSyncs: sinon.stub()
        };
        eventsEmitSpy = sinon.spy(events, 'emit');
      });

      afterEach(() => {
        auctionModule.newAuction.restore();
        utils.getBidderRequest.restore();
        events.emit.restore();
      });

      it('should emit BID_TIMEOUT for timed out bids', () => {
        registerBidder(spec);
        spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
        spec.isBidRequestValid.returns(true);
        spec.interpretResponse.returns(bids);
        auction.callBids();
        assert.ok(eventsEmitSpy.calledWith(CONSTANTS.EVENTS.BID_TIMEOUT), 'emitted events BID_TIMEOUT');
      });
    });
  });

  describe('addBidResponse', () => {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let spec1;
    let auction;
    let ajaxStub;
    const BIDDER_CODE = 'sampleBidder';
    const BIDDER_CODE1 = 'sampleBidder1';

    let makeRequestsStub;
    let bids = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'bidderCode': BIDDER_CODE,
      'requestId': '4d0a6829338a07',
      'creativeId': 'id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];

    let bids1 = [{
      'ad': 'creative',
      'cpm': '1.99',
      'width': 300,
      'height': 250,
      'bidderCode': BIDDER_CODE1,
      'requestId': '5d0a6829338a07',
      'creativeId': 'id',
      'currency': 'USD',
      'netRevenue': true,
      'ttl': 360
    }];

    let bidRequests = [{
      'bidderCode': BIDDER_CODE,
      'auctionId': '20882439e3238c',
      'bidderRequestId': '331f3cf3f1d9c8',
      'bids': [
        {
          'bidder': BIDDER_CODE,
          'params': {
            'placementId': 'id'
          },
          'adUnitCode': 'adUnit-code',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '4d0a6829338a07',
          'bidderRequestId': '331f3cf3f1d9c8',
          'auctionId': '20882439e3238c'
        }
      ],
      'auctionStart': 1505250713622,
      'timeout': 3000
    }, {
      'bidderCode': BIDDER_CODE1,
      'auctionId': '20882439e3238c',
      'bidderRequestId': '661f3cf3f1d9c8',
      'bids': [
        {
          'bidder': BIDDER_CODE1,
          'params': {
            'placementId': 'id'
          },
          'adUnitCode': 'adUnit-code-1',
          'sizes': [[300, 250], [300, 600]],
          'bidId': '5d0a6829338a07',
          'bidderRequestId': '661f3cf3f1d9c8',
          'auctionId': '20882439e3238c'
        }
      ],
      'auctionStart': 1505250713623,
      'timeout': 3000
    }];

    before(() => {
      makeRequestsStub = sinon.stub(adaptermanager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);

      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder', function() {
        return function(url, callback) {
          const fakeResponse = sinon.stub();
          fakeResponse.returns('headerContent');
          callback.success('response body', { getResponseHeader: fakeResponse });
        }
      });
    });

    after(() => {
      ajaxStub.restore();
      adaptermanager.makeBidRequests.restore();
    });

    beforeEach(() => {
      adUnits = [{
        code: 'adUnit-code',
        bids: [
          {bidder: BIDDER_CODE, params: {placementId: 'id'}},
        ]
      }, {
        code: 'adUnit-code-1',
        bids: [
          {bidder: BIDDER_CODE1, params: {placementId: 'id'}},
        ]
      }];
      adUnitCodes = ['adUnit-code', 'adUnit-code-1'];
      auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
      createAuctionStub = sinon.stub(auctionModule, 'newAuction');
      createAuctionStub.returns(auction);

      spec = {
        code: BIDDER_CODE,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub()
      };

      spec1 = {
        code: BIDDER_CODE1,
        isBidRequestValid: sinon.stub(),
        buildRequests: sinon.stub(),
        interpretResponse: sinon.stub(),
        getUserSyncs: sinon.stub()
      };
    });

    afterEach(() => {
      auctionModule.newAuction.restore();
    });

    it('should not alter bid adID', () => {
      registerBidder(spec);
      registerBidder(spec1);

      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);

      spec1.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec1.isBidRequestValid.returns(true);
      spec1.interpretResponse.returns(bids1);

      auction.callBids();

      const addedBid2 = auction.getBidsReceived().pop();
      assert.equal(addedBid2.adId, bids1[0].requestId);
      const addedBid1 = auction.getBidsReceived().pop();
      assert.equal(addedBid1.adId, bids[0].requestId);
    });

    it('should not add banner bids that have no width or height', () => {
      bids1[0].width = undefined;
      bids1[0].height = undefined;

      registerBidder(spec);
      registerBidder(spec1);

      spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec.isBidRequestValid.returns(true);
      spec.interpretResponse.returns(bids);

      spec1.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
      spec1.isBidRequestValid.returns(true);
      spec1.interpretResponse.returns(bids1);

      auction.callBids();

      let length = auction.getBidsReceived().length;
      const addedBid2 = auction.getBidsReceived().pop();
      assert.notEqual(addedBid2.adId, bids1[0].requestId);
      assert.equal(length, 1);
    });
  });
});
