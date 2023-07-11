import {
  getKeyValueTargetingPairs,
  auctionCallbacks,
  AUCTION_COMPLETED,
  adjustBids,
  getMediaTypeGranularity,
  getPriceByGranularity,
  addBidResponse
} from 'src/auction.js';
import CONSTANTS from 'src/constants.json';
import * as auctionModule from 'src/auction.js';
import { registerBidder } from 'src/adapters/bidderFactory.js';
import { createBid } from 'src/bidfactory.js';
import { config } from 'src/config.js';
import * as store from 'src/videoCache.js';
import * as ajaxLib from 'src/ajax.js';
import {find} from 'src/polyfill.js';
import { server } from 'test/mocks/xhr.js';
import {hook} from '../../src/hook.js';
import {auctionManager} from '../../src/auctionManager.js';
import 'modules/debugging/index.js' // some tests look for debugging side effects
import {AuctionIndex} from '../../src/auctionIndex.js';
import {expect} from 'chai';
import {deepClone} from '../../src/utils.js';
import { IMAGE as ortbNativeRequest } from 'src/native.js';

var assert = require('assert');

/* use this method to test individual files instead of the whole prebid.js project */

// TODO refactor to use the spec files
var utils = require('../../src/utils');
var fixtures = require('../fixtures/fixtures');
var adapterManager = require('src/adapterManager').default;
var events = require('src/events');

const BIDDER_CODE = 'sampleBidder';
const BIDDER_CODE1 = 'sampleBidder1';

const ADUNIT_CODE = 'adUnit-code';
const ADUNIT_CODE1 = 'adUnit-code-1';

/**
 * @param {Object} [opts]
 * @returns {Bid}
 */
function mockBid(opts) {
  let bidderCode = opts && opts.bidderCode;

  return {
    'ad': 'creative',
    'cpm': '1.99',
    'width': 300,
    'height': 250,
    'bidderCode': bidderCode || BIDDER_CODE,
    'requestId': utils.getUniqueIdentifierStr(),
    'transactionId': (opts && opts.transactionId) || ADUNIT_CODE,
    'creativeId': 'id',
    'currency': 'USD',
    'netRevenue': true,
    'ttl': 360,
    getSize: () => '300x250',
    getIdentifiers() {
      return {
        src: this.source,
        bidder: this.bidderCode,
        bidId: this.requestId,
        transactionId: this.transactionId,
        auctionId: this.auctionId
      }
    }
  };
}

/**
 * @param {Bid} bid
 * @param {Object} [opts]
 * @returns {BidRequest}
 */
function mockBidRequest(bid, opts) {
  if (!bid) {
    throw new Error('bid required');
  }
  let bidderCode = opts && opts.bidderCode;
  let adUnitCode = opts && opts.adUnitCode;
  let defaultMediaType = {
    banner: {
      sizes: [[300, 250], [300, 600]]
    }
  }
  let mediaType = (opts && opts.mediaType) ? opts.mediaType : defaultMediaType;

  let requestId = utils.getUniqueIdentifierStr();

  return {
    'bidderCode': bidderCode || bid.bidderCode,
    'auctionId': opts && opts.auctionId,
    'bidderRequestId': requestId,
    'bids': [
      {
        'bidder': bidderCode || bid.bidderCode,
        'params': {
          'placementId': 'id'
        },
        'adUnitCode': adUnitCode || ADUNIT_CODE,
        'transactionId': bid.transactionId,
        'sizes': [[300, 250], [300, 600]],
        'bidId': bid.requestId,
        'bidderRequestId': requestId,
        'auctionId': opts && opts.auctionId,
        'mediaTypes': mediaType
      }
    ],
    'auctionStart': 1505250713622,
    'timeout': 3000
  };
}

function mockBidder(bidderCode, bids) {
  let spec = {
    code: bidderCode,
    isBidRequestValid: sinon.stub(),
    buildRequests: sinon.stub(),
    interpretResponse: sinon.stub(),
    getUserSyncs: sinon.stub()
  };

  spec.buildRequests.returns([{'id': 123, 'method': 'POST'}]);
  spec.isBidRequestValid.returns(true);
  spec.interpretResponse.returns(bids);

  return spec;
}

const TEST_BIDS = [mockBid()];
const TEST_BID_REQS = TEST_BIDS.map(mockBidRequest);

function mockAjaxBuilder() {
  return function(url, callback) {
    const fakeResponse = sinon.stub();
    fakeResponse.returns('headerContent');
    callback.success('response body', { getResponseHeader: fakeResponse });
  };
}

describe('auctionmanager.js', function () {
  let indexAuctions, indexStub

  before(() => {
    // hooks are global and their side effects depend on what has been loaded
    [
      auctionModule.addBidResponse,
      auctionModule.addBidderRequests,
      auctionModule.bidsBackCallback
    ].forEach((h) => h.getHooks().remove())
    hook.ready();
  });

  beforeEach(() => {
    indexAuctions = [];
    indexStub = sinon.stub(auctionManager, 'index');
    indexStub.get(() => new AuctionIndex(() => indexAuctions));
  });

  afterEach(() => {
    indexStub.restore();
  });

  describe('getKeyValueTargetingPairs', function () {
    const DEFAULT_BID = {
      cpm: 5.578,
      pbLg: 5.50,
      pbMg: 5.50,
      pbHg: 5.57,
      pbAg: 5.50,

      height: 300,
      width: 250,
      getSize() {
        return this.height + 'x' + this.width;
      },

      adUnitCode: '12345',
      bidderCode: 'appnexus',
      adId: '1adId',
      source: 'client',
      mediaType: 'banner',
      creativeId: 'monkeys',
      meta: {
        advertiserDomains: ['adomain'],
        primaryCatId: 'IAB-test',
        networkId: '123987'
      }
    };

    /* return the expected response for a given bid, filter by keys if given */
    function getDefaultExpected(bid, keys) {
      var expected = {};
      expected[ CONSTANTS.TARGETING_KEYS.BIDDER ] = bid.bidderCode;
      expected[ CONSTANTS.TARGETING_KEYS.AD_ID ] = bid.adId;
      expected[ CONSTANTS.TARGETING_KEYS.PRICE_BUCKET ] = bid.pbMg;
      expected[ CONSTANTS.TARGETING_KEYS.SIZE ] = bid.getSize();
      expected[ CONSTANTS.TARGETING_KEYS.SOURCE ] = bid.source;
      expected[ CONSTANTS.TARGETING_KEYS.FORMAT ] = bid.mediaType;
      expected[ CONSTANTS.TARGETING_KEYS.ADOMAIN ] = bid.meta.advertiserDomains[0];
      expected[ CONSTANTS.TARGETING_KEYS.ACAT ] = bid.meta.primaryCatId;
      expected[ CONSTANTS.TARGETING_KEYS.DSP ] = bid.meta.networkId;
      expected[ CONSTANTS.TARGETING_KEYS.CRID ] = bid.creativeId;
      if (bid.mediaType === 'video') {
        expected[ CONSTANTS.TARGETING_KEYS.UUID ] = bid.videoCacheKey;
        expected[ CONSTANTS.TARGETING_KEYS.CACHE_ID ] = bid.videoCacheKey;
        expected[ CONSTANTS.TARGETING_KEYS.CACHE_HOST ] = 'prebid.adnxs.com';
      }
      if (!keys) {
        return expected;
      }

      return keys.reduce((map, key) => {
        map[key] = expected[key];
        return map;
      }, {});
    }

    var bid = {};

    before(function () {
      bid = Object.assign({}, DEFAULT_BID);
    });

    it('No bidder level configuration defined - default', function () {
      $$PREBID_GLOBAL$$.bidderSettings = {};
      let expected = getDefaultExpected(bid);
      // remove hb_cache_host from expected
      delete expected.hb_cache_host;
      let response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('should suppress acat if undefined', function () {
      const noAcatBid = deepClone(DEFAULT_BID);
      noAcatBid.meta.primaryCatId = ''
      let expected = getDefaultExpected(noAcatBid);
      delete expected.hb_acat;
      let response = getKeyValueTargetingPairs(noAcatBid.bidderCode, noAcatBid);
      assert.deepEqual(response, expected);
    });

    if (FEATURES.VIDEO) {
      it('No bidder level configuration defined - default for video', function () {
        config.setConfig({
          cache: {
            url: 'https://prebid.adnxs.com/pbc/v1/cache'
          }
        });
        $$PREBID_GLOBAL$$.bidderSettings = {};
        let videoBid = utils.deepClone(bid);
        videoBid.mediaType = 'video';
        videoBid.videoCacheKey = 'abc123def';

        let expected = getDefaultExpected(videoBid);
        let response = getKeyValueTargetingPairs(videoBid.bidderCode, videoBid);
        assert.deepEqual(response, expected);
      });
    }

    it('Custom configuration for all bidders', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          adserverTargeting: [
            {
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.SIZE,
              val: function (bidResponse) {
                return bidResponse.size;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.SOURCE,
              val: function (bidResponse) {
                return bidResponse.source;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.FORMAT,
              val: function (bidResponse) {
                return bidResponse.mediaType;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.ADOMAIN,
              val: function (bidResponse) {
                return bidResponse.meta.advertiserDomains[0];
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.CRID,
              val: function (bidResponse) {
                return bidResponse.creativeId;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.DSP,
              val: function (bidResponse) {
                return bidResponse.meta.networkId;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.ACAT,
              val: function (bidResponse) {
                return bidResponse.meta.primaryCatId;
              }
            }
          ]

        }
      };

      var expected = getDefaultExpected(bid);
      expected[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] = bid.pbHg;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    if (FEATURES.VIDEO) {
      it('Custom configuration for all bidders with video bid', function () {
        config.setConfig({
          cache: {
            url: 'https://prebid.adnxs.com/pbc/v1/cache'
          }
        });
        let videoBid = utils.deepClone(bid);
        videoBid.mediaType = 'video';
        videoBid.videoCacheKey = 'abc123def';

        $$PREBID_GLOBAL$$.bidderSettings =
      {
        standard: {
          adserverTargeting: [
            {
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                return bidResponse.pbMg;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.SIZE,
              val: function (bidResponse) {
                return bidResponse.size;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.SOURCE,
              val: function (bidResponse) {
                return bidResponse.source;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.FORMAT,
              val: function (bidResponse) {
                return bidResponse.mediaType;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.UUID,
              val: function (bidResponse) {
                return bidResponse.videoCacheKey;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.CACHE_ID,
              val: function (bidResponse) {
                return bidResponse.videoCacheKey;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.ADOMAIN,
              val: function (bidResponse) {
                return bidResponse.meta.advertiserDomains[0];
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.CRID,
              val: function (bidResponse) {
                return bidResponse.creativeId;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.DSP,
              val: function (bidResponse) {
                return bidResponse.meta.networkId;
              }
            },
            {
              key: CONSTANTS.TARGETING_KEYS.ACAT,
              val: function (bidResponse) {
                return bidResponse.meta.primaryCatId;
              }
            }
          ]

        }
      };

        let expected = getDefaultExpected(videoBid);

        let response = getKeyValueTargetingPairs(videoBid.bidderCode, videoBid);
        assert.deepEqual(response, expected);
      });
    }

    it('Custom configuration for one bidder', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          adserverTargeting: [
            {
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.SIZE,
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };

      var expected = getDefaultExpected(bid);
      expected[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] = bid.pbHg;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Custom configuration for one bidder - not matched', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        nonExistentBidder: {
          adserverTargeting: [
            {
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                // change default here
                return bidResponse.pbHg;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.SIZE,
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };
      var expected = getDefaultExpected(bid);

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Should set targeting as expecting when pbs is enabled', function () {
      config.setConfig({
        s2sConfig: {
          accountId: '1',
          enabled: true,
          defaultVendor: 'appnexus',
          bidders: ['appnexus'],
          timeout: 1000,
          adapter: 'prebidServer'
        }
      });

      $$PREBID_GLOBAL$$.bidderSettings = {};
      let expected = getDefaultExpected(bid);
      let response = getKeyValueTargetingPairs(bid.bidderCode, bid);
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
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                // change default here
                return 10.00;
              }
            }
          ]

        }
      };
      var expected = getDefaultExpected(bid, [CONSTANTS.TARGETING_KEYS.BIDDER, CONSTANTS.TARGETING_KEYS.AD_ID]);
      expected[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] = 10.0;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('Standard bidCpmAdjustment changes the bid of any bidder', function () {
      const bid = Object.assign({},
        createBid(2),
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
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
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
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                // change default here
                return 10.00;
              },
            },
            {
              key: CONSTANTS.TARGETING_KEYS.SIZE,
              val: function (bidResponse) {
                return bidResponse.size;
              }
            }
          ]

        }
      };
      var expected = getDefaultExpected(bid, [CONSTANTS.TARGETING_KEYS.BIDDER, CONSTANTS.TARGETING_KEYS.AD_ID, CONSTANTS.TARGETING_KEYS.SIZE]);
      expected[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] = 15.0;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });

    it('sendStandardTargeting=false, and inherit custom', function () {
      $$PREBID_GLOBAL$$.bidderSettings =
      {
        appnexus: {
          sendStandardTargeting: false,
          adserverTargeting: [
            {
              key: CONSTANTS.TARGETING_KEYS.BIDDER,
              val: function (bidResponse) {
                return bidResponse.bidderCode;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.AD_ID,
              val: function (bidResponse) {
                return bidResponse.adId;
              }
            }, {
              key: CONSTANTS.TARGETING_KEYS.PRICE_BUCKET,
              val: function (bidResponse) {
                return bidResponse.pbHg;
              }
            }
          ]
        }
      };
      var expected = getDefaultExpected(bid);
      expected[CONSTANTS.TARGETING_KEYS.PRICE_BUCKET] = 5.57;

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
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

      var response = getKeyValueTargetingPairs(bid.bidderCode, bid);
      assert.deepEqual(response, expected);
    });
  });

  describe('adjustBids', function () {
    it('should adjust bids if greater than zero and pass copy of bid object', function () {
      const bid = Object.assign({},
        createBid(2),
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

  describe('createAuction', () => {
    let adUnits, stubMakeBidRequests, stubCallAdapters

    beforeEach(() => {
      stubMakeBidRequests = sinon.stub(adapterManager, 'makeBidRequests').returns([{
        bidderCode: BIDDER_CODE,
        bids: [{
          bidder: BIDDER_CODE
        }]
      }]);
      stubCallAdapters = sinon.stub(adapterManager, 'callBids').callsFake((au, reqs, addBid, done) => {
        reqs.forEach(r => done.apply(r));
      });
      adUnits = [{
        code: ADUNIT_CODE,
        transactionId: ADUNIT_CODE,
        bids: [
          {bidder: BIDDER_CODE},
        ]
      }];
    });

    afterEach(() => {
      stubMakeBidRequests.restore();
      stubCallAdapters.restore();
    });

    it('passes global and bidder ortb2 to the auction', () => {
      const ortb2Fragments = {
        global: {},
        bidder: {}
      }
      const auction = auctionManager.createAuction({adUnits, ortb2Fragments});
      auction.callBids();
      const anyArgs = [...Array(7).keys()].map(() => sinon.match.any);
      sinon.assert.calledWith(stubMakeBidRequests, ...anyArgs.slice(0, 5).concat([sinon.match.same(ortb2Fragments)]));
      sinon.assert.calledWith(stubCallAdapters, ...anyArgs.slice(0, 7).concat([sinon.match.same(ortb2Fragments)]));
    });

    it('correctly adds nonbids when they are emitted', () => {
      const ortb2Fragments = {
        global: {},
        bidder: {}
      }
      const auction = auctionManager.createAuction({adUnits, ortb2Fragments});
      expect(auction.getNonBids()[0]).to.equal(undefined);
      events.emit(CONSTANTS.EVENTS.SEAT_NON_BID, {
        auctionId: auction.getAuctionId(),
        seatnonbid: ['test']
      });
      expect(auction.getNonBids()[0]).to.equal('test');
    });
  });

  describe('addBidResponse #1', function () {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let auction;
    let ajaxStub;
    let bids;
    let bidderRequests;
    let makeRequestsStub;

    before(function () {
      makeRequestsStub = sinon.stub(adapterManager, 'makeBidRequests');
    });

    after(function () {
      adapterManager.makeBidRequests.restore();
    });

    describe('when auction timeout is 3000', function () {
      beforeEach(function () {
        ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockAjaxBuilder);
        adUnits = [{
          code: ADUNIT_CODE,
          transactionId: ADUNIT_CODE,
          bids: [
            {bidder: BIDDER_CODE, params: {placementId: 'id'}},
          ]
        }];
        adUnitCodes = [ADUNIT_CODE];
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
        bids = TEST_BIDS.slice();
        bidderRequests = bids.map(b => mockBidRequest(b, {auctionId: auction.getAuctionId()}));
        makeRequestsStub.returns(bidderRequests);
        indexAuctions = [auction];
        createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);

        spec = mockBidder(BIDDER_CODE, bids);
        registerBidder(spec);
      });

      afterEach(function () {
        ajaxStub.restore();
        auctionModule.newAuction.restore();
      });

      function checkPbDg(cpm, expected, msg) {
        return function() {
          bids[0].cpm = cpm;
          auction.callBids();

          let registeredBid = auction.getBidsReceived().pop();
          assert.equal(registeredBid.pbDg, expected, msg);
        };
      };

      it('should return proper price bucket increments for dense mode when cpm is in range 0-3',
        checkPbDg('1.99', '1.99', '0 - 3 hits at to 1 cent increment'));

      it('should return proper price bucket increments for dense mode when cpm is in range 3-8',
        checkPbDg('4.39', '4.35', '3 - 8 hits at 5 cent increment'));

      it('should return proper price bucket increments for dense mode when cpm is in range 8-20',
        checkPbDg('19.99', '19.50', '8 - 20 hits at 50 cent increment'));

      it('should return proper price bucket increments for dense mode when cpm is 20+',
        checkPbDg('73.07', '20.00', '20+ caps at 20.00'));

      it('should place dealIds in adserver targeting', function () {
        bids[0].dealId = 'test deal';
        auction.callBids();

        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.adserverTargeting[CONSTANTS.TARGETING_KEYS.DEAL], 'test deal', 'dealId placed in adserverTargeting');
      });

      it('should pass through default adserverTargeting sent from adapter', function () {
        bids[0].adserverTargeting = {};
        bids[0].adserverTargeting.extra = 'stuff';
        auction.callBids();

        let registeredBid = auction.getBidsReceived().pop();
        assert.equal(registeredBid.adserverTargeting[CONSTANTS.TARGETING_KEYS.BIDDER], BIDDER_CODE);
        assert.equal(registeredBid.adserverTargeting.extra, 'stuff');
      });
      it('should add the bidResponse to the collection before calling BID_RESPONSE', function () {
        let hasBid = false;
        const eventHandler = function(bid) {
          const storedBid = auction.getBidsReceived().pop();
          hasBid = storedBid === bid;
        }
        events.on(CONSTANTS.EVENTS.BID_RESPONSE, eventHandler);
        auction.callBids();
        events.off(CONSTANTS.EVENTS.BID_RESPONSE, eventHandler);
        assert.ok(hasBid, 'Bid not available');
      });

      describe('install publisher-defined renderers', () => {
        Object.entries({
          'on adUnit': () => adUnits[0],
          'on bid': () => bidderRequests[0].bids[0],
        }).forEach(([t, getObj]) => {
          it(t, () => {
            let renderer = {
              url: 'renderer.js',
              render: (bid) => bid
            };

            let bids1 = Object.assign({},
              bids[0],
              {
                bidderCode: BIDDER_CODE,
                mediaType: 'video-outstream',
              }
            );
            Object.assign(getObj(), {renderer});
            spec.interpretResponse.returns(bids1);
            auction.callBids();
            const addedBid = auction.getBidsReceived().pop();
            assert.equal(addedBid.renderer.url, 'renderer.js');
          })
        })
      })

      it('installs publisher-defined backup renderers on bids', function () {
        let renderer = {
          url: 'renderer.js',
          backupOnly: true,
          render: (bid) => bid
        };
        Object.assign(adUnits[0], {renderer});

        let bids1 = Object.assign({},
          bids[0],
          {
            bidderCode: BIDDER_CODE,
            mediaType: 'video-outstream',
          }
        );
        spec.interpretResponse.returns(bids1);
        auction.callBids();
        const addedBid = auction.getBidsReceived().pop();
        assert.equal(addedBid.renderer.url, 'renderer.js');
      });

      it('installs publisher-defined renderers for a media type', function () {
        const renderer = {
          url: 'videoRenderer.js',
          render: (bid) => bid
        };
        let myBid = mockBid();
        let bidRequest = mockBidRequest(myBid);

        bidRequest.bids[0] = {
          ...bidRequest.bids[0],
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]]
            },
            video: {
              context: 'outstream',
              renderer
            }
          }
        };
        makeRequestsStub.returns([bidRequest]);

        myBid.mediaType = 'video';
        spec.interpretResponse.returns(myBid);
        auction.callBids();

        const addedBid = auction.getBidsReceived().pop();
        assert.equal(addedBid.renderer.url, renderer.url);
      });

      it('installs bidder-defined renderer when onlyBackup is true in mediaTypes.video options ', function () {
        const renderer = {
          url: 'videoRenderer.js',
          backupOnly: true,
          render: (bid) => bid
        };
        let myBid = mockBid();
        let bidRequest = mockBidRequest(myBid);

        bidRequest.bids[0] = {
          ...bidRequest.bids[0],
          mediaTypes: {
            video: {
              context: 'outstream',
              renderer
            }
          }
        };
        makeRequestsStub.returns([bidRequest]);

        myBid.mediaType = 'video';
        myBid.renderer = {
          url: 'renderer.js',
          render: sinon.spy()
        };
        spec.interpretResponse.returns(myBid);
        auction.callBids();

        const addedBid = auction.getBidsReceived().pop();
        assert.strictEqual(addedBid.renderer.url, myBid.renderer.url);
      });

      it('bid for a regular unit and a video unit', function() {
        let renderer = {
          url: 'renderer.js',
          render: (bid) => bid
        };
        Object.assign(adUnits[0], {renderer});
        // make sure that if the renderer is only on the second ad unit, prebid
        // still correctly uses it
        let bid = mockBid();
        let bidRequests = [mockBidRequest(bid, {auctionId: auction.getAuctionId()})];

        bidRequests[0].bids[1] = Object.assign({
          bidId: utils.getUniqueIdentifierStr()
        }, bidRequests[0].bids[0]);
        Object.assign(bidRequests[0].bids[0], {
          adUnitCode: ADUNIT_CODE1,
          transactionId: ADUNIT_CODE1,
        });

        makeRequestsStub.returns(bidRequests);

        // this should correspond with the second bid in the bidReq because of the ad unit code
        bid.mediaType = 'video-outstream';
        spec.interpretResponse.returns(bid);

        auction.callBids();

        const addedBid = find(auction.getBidsReceived(), bid => bid.adUnitCode == ADUNIT_CODE);
        assert.equal(addedBid.renderer.url, 'renderer.js');
      });

      it('sets bidResponse.ttlBuffer from adUnit.ttlBuffer', () => {
        adUnits[0].ttlBuffer = 0;
        auction.callBids();
        expect(auction.getBidsReceived()[0].ttlBuffer).to.eql(0);
      });
    });

    describe('when auction timeout is 20', function () {
      let eventsEmitSpy;

      function setupBids(auctionId) {
        bids = [mockBid(), mockBid({ bidderCode: BIDDER_CODE1 })];
        let bidRequests = bids.map(bid => mockBidRequest(bid, {auctionId}));
        makeRequestsStub.returns(bidRequests);
      }

      beforeEach(function () {
        adUnits = [{
          code: ADUNIT_CODE,
          transactionId: ADUNIT_CODE,
          bids: [
            {bidder: BIDDER_CODE, params: {placementId: 'id'}},
          ]
        }];
        adUnitCodes = [ADUNIT_CODE];

        eventsEmitSpy = sinon.spy(events, 'emit');
      });
      afterEach(function () {
        events.emit.restore();
      });

      it('should emit BID_TIMEOUT and AUCTION_END for timed out bids', function (done) {
        const spec1 = mockBidder(BIDDER_CODE, [bids[0]]);
        registerBidder(spec1);
        const spec2 = mockBidder(BIDDER_CODE1, [bids[1]]);
        registerBidder(spec2);

        function respondToRequest(requestIndex) {
          server.requests[requestIndex].respond(200, {}, 'response body');
        }
        function auctionCallback() {
          const bidTimeoutCall = eventsEmitSpy.withArgs(CONSTANTS.EVENTS.BID_TIMEOUT).getCalls()[0];
          const timedOutBids = bidTimeoutCall.args[1];
          assert.equal(timedOutBids.length, 1);
          assert.equal(timedOutBids[0].bidder, BIDDER_CODE1);
          // Check that additional properties are available
          assert.equal(timedOutBids[0].params.placementId, 'id');

          const auctionEndCall = eventsEmitSpy.withArgs(CONSTANTS.EVENTS.AUCTION_END).getCalls()[0];
          const auctionProps = auctionEndCall.args[1];
          assert.equal(auctionProps.adUnits, adUnits);
          assert.equal(auctionProps.timeout, 20);
          assert.equal(auctionProps.auctionStatus, AUCTION_COMPLETED)
          done();
        }
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: auctionCallback, cbTimeout: 20});
        setupBids(auction.getAuctionId());

        auction.callBids();
        respondToRequest(0);
      });
      it('should NOT emit BID_TIMEOUT when all bidders responded in time', function (done) {
        const spec1 = mockBidder(BIDDER_CODE, [bids[0]]);
        registerBidder(spec1);
        const spec2 = mockBidder(BIDDER_CODE1, [bids[1]]);
        registerBidder(spec2);

        function respondToRequest(requestIndex) {
          server.requests[requestIndex].respond(200, {}, 'response body');
        }
        function auctionCallback() {
          assert.ok(eventsEmitSpy.withArgs(CONSTANTS.EVENTS.BID_TIMEOUT).notCalled, 'did not emit event BID_TIMEOUT');
          done();
        }
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: auctionCallback, cbTimeout: 20});
        setupBids(auction.getAuctionId());
        auction.callBids();
        respondToRequest(0);
        respondToRequest(1);
      });
      it('should NOT emit BID_TIMEOUT for bidders which responded in time but with an empty bid', function (done) {
        const spec1 = mockBidder(BIDDER_CODE, []);
        registerBidder(spec1);
        const spec2 = mockBidder(BIDDER_CODE1, []);
        registerBidder(spec2);

        function respondToRequest(requestIndex) {
          server.requests[requestIndex].respond(200, {}, 'response body');
        }
        function auctionCallback() {
          const bidTimeoutCall = eventsEmitSpy.withArgs(CONSTANTS.EVENTS.BID_TIMEOUT).getCalls()[0];
          const timedOutBids = bidTimeoutCall.args[1];
          assert.equal(timedOutBids.length, 1);
          assert.equal(timedOutBids[0].bidder, BIDDER_CODE1);
          done();
        }
        auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: auctionCallback, cbTimeout: 20});
        setupBids(auction.getAuctionId());
        auction.callBids();
        respondToRequest(0);
      });
    });
  });

  describe('addBidResponse #2', function () {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let spec1;
    let auction;
    let ajaxStub;

    let bids = TEST_BIDS;
    let bids1 = [mockBid({ bidderCode: BIDDER_CODE1 })];

    beforeEach(function () {
      adUnits = [{
        code: ADUNIT_CODE,
        transactionId: ADUNIT_CODE,
        bids: [
          {bidder: BIDDER_CODE, params: {placementId: 'id'}},
        ]
      }, {
        code: ADUNIT_CODE1,
        transactionId: ADUNIT_CODE1,
        bids: [
          {bidder: BIDDER_CODE1, params: {placementId: 'id'}},
        ]
      }];
      adUnitCodes = adUnits.map(({ code }) => code);
      auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
      let bidRequests = [
        mockBidRequest(bids[0], { auctionId: auction.getAuctionId() }),
        mockBidRequest(bids1[0], { auctionId: auction.getAuctionId(), adUnitCode: ADUNIT_CODE1 })
      ];
      let makeRequestsStub = sinon.stub(adapterManager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);
      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockAjaxBuilder);
      createAuctionStub = sinon.stub(auctionModule, 'newAuction');
      createAuctionStub.returns(auction);
      indexAuctions = [auction];

      spec = mockBidder(BIDDER_CODE, bids);
      spec1 = mockBidder(BIDDER_CODE1, bids1);

      registerBidder(spec);
      registerBidder(spec1);
    });

    afterEach(function () {
      auctionModule.newAuction.restore();
      ajaxStub.restore();
      adapterManager.makeBidRequests.restore();
    });

    it('should not alter bid requestID', function () {
      auction.callBids();

      const addedBid2 = auction.getBidsReceived().pop();
      assert.equal(addedBid2.requestId, bids1[0].requestId);
      const addedBid1 = auction.getBidsReceived().pop();
      assert.equal(addedBid1.requestId, bids[0].requestId);
    });

    it('should not add banner bids that have no width or height', function () {
      bids1[0].width = undefined;
      bids1[0].height = undefined;

      auction.callBids();

      let length = auction.getBidsReceived().length;
      const addedBid2 = auction.getBidsReceived().pop();
      assert.notEqual(addedBid2.adId, bids1[0].requestId);
      assert.equal(length, 1);
    });

    it('should run auction after video bids have been cached', function () {
      sinon.stub(store, 'store').callsArgWith(1, null, [{ uuid: 123 }]);
      sinon.stub(config, 'getConfig').withArgs('cache.url').returns('cache-url');

      const bidsCopy = [Object.assign({}, bids[0], { mediaType: 'video' })];
      const bids1Copy = [Object.assign({}, bids1[0], { mediaType: 'video' })];

      spec.interpretResponse.returns(bidsCopy);
      spec1.interpretResponse.returns(bids1Copy);

      auction.callBids();

      assert.equal(auction.getBidsReceived().length, 2);
      assert.equal(auction.getAuctionStatus(), 'completed');

      config.getConfig.restore();
      store.store.restore();
    });

    it('runs auction after video responses with multiple bid objects have been cached', function () {
      sinon.stub(store, 'store').callsArgWith(1, null, [{ uuid: 123 }]);
      sinon.stub(config, 'getConfig').withArgs('cache.url').returns('cache-url');

      const bidsCopy = [
        Object.assign({}, bids[0], { mediaType: 'video' }),
        Object.assign({}, bids[0], { mediaType: 'banner' }),
      ];
      const bids1Copy = [
        Object.assign({}, bids1[0], { mediaType: 'video' }),
        Object.assign({}, bids1[0], { mediaType: 'video' }),
      ];

      spec.interpretResponse.returns(bidsCopy);
      spec1.interpretResponse.returns(bids1Copy);

      auction.callBids();

      assert.equal(auction.getBidsReceived().length, 4);
      assert.equal(auction.getAuctionStatus(), 'completed');

      config.getConfig.restore();
      store.store.restore();
    });
  });

  describe('addBidRequests', function () {
    let createAuctionStub;
    let adUnits;
    let adUnitCodes;
    let spec;
    let spec1;
    let auction;
    let ajaxStub;
    let logMessageStub;
    let logInfoStub;
    let logWarnStub;
    let logErrorStub;

    let bids = TEST_BIDS;
    let bids1 = [mockBid({ bidderCode: BIDDER_CODE1 })];

    before(function () {
      logMessageStub = sinon.stub(utils, 'logMessage');
      logInfoStub = sinon.stub(utils, 'logInfo');
      logWarnStub = sinon.stub(utils, 'logWarn');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    after(function () {
      logMessageStub.restore();
      logInfoStub.restore();
      logWarnStub.restore();
      logErrorStub.restore();
    });

    beforeEach(function () {
      config.setConfig({
        debugging: {
          enabled: true,
          bidRequests: [{
            bidderCode: BIDDER_CODE,
            adUnitCode: ADUNIT_CODE
          }]
        }
      });

      adUnits = [{
        code: ADUNIT_CODE,
        transactionId: ADUNIT_CODE,
        bids: [
          {bidder: BIDDER_CODE, params: {placementId: 'id'}},
        ]
      }, {
        code: ADUNIT_CODE1,
        transactionId: ADUNIT_CODE1,
        bids: [
          {bidder: BIDDER_CODE1, params: {placementId: 'id'}},
        ]
      }];
      adUnitCodes = adUnits.map(({ code }) => code);
      auction = auctionModule.newAuction({adUnits, adUnitCodes, callback: function() {}, cbTimeout: 3000});
      createAuctionStub = sinon.stub(auctionModule, 'newAuction');
      createAuctionStub.returns(auction);
      indexAuctions = [auction];
      let bidRequests = [
        mockBidRequest(bids[0], { auctionId: auction.getAuctionId() }),
        mockBidRequest(bids1[0], { auctionId: auction.getAuctionId(), adUnitCode: ADUNIT_CODE1 })
      ];
      let makeRequestsStub = sinon.stub(adapterManager, 'makeBidRequests');
      makeRequestsStub.returns(bidRequests);

      ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockAjaxBuilder);

      spec = mockBidder(BIDDER_CODE, bids);
      spec1 = mockBidder(BIDDER_CODE1, bids1);

      registerBidder(spec);
      registerBidder(spec1);
    });

    afterEach(function () {
      logMessageStub.resetHistory();
      logInfoStub.resetHistory();
      logWarnStub.resetHistory();
      logErrorStub.resetHistory();
      auctionModule.newAuction.restore();
      ajaxStub.restore();
      adapterManager.makeBidRequests.restore();
      config.resetConfig();
    });

    it('should override bidRequest properties when config debugging has a matching bidRequest defined', function () {
      auction.callBids();
      const auctionBidRequests = auction.getBidRequests();
      assert.equal(auctionBidRequests.length > 0, true);
      assert.equal(Array.isArray(auctionBidRequests[0].bids), true);

      const bid = find(auctionBidRequests[0].bids, bid => bid.adUnitCode === ADUNIT_CODE);
      assert.equal(typeof bid !== 'undefined', true);
    });
  });

  if (FEATURES.NATIVE) {
    describe('addBidResponse native', function () {
      let makeRequestsStub;
      let ajaxStub;
      let spec;
      let auction;

      beforeEach(function () {
        makeRequestsStub = sinon.stub(adapterManager, 'makeBidRequests');
        ajaxStub = sinon.stub(ajaxLib, 'ajaxBuilder').callsFake(mockAjaxBuilder);

        const adUnits = [{
          code: ADUNIT_CODE,
          transactionId: ADUNIT_CODE,
          bids: [
            {bidder: BIDDER_CODE, params: {placementId: 'id'}},
          ],
          nativeOrtbRequest: ortbNativeRequest.ortb,
          mediaTypes: { native: { type: 'image' } }
        }];
        auction = auctionModule.newAuction({adUnits, adUnitCodes: [ADUNIT_CODE], callback: function() {}, cbTimeout: 3000});
        indexAuctions = [auction];
        const createAuctionStub = sinon.stub(auctionModule, 'newAuction');
        createAuctionStub.returns(auction);

        spec = mockBidder(BIDDER_CODE);
        registerBidder(spec);
      });

      afterEach(function () {
        ajaxStub.restore();
        auctionModule.newAuction.restore();
        adapterManager.makeBidRequests.restore();
      });

      it('should add legacy fields to native response', function () {
        let nativeBid = mockBid();
        nativeBid.mediaType = 'native';
        nativeBid.native = {
          ortb: {
            ver: '1.2',
            assets: [
              { id: 2, title: { text: 'Sample title' } },
              { id: 4, data: { value: 'Sample body' } },
              { id: 3, data: { value: 'Sample sponsoredBy' } },
              { id: 1, img: { url: 'https://www.example.com/image.png', w: 200, h: 200 } },
              { id: 5, img: { url: 'https://www.example.com/icon.png', w: 32, h: 32 } }
            ],
            link: { url: 'http://www.click.com' },
            eventtrackers: [
              { event: 1, method: 1, url: 'http://www.imptracker.com' },
              { event: 1, method: 2, url: 'http://www.jstracker.com/file.js' }
            ]
          }
        }

        let bidRequest = mockBidRequest(nativeBid, { mediaType: { native: ortbNativeRequest } });
        makeRequestsStub.returns([bidRequest]);

        spec.interpretResponse.returns(nativeBid);
        auction.callBids();

        const addedBid = auction.getBidsReceived().pop();
        assert.equal(addedBid.native.body, 'Sample body')
        assert.equal(addedBid.native.title, 'Sample title')
        assert.equal(addedBid.native.sponsoredBy, 'Sample sponsoredBy')
        assert.equal(addedBid.native.clickUrl, 'http://www.click.com')
        assert.equal(addedBid.native.image.url, 'https://www.example.com/image.png')
        assert.equal(addedBid.native.icon.url, 'https://www.example.com/icon.png')
        assert.equal(addedBid.native.impressionTrackers[0], 'http://www.imptracker.com')
        assert.equal(addedBid.native.javascriptTrackers, '<script async src="http://www.jstracker.com/file.js"></script>')
      });
    });
  }

  describe('getMediaTypeGranularity', function () {
    if (FEATURES.VIDEO) {
      it('video', function () {
        let mediaTypes = { video: {id: '1'} };

        // mediaType is video and video.context is undefined
        expect(getMediaTypeGranularity('video', mediaTypes, {
          banner: 'low',
          video: 'medium'
        })).to.equal('medium');

        expect(getMediaTypeGranularity('video', {}, {
          banner: 'low',
          video: 'medium'
        })).to.equal('medium');
        ``
        expect(getMediaTypeGranularity('video', undefined, {
          banner: 'low',
          video: 'medium'
        })).to.equal('medium');

        // also when mediaTypes.video is undefined
        mediaTypes = { banner: {} };
        expect(getMediaTypeGranularity('video', mediaTypes, {
          banner: 'low',
          video: 'medium'
        })).to.equal('medium');

        // also when mediaTypes is undefined
        expect(getMediaTypeGranularity('video', {}, {
          banner: 'low',
          video: 'medium'
        })).to.equal('medium');
      });

      it('video-outstream', function () {
        let mediaTypes = { video: { context: 'outstream' } };

        expect(getMediaTypeGranularity('video', mediaTypes, {
          'banner': 'low', 'video': 'medium', 'video-outstream': 'high'
        })).to.equal('high');
      });

      it('video-instream', function () {
        let mediaTypes = { video: { context: 'instream' } };

        expect(getMediaTypeGranularity('video', mediaTypes, {
          banner: 'low', video: 'medium', 'video-instream': 'high'
        })).to.equal('high');

        // fall back to video if video-instream not found
        expect(getMediaTypeGranularity('video', mediaTypes, {
          banner: 'low', video: 'medium'
        })).to.equal('medium');

        expect(getMediaTypeGranularity('video', {mediaTypes: {banner: {}}}, {
          banner: 'low', video: 'medium'
        })).to.equal('medium');
      });
    }

    it('native', function () {
      expect(getMediaTypeGranularity('native', {native: {}}, {
        banner: 'low', video: 'medium', native: 'high'
      })).to.equal('high');
    });
  });

  function mockAuction(getBidRequests, start = 1) {
    return {
      getBidRequests: getBidRequests,
      getAdUnits: () => getBidRequests().flatMap(br => br.bids).map(br => ({ code: br.adUnitCode, transactionId: br.transactionId, mediaTypes: br.mediaTypes })),
      getAuctionId: () => '1',
      addBidReceived: () => true,
      addBidRejected: () => true,
      getTimeout: () => 1000,
      getAuctionStart: () => start,
    }
  }

  describe('getPriceByGranularity', () => {
    beforeEach(() => {
      config.setConfig({
        mediaTypePriceGranularity: {
          video: 'medium',
          banner: 'low'
        }
      });
    })

    afterEach(() => {
      config.resetConfig();
    })

    it('evaluates undef granularity on each call', () => {
      const gpbg = getPriceByGranularity();
      expect(gpbg({
        mediaType: 'video', pbMg: 'medium'
      }, {
        'mediaTypes': {video: {id: '1'}}
      })).to.equal('medium');
      expect(gpbg({
        mediaType: 'banner',
        pbLg: 'low'
      }, {
        'mediaTypes': {banner: {}}
      })).to.equal('low');
    });
  })

  describe('auctionCallbacks', function() {
    let bids = TEST_BIDS;
    let bidRequests;
    let doneSpy;
    let auction;

    beforeEach(() => {
      const start = Date.now();
      auction = mockAuction(() => bidRequests, start);
      indexAuctions = [auction];
      doneSpy = sinon.spy();
      config.setConfig({
        cache: {
          url: 'https://prebid.adnxs.com/pbc/v1/cache'
        }
      });
    });

    afterEach(() => {
      doneSpy.resetHistory();
      config.resetConfig();
      bidRequests = null;
    });

    Object.entries({
      'added to': (cbs) => cbs.addBidResponse,
      'rejected from': (cbs) => cbs.addBidResponse.reject,
    }).forEach(([t, getMethod]) => {
      it(`should call auction done after bid is ${t} auction for mediaType banner`, function () {
        let ADUNIT_CODE2 = 'adUnitCode2';
        let BIDDER_CODE2 = 'sampleBidder2';

        let bids1 = [mockBid({ bidderCode: BIDDER_CODE1, transactionId: ADUNIT_CODE1 })];
        let bids2 = [mockBid({ bidderCode: BIDDER_CODE2, transactionId: ADUNIT_CODE2 })];
        bidRequests = [
          mockBidRequest(bids[0]),
          mockBidRequest(bids1[0], { adUnitCode: ADUNIT_CODE1 }),
          mockBidRequest(bids2[0], { adUnitCode: ADUNIT_CODE2 })
        ];
        let cbs = auctionCallbacks(doneSpy, auction);
        const method = getMethod(cbs);
        method(ADUNIT_CODE, bids[0]);
        cbs.adapterDone.call(bidRequests[0]);
        method(ADUNIT_CODE1, bids1[0]);
        cbs.adapterDone.call(bidRequests[1]);
        method(ADUNIT_CODE2, bids2[0]);
        cbs.adapterDone.call(bidRequests[2]);
        assert.equal(doneSpy.callCount, 1);
      });
    })

    if (FEATURES.VIDEO) {
      it('should call auction done after prebid cache is complete for mediaType video', function() {
        bids[0].mediaType = 'video';
        let bids1 = [mockBid({ bidderCode: BIDDER_CODE1 })];

        let opts = {
          mediaType: {
            video: {
              context: 'instream',
              playerSize: [640, 480],
            },
          }
        };
        bidRequests = [
          mockBidRequest(bids[0], opts),
          mockBidRequest(bids1[0], { adUnitCode: ADUNIT_CODE1 }),
        ];

        let cbs = auctionCallbacks(doneSpy, auction);
        cbs.addBidResponse.call(bidRequests[0], ADUNIT_CODE, bids[0]);
        cbs.adapterDone.call(bidRequests[0]);
        cbs.addBidResponse.call(bidRequests[1], ADUNIT_CODE1, bids1[0]);
        cbs.adapterDone.call(bidRequests[1]);
        assert.equal(doneSpy.callCount, 0);
        const uuid = 'c488b101-af3e-4a99-b538-00423e5a3371';
        const responseBody = `{"responses":[{"uuid":"${uuid}"}]}`;
        server.requests[0].respond(200, { 'Content-Type': 'application/json' }, responseBody);
        assert.equal(doneSpy.callCount, 1);
      });
    }

    it('should convert cpm to number', () => {
      auction.addBidReceived = sinon.spy();
      const cbs = auctionCallbacks(doneSpy, auction);
      const bid = {...bids[0], cpm: '1.23'}
      bidRequests = [mockBidRequest(bid)];
      cbs.addBidResponse.call(bidRequests[0], ADUNIT_CODE, bid);
      sinon.assert.calledWith(auction.addBidReceived, sinon.match({cpm: 1.23}));
    })

    describe('when addBidResponse hook returns promises', () => {
      let resolvers, callbacks, bids;

      function hook(next, ...args) {
        next.bail(new Promise((resolve, reject) => {
          resolvers.resolve.push(resolve);
          resolvers.reject.push(reject);
        }).finally(() => next(...args)));
      }

      function invokeCallbacks() {
        bids.forEach((bid) => callbacks.addBidResponse(ADUNIT_CODE, bid));
        bidRequests.forEach(bidRequest => callbacks.adapterDone.call(bidRequest));
      }

      function delay(ms = 0) {
        return new Promise((resolve) => {
          setTimeout(resolve, ms)
        });
      }

      beforeEach(() => {
        bids = [
          mockBid({bidderCode: BIDDER_CODE1}),
          mockBid({bidderCode: BIDDER_CODE})
        ]
        bidRequests = bids.map((b) => mockBidRequest(b));
        resolvers = {resolve: [], reject: []};
        addBidResponse.before(hook);
        callbacks = auctionCallbacks(doneSpy, auction);
        Object.assign(auction, {
          addNoBid: sinon.spy()
        });
      });

      afterEach(() => {
        addBidResponse.getHooks({hook: hook}).remove();
      });

      it('should wait for bids without a request bids before calling auctionDone', () => {
        callbacks.addBidResponse(ADUNIT_CODE, Object.assign(mockBid(), {requestId: null}));
        invokeCallbacks();
        resolvers.resolve.slice(1, 3).forEach((fn) => fn());
        return delay().then(() => {
          expect(doneSpy.called).to.be.false;
          resolvers.resolve[0]();
          return delay();
        }).then(() => {
          expect(doneSpy.called).to.be.true;
        });
      });

      Object.entries({
        'all succeed': ['resolve', 'resolve'],
        'some fail': ['resolve', 'reject'],
        'all fail': ['reject', 'reject']
      }).forEach(([test, results]) => {
        describe(`(and ${test})`, () => {
          it('should wait for them to complete before calling auctionDone', () => {
            invokeCallbacks();
            return delay().then(() => {
              expect(doneSpy.called).to.be.false;
              expect(auction.addNoBid.called).to.be.false;
              resolvers[results[0]][0]();
              return delay();
            }).then(() => {
              expect(doneSpy.called).to.be.false;
              expect(auction.addNoBid.called).to.be.false;
              resolvers[results[1]][1]();
              return delay();
            }).then(() => {
              expect(doneSpy.called).to.be.true;
            });
          });
        });
      });

      Object.entries({
        bidder: (timeout) => {
          bidRequests.forEach((r) => r.timeout = timeout);
          auction.getTimeout = () => timeout + 10000
        },
        auction: (timeout) => {
          auction.getTimeout = () => timeout;
          bidRequests.forEach((r) => r.timeout = timeout + 10000)
        }
      }).forEach(([test, setTimeout]) => {
        it(`should respect ${test} timeout if they never complete`, () => {
          const start = Date.now() - 2900;
          auction.getAuctionStart = () => start;
          setTimeout(3000);
          invokeCallbacks();
          return delay().then(() => {
            expect(doneSpy.called).to.be.false;
            return delay(100);
          }).then(() => {
            expect(doneSpy.called).to.be.true;
          });
        });

        it(`should not wait if ${test} has already timed out`, () => {
          const start = Date.now() - 2000;
          auction.getAuctionStart = () => start;
          setTimeout(1000);
          invokeCallbacks();
          return delay().then(() => {
            expect(doneSpy.called).to.be.true;
          });
        });
      })
    });

    describe('when bids are rejected', () => {
      let cbs, bid, expectedRejection;
      const onBidRejected = sinon.stub();
      const REJECTION_REASON = 'Bid rejected';
      const AU_CODE = 'au';

      function rejectHook(fn, adUnitCode, bid, reject) {
        reject(REJECTION_REASON);
        reject(REJECTION_REASON); // second call should do nothing
      }

      before(() => {
        addBidResponse.before(rejectHook, 999);
        events.on(CONSTANTS.EVENTS.BID_REJECTED, onBidRejected);
      });

      after(() => {
        addBidResponse.getHooks({hook: rejectHook}).remove();
        events.off(CONSTANTS.EVENTS.BID_REJECTED, onBidRejected);
      });

      beforeEach(() => {
        onBidRejected.reset();
        bid = mockBid({bidderCode: BIDDER_CODE});
        bidRequests = [
          mockBidRequest(bid),
        ];
        cbs = auctionCallbacks(doneSpy, auction);
        expectedRejection = sinon.match(Object.assign({}, bid, {
          cpm: parseFloat(bid.cpm),
          rejectionReason: REJECTION_REASON,
          adUnitCode: AU_CODE
        }));
        auction.addBidRejected = sinon.stub();
      });

      Object.entries({
        'with addBidResponse.reject': () => cbs.addBidResponse.reject(AU_CODE, deepClone(bid), REJECTION_REASON),
        'from addBidResponse hooks': () => cbs.addBidResponse(AU_CODE, deepClone(bid))
      }).forEach(([t, rejectBid]) => {
        describe(t, () => {
          it('should emit a BID_REJECTED event', () => {
            rejectBid();
            sinon.assert.calledWith(onBidRejected, expectedRejection);
          });

          it('should pass bid to auction.addBidRejected', () => {
            rejectBid();
            sinon.assert.calledWith(auction.addBidRejected, expectedRejection);
          });
        })
      });

      it('addBidResponse hooks should not be able to reject the same bid twice', () => {
        cbs.addBidResponse(AU_CODE, bid);
        expect(auction.addBidRejected.calledOnce).to.be.true;
      });
    })
  });

  describe('auctionOptions', function() {
    let bidRequests;
    let doneSpy;
    let clock;
    let requiredBidder = BIDDER_CODE;
    let requiredBidder1 = BIDDER_CODE1;
    let secondaryBidder = 'doNotWaitForMe';
    let auction;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      doneSpy = sinon.spy();
      config.setConfig({
        'auctionOptions': {
          secondaryBidders: [ secondaryBidder ]
        }
      });

      const start = Date.now();
      auction = mockAuction(() => bidRequests);
      indexAuctions = [auction];
    });

    afterEach(() => {
      doneSpy.resetHistory();
      config.resetConfig();
      clock.restore();
    });

    it('should not wait to call auction done for secondary bidders', function () {
      let bids1 = [mockBid({ bidderCode: requiredBidder, transactionId: ADUNIT_CODE1 })];
      let bids2 = [mockBid({ bidderCode: requiredBidder1, transactionId: ADUNIT_CODE1 })];
      let bids3 = [mockBid({ bidderCode: secondaryBidder, transactionId: ADUNIT_CODE1 })];
      bidRequests = [
        mockBidRequest(bids1[0], { adUnitCode: ADUNIT_CODE1 }),
        mockBidRequest(bids2[0], { adUnitCode: ADUNIT_CODE1 }),
        mockBidRequest(bids3[0], { adUnitCode: ADUNIT_CODE1 }),
      ];
      let cbs = auctionCallbacks(doneSpy, auction);
      // required bidder responds immeaditely to auction
      cbs.addBidResponse.call(bidRequests[0], ADUNIT_CODE1, bids1[0]);
      cbs.adapterDone.call(bidRequests[0]);
      assert.equal(doneSpy.callCount, 0);

      // auction waits for second required bidder to respond
      clock.tick(100);
      cbs.addBidResponse.call(bidRequests[1], ADUNIT_CODE1, bids2[0]);
      cbs.adapterDone.call(bidRequests[1]);

      // auction done is reported and does not wait for secondaryBidder request
      assert.equal(doneSpy.callCount, 1);

      cbs.addBidResponse.call(bidRequests[2], ADUNIT_CODE1, bids3[0]);
      cbs.adapterDone.call(bidRequests[2]);
    });

    it('should wait for all bidders if they are all secondary', function () {
      config.setConfig({
        'auctionOptions': {
          secondaryBidders: [requiredBidder, requiredBidder1, secondaryBidder]
        }
      })
      let bids1 = [mockBid({ bidderCode: requiredBidder })];
      let bids2 = [mockBid({ bidderCode: requiredBidder1 })];
      let bids3 = [mockBid({ bidderCode: secondaryBidder })];
      bidRequests = [
        mockBidRequest(bids1[0], { adUnitCode: ADUNIT_CODE1 }),
        mockBidRequest(bids2[0], { adUnitCode: ADUNIT_CODE1 }),
        mockBidRequest(bids3[0], { adUnitCode: ADUNIT_CODE1 }),
      ];
      let cbs = auctionCallbacks(doneSpy, auction);
      cbs.addBidResponse.call(bidRequests[0], ADUNIT_CODE1, bids1[0]);
      cbs.adapterDone.call(bidRequests[0]);
      clock.tick(100);
      assert.equal(doneSpy.callCount, 0)

      cbs.addBidResponse.call(bidRequests[1], ADUNIT_CODE1, bids2[0]);
      cbs.adapterDone.call(bidRequests[1]);
      clock.tick(100);
      assert.equal(doneSpy.callCount, 0);

      cbs.addBidResponse.call(bidRequests[2], ADUNIT_CODE1, bids3[0]);
      cbs.adapterDone.call(bidRequests[2]);
      assert.equal(doneSpy.callCount, 1);
    });

    it('should allow secondaryBidders to respond in auction before is is done', function () {
      let bids1 = [mockBid({ bidderCode: requiredBidder })];
      let bids2 = [mockBid({ bidderCode: requiredBidder1 })];
      let bids3 = [mockBid({ bidderCode: secondaryBidder })];
      bidRequests = [
        mockBidRequest(bids1[0], { adUnitCode: ADUNIT_CODE1 }),
        mockBidRequest(bids2[0], { adUnitCode: ADUNIT_CODE1 }),
        mockBidRequest(bids3[0], { adUnitCode: ADUNIT_CODE1 }),
      ];
      let cbs = auctionCallbacks(doneSpy, auction);
      // secondaryBidder is first to respond
      cbs.addBidResponse.call(bidRequests[2], ADUNIT_CODE1, bids3[0]);
      cbs.adapterDone.call(bidRequests[2]);
      clock.tick(100);
      assert.equal(doneSpy.callCount, 0);

      cbs.addBidResponse.call(bidRequests[1], ADUNIT_CODE1, bids2[0]);
      cbs.adapterDone.call(bidRequests[1]);
      clock.tick(100);
      assert.equal(doneSpy.callCount, 0);

      // first required bidder takes longest to respond, auction isn't marked as done until this occurs
      cbs.addBidResponse.call(bidRequests[0], ADUNIT_CODE1, bids1[0]);
      cbs.adapterDone.call(bidRequests[0]);
      assert.equal(doneSpy.callCount, 1);
    });
  });
});
