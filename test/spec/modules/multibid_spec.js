import {expect} from 'chai';
import {
  addBidResponseHook,
  adjustBidderRequestsHook,
  resetMultibidUnits,
  resetMultiConfig,
  sortByMultibid,
  targetBidPoolHook,
  validateMultibid
} from 'modules/multibid/index.js';
import {config} from 'src/config.js';
import {getHighestCpm} from '../../../src/utils/reducers.js';

describe('multibid adapter', function () {
  const bidArray = [{
    'bidderCode': 'bidderA',
    'requestId': '1c5f0a05d3629a',
    'cpm': 75,
    'originalCpm': 75,
    'bidder': 'bidderA',
  }, {
    'bidderCode': 'bidderA',
    'cpm': 52,
    'requestId': '2e6j8s05r4363h',
    'originalCpm': 52,
    'bidder': 'bidderA',
  }];
  const bidCacheArray = [{
    'bidderCode': 'bidderA',
    'requestId': '1c5f0a05d3629a',
    'cpm': 66,
    'originalCpm': 66,
    'bidder': 'bidderA',
    'originalBidder': 'bidderA',
    'multibidPrefix': 'bidA'
  }, {
    'bidderCode': 'bidderA',
    'cpm': 38,
    'requestId': '2e6j8s05r4363h',
    'originalCpm': 38,
    'bidder': 'bidderA',
    'originalBidder': 'bidderA',
    'multibidPrefix': 'bidA'
  }];
  const bidArrayAlt = [{
    'bidderCode': 'bidderA',
    'requestId': '1c5f0a05d3629a',
    'cpm': 29,
    'originalCpm': 29,
    'bidder': 'bidderA'
  }, {
    'bidderCode': 'bidderA',
    'cpm': 52,
    'requestId': '2e6j8s05r4363h',
    'originalCpm': 52,
    'bidder': 'bidderA'
  }, {
    'bidderCode': 'bidderB',
    'cpm': 3,
    'requestId': '7g8h5j45l7654i',
    'originalCpm': 3,
    'bidder': 'bidderB'
  }, {
    'bidderCode': 'bidderC',
    'cpm': 12,
    'requestId': '9d7f4h56t6483u',
    'originalCpm': 12,
    'bidder': 'bidderC'
  }];
  const bidderRequests = [{
    'bidderCode': 'bidderA',
    'auctionId': 'e6bd4400-28fc-459b-9905-ad64d044daaa',
    'bidderRequestId': '10e78266423c0e',
    'bids': [{
      'bidder': 'bidderA',
      'params': {'placementId': 1234567},
      'crumbs': {'pubcid': 'fb4cfc66-ff3d-4fda-bef8-3f2cb6fe9412'},
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250]]
        }
      },
      'adUnitCode': 'test.div',
      'transactionId': 'c153f3da-84f0-4be8-95cb-0647c458bc60',
      'sizes': [[300, 250]],
      'bidId': '2408ef83b84c9d',
      'bidderRequestId': '10e78266423c0e',
      'auctionId': 'e6bd4400-28fc-459b-9905-ad64d044daaa',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    }]
  }, {
    'bidderCode': 'bidderB',
    'auctionId': 'e6bd4400-28fc-459b-9905-ad64d044daaa',
    'bidderRequestId': '10e78266423c0e',
    'bids': [{
      'bidder': 'bidderB',
      'params': {'placementId': 1234567},
      'crumbs': {'pubcid': 'fb4cfc66-ff3d-4fda-bef8-3f2cb6fe9412'},
      'mediaTypes': {
        'banner': {
          'sizes': [[300, 250]]
        }
      },
      'adUnitCode': 'test.div',
      'transactionId': 'c153f3da-84f0-4be8-95cb-0647c458bc60',
      'sizes': [[300, 250]],
      'bidId': '2408ef83b84c9d',
      'bidderRequestId': '10e78266423c0e',
      'auctionId': 'e6bd4400-28fc-459b-9905-ad64d044daaa',
      'src': 'client',
      'bidRequestsCount': 1,
      'bidderRequestsCount': 1,
      'bidderWinsCount': 0
    }]
  }];

  afterEach(function () {
    config.resetConfig();
    resetMultiConfig();
    resetMultibidUnits();
  });

  describe('adjustBidderRequestsHook', function () {
    let result;
    const callbackFn = function (bidderRequests) {
      result = bidderRequests;
    };

    beforeEach(function() {
      result = null;
    });

    it('does not modify bidderRequest when no multibid config exists', function () {
      const bidRequests = [{...bidderRequests[0]}];

      adjustBidderRequestsHook(callbackFn, bidRequests);

      expect(result).to.not.equal(null);
      expect(result).to.deep.equal(bidRequests);
    });

    it('does modify bidderRequest when multibid config exists', function () {
      const bidRequests = [{...bidderRequests[0]}];

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2}]});

      adjustBidderRequestsHook(callbackFn, [{...bidderRequests[0]}]);

      expect(result).to.not.equal(null);
      expect(result).to.not.deep.equal(bidRequests);
      expect(result[0].bidLimit).to.equal(2);
    });

    it('does modify bidderRequest when multibid config exists using bidders array', function () {
      const bidRequests = [{...bidderRequests[0]}];

      config.setConfig({multibid: [{bidders: ['bidderA'], maxBids: 2}]});

      adjustBidderRequestsHook(callbackFn, [{...bidderRequests[0]}]);

      expect(result).to.not.equal(null);
      expect(result).to.not.deep.equal(bidRequests);
      expect(result[0].bidLimit).to.equal(2);
    });

    it('does only modifies bidderRequest when multibid config exists for bidder', function () {
      const bidRequests = [{...bidderRequests[0]}, {...bidderRequests[1]}];

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2}]});

      adjustBidderRequestsHook(callbackFn, [{...bidderRequests[0]}, {...bidderRequests[1]}]);

      expect(result).to.not.equal(null);
      expect(result[0]).to.not.deep.equal(bidRequests[0]);
      expect(result[0].bidLimit).to.equal(2);
      expect(result[1]).to.deep.equal(bidRequests[1]);
      expect(result[1].bidLimit).to.equal(undefined);
    });
  });

  describe('addBidResponseHook', function () {
    let result;
    const callbackFn = function (adUnitCode, bid) {
      result = {
        'adUnitCode': adUnitCode,
        'bid': bid
      };
    };

    beforeEach(function() {
      result = null;
    });

    it('adds original bids and does not modify', function () {
      const adUnitCode = 'test.div';
      const bids = [{...bidArray[0]}, {...bidArray[1]}];

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[0]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[1]});

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[1]);
    });

    it('modifies and adds both bids based on multibid configuration', function () {
      const adUnitCode = 'test.div';
      const bids = [{...bidArray[0]}, {...bidArray[1]}];

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].multibidPrefix = 'bidA';
      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[0]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[1]});

      bids[1].multibidPrefix = 'bidA';
      bids[1].originalBidder = 'bidderA';
      bids[1].targetingBidder = 'bidA2';
      bids[1].originalRequestId = '2e6j8s05r4363h';

      delete bids[1].requestId;
      delete result.bid.requestId;

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[1]);
    });

    it('only modifies bids defined in the multibid configuration', function () {
      const adUnitCode = 'test.div';
      const bids = [{...bidArray[0]}, {...bidArray[1]}];

      bids.push({
        'bidderCode': 'bidderB',
        'cpm': 33,
        'requestId': '1j8s5f89y2345l',
        'originalCpm': 33,
        'bidder': 'bidderB',
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].multibidPrefix = 'bidA';
      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[0]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[1]});

      bids[1].multibidPrefix = 'bidA';
      bids[1].originalBidder = 'bidderA';
      bids[1].targetingBidder = 'bidA2';
      bids[1].originalRequestId = '2e6j8s05r4363h';
      bids[1].requestId = result.bid.requestId;

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[1]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[2]});

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[2]);
    });

    it('only modifies and returns bids under limit for a specific bidder in the multibid configuration', function () {
      const adUnitCode = 'test.div';
      let bids = [{...bidArray[0]}, {...bidArray[1]}];

      bids.push({
        'bidderCode': 'bidderA',
        'cpm': 33,
        'requestId': '1j8s5f89y2345l',
        'originalCpm': 33,
        'bidder': 'bidderA',
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].multibidPrefix = 'bidA';
      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[0]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[1]});

      bids[1].multibidPrefix = 'bidA';
      bids[1].originalBidder = 'bidderA';
      bids[1].targetingBidder = 'bidA2';
      bids[1].originalRequestId = '2e6j8s05r4363h';
      bids[1].requestId = result.bid.requestId;

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[1]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[2]});

      expect(result).to.equal(null);
    });

    it('if no prefix in multibid configuration, modifies and returns bids under limit without preifx property', function () {
      const adUnitCode = 'test.div';
      const bids = [{...bidArray[0]}, {...bidArray[1]}];

      bids.push({
        'bidderCode': 'bidderA',
        'cpm': 33,
        'requestId': '1j8s5f89y2345l',
        'originalCpm': 33,
        'bidder': 'bidderA',
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2}]});

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[0]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[1]});

      bids[1].originalBidder = 'bidderA';
      bids[1].originalRequestId = '2e6j8s05r4363h';
      bids[1].requestId = result.bid.requestId;

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid).to.deep.equal(bids[1]);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[2]});

      expect(result).to.equal(null);
    });

    it('does not include extra bids if cpm is less than floor value', function () {
      const adUnitCode = 'test.div';
      const bids = [{...bidArrayAlt[1]}, {...bidArrayAlt[0]}, {...bidArrayAlt[2]}, {...bidArrayAlt[3]}];

      bids.map(bid => {
        bid.floorData = {
          cpmAfterAdjustments: bid.cpm,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: false,
            bidAdjustment: true
          },
          floorCurrency: 'USD',
          floorRule: '*|banner',
          floorRuleValue: 65,
          floorValue: 65,
          matchedFields: {
            gptSlot: 'test.div',
            mediaType: 'banner'
          }
        }

        return bid;
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].multibidPrefix = 'bidA';
      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid.bidder).to.equal('bidderA');
      expect(result.bid.targetingBidder).to.equal(undefined);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[1]});

      expect(result).to.equal(null);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[2]});

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid.bidder).to.equal('bidderB');
      expect(result.bid.targetingBidder).to.equal(undefined);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[3]});

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid.bidder).to.equal('bidderC');
      expect(result.bid.targetingBidder).to.equal(undefined);
    });

    it('does  include extra bids if cpm is not less than floor value', function () {
      const adUnitCode = 'test.div';
      const bids = [{...bidArrayAlt[1]}, {...bidArrayAlt[0]}];

      bids.map(bid => {
        bid.floorData = {
          cpmAfterAdjustments: bid.cpm,
          enforcements: {
            enforceJS: true,
            enforcePBS: false,
            floorDeals: false,
            bidAdjustment: true
          },
          floorCurrency: 'USD',
          floorRule: '*|banner',
          floorRuleValue: 25,
          floorValue: 25,
          matchedFields: {
            gptSlot: 'test.div',
            mediaType: 'banner'
          }
        }

        return bid;
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].multibidPrefix = 'bidA';
      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid.bidder).to.equal('bidderA');
      expect(result.bid.targetingBidder).to.equal(undefined);

      result = null;

      addBidResponseHook(callbackFn, adUnitCode, {...bids[0]});

      bids[0].multibidPrefix = 'bidA';
      bids[0].originalBidder = 'bidderA';

      expect(result).to.not.equal(null);
      expect(result.adUnitCode).to.not.equal(null);
      expect(result.adUnitCode).to.equal('test.div');
      expect(result.bid).to.not.equal(null);
      expect(result.bid.bidder).to.equal('bidderA');
      expect(result.bid.targetingBidder).to.equal('bidA2');
    });
  });

  describe('targetBidPoolHook', function () {
    let result;
    let bidResult;
    const callbackFn = function (bidsReceived, highestCpmCallback, adUnitBidLimit = 0, hasModified = false) {
      result = {
        'bidsReceived': bidsReceived,
        'adUnitBidLimit': adUnitBidLimit,
        'hasModified': hasModified
      };
    };
    const bidResponseCallback = function (adUnitCode, bid) {
      bidResult = bid;
    };

    beforeEach(function() {
      result = null;
      bidResult = null;
    });

    it('it does not run filter on bidsReceived if no multibid configuration found', function () {
      const bids = [{...bidArray[0]}, {...bidArray[1]}];
      targetBidPoolHook(callbackFn, bids, getHighestCpm);

      expect(result).to.not.equal(null);
      expect(result.bidsReceived).to.not.equal(null);
      expect(result.bidsReceived.length).to.equal(2);
      expect(result.bidsReceived).to.deep.equal(bids);
      expect(result.adUnitBidLimit).to.not.equal(null);
      expect(result.adUnitBidLimit).to.equal(0);
      expect(result.hasModified).to.not.equal(null);
      expect(result.hasModified).to.equal(false);
    });

    it('it does filter on bidsReceived if multibid configuration found with no prefix', function () {
      const bids = [{...bidArray[0]}, {...bidArray[1]}];

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2}]});

      targetBidPoolHook(callbackFn, bids, getHighestCpm);
      bids.pop();

      expect(result).to.not.equal(null);
      expect(result.bidsReceived).to.not.equal(null);
      expect(result.bidsReceived.length).to.equal(1);
      expect(result.bidsReceived).to.deep.equal(bids);
      expect(result.adUnitBidLimit).to.not.equal(null);
      expect(result.adUnitBidLimit).to.equal(0);
      expect(result.hasModified).to.not.equal(null);
      expect(result.hasModified).to.equal(true);
    });

    it('it sorts and creates dynamic alias on bidsReceived if multibid configuration found with prefix', function () {
      const modifiedBids = [{...bidArray[1]}, {...bidArray[0]}].map(bid => {
        addBidResponseHook(bidResponseCallback, 'test.div', {...bid});

        return bidResult;
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      targetBidPoolHook(callbackFn, modifiedBids, getHighestCpm);

      expect(result).to.not.equal(null);
      expect(result.bidsReceived).to.not.equal(null);
      expect(result.bidsReceived.length).to.equal(2);
      expect(result.bidsReceived).to.deep.equal([modifiedBids[1], modifiedBids[0]]);
      expect(result.bidsReceived[0].bidderCode).to.equal('bidderA');
      expect(result.bidsReceived[0].bidder).to.equal('bidderA');
      expect(result.bidsReceived[1].bidderCode).to.equal('bidA2');
      expect(result.bidsReceived[1].bidder).to.equal('bidderA');
      expect(result.adUnitBidLimit).to.not.equal(null);
      expect(result.adUnitBidLimit).to.equal(0);
      expect(result.hasModified).to.not.equal(null);
      expect(result.hasModified).to.equal(true);
    });

    it('it sorts by cpm treating dynamic alias as unique bid when no bid limit defined', function () {
      const modifiedBids = [{...bidArrayAlt[0]}, {...bidArrayAlt[2]}, {...bidArrayAlt[3]}, {...bidArrayAlt[1]}].map(bid => {
        addBidResponseHook(bidResponseCallback, 'test.div', {...bid});

        return bidResult;
      });

      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}]});

      targetBidPoolHook(callbackFn, modifiedBids, getHighestCpm);

      expect(result).to.not.equal(null);
      expect(result.bidsReceived).to.not.equal(null);
      expect(result.bidsReceived.length).to.equal(4);
      expect(result.bidsReceived).to.deep.equal([modifiedBids[3], modifiedBids[0], modifiedBids[2], modifiedBids[1]]);
      expect(result.bidsReceived[0].bidderCode).to.equal('bidderA');
      expect(result.bidsReceived[0].bidder).to.equal('bidderA');
      expect(result.bidsReceived[0].cpm).to.equal(52);
      expect(result.bidsReceived[1].bidderCode).to.equal('bidA2');
      expect(result.bidsReceived[1].bidder).to.equal('bidderA');
      expect(result.bidsReceived[1].cpm).to.equal(29);
      expect(result.bidsReceived[2].bidderCode).to.equal('bidderC');
      expect(result.bidsReceived[2].bidder).to.equal('bidderC');
      expect(result.bidsReceived[2].cpm).to.equal(12);
      expect(result.bidsReceived[3].bidderCode).to.equal('bidderB');
      expect(result.bidsReceived[3].bidder).to.equal('bidderB');
      expect(result.bidsReceived[3].cpm).to.equal(3);
      expect(result.adUnitBidLimit).to.not.equal(null);
      expect(result.adUnitBidLimit).to.equal(0);
      expect(result.hasModified).to.not.equal(null);
      expect(result.hasModified).to.equal(true);
    });

    it('it should filter out dynamic bid when bid limit is less than unique bid pool', function () {
      const modifiedBids = [{...bidArrayAlt[0]}, {...bidArrayAlt[2]}, {...bidArrayAlt[3]}, {...bidArrayAlt[1]}].map(bid => {
        addBidResponseHook(bidResponseCallback, 'test.div', {...bid});

        return bidResult;
      });

      config.setConfig({ multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}] });

      targetBidPoolHook(callbackFn, modifiedBids, getHighestCpm, 3);

      expect(result).to.not.equal(null);
      expect(result.bidsReceived).to.not.equal(null);
      expect(result.bidsReceived.length).to.equal(3);
      expect(result.bidsReceived).to.deep.equal([modifiedBids[3], modifiedBids[2], modifiedBids[1]]);
      expect(result.bidsReceived[0].bidderCode).to.equal('bidderA');
      expect(result.bidsReceived[1].bidderCode).to.equal('bidderC');
      expect(result.bidsReceived[2].bidderCode).to.equal('bidderB');
      expect(result.adUnitBidLimit).to.not.equal(null);
      expect(result.adUnitBidLimit).to.equal(3);
      expect(result.hasModified).to.not.equal(null);
      expect(result.hasModified).to.equal(true);
    });

    it('it should collect all bids from auction and bid cache then sort and filter', function () {
      config.setConfig({ multibid: [{bidder: 'bidderA', maxBids: 2, targetBiddercodePrefix: 'bidA'}] });

      const modifiedBids = [{...bidArrayAlt[0]}, {...bidArrayAlt[2]}, {...bidArrayAlt[3]}, {...bidArrayAlt[1]}].map(bid => {
        addBidResponseHook(bidResponseCallback, 'test.div', {...bid});

        return bidResult;
      });

      const bidPool = [].concat.apply(modifiedBids, [{...bidCacheArray[0]}, {...bidCacheArray[1]}]);

      expect(bidPool.length).to.equal(6);

      targetBidPoolHook(callbackFn, bidPool, getHighestCpm);

      expect(result).to.not.equal(null);
      expect(result.bidsReceived).to.not.equal(null);
      expect(result.bidsReceived.length).to.equal(4);
      expect(result.bidsReceived).to.deep.equal([bidPool[4], bidPool[3], bidPool[2], bidPool[1]]);
      expect(result.bidsReceived[0].bidderCode).to.equal('bidderA');
      expect(result.bidsReceived[1].bidderCode).to.equal('bidA2');
      expect(result.bidsReceived[2].bidderCode).to.equal('bidderC');
      expect(result.bidsReceived[3].bidderCode).to.equal('bidderB');
      expect(result.adUnitBidLimit).to.not.equal(null);
      expect(result.adUnitBidLimit).to.equal(0);
      expect(result.hasModified).to.not.equal(null);
      expect(result.hasModified).to.equal(true);
    });
  });

  describe('validate multibid', function () {
    it('should fail validation for missing bidder name in entry', function () {
      const conf = [{maxBids: 1}];
      const result = validateMultibid(conf);

      expect(result).to.equal(false);
    });

    it('should pass validation on all multibid entries', function () {
      const conf = [{bidder: 'bidderA', maxBids: 1}, {bidder: 'bidderB', maxBids: 2}];
      const result = validateMultibid(conf);

      expect(result).to.equal(true);
    });

    it('should fail validation for maxbids less than 1 in entry', function () {
      const conf = [{bidder: 'bidderA', maxBids: 0}, {bidder: 'bidderB', maxBids: 2}];
      const result = validateMultibid(conf);

      expect(result).to.equal(false);
    });

    it('should fail validation for maxbids greater than 9 in entry', function () {
      const conf = [{bidder: 'bidderA', maxBids: 10}, {bidder: 'bidderB', maxBids: 2}];
      const result = validateMultibid(conf);

      expect(result).to.equal(false);
    });

    it('should add multbid entries to global config', function () {
      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 1}]});
      const conf = config.getConfig('multibid');

      expect(conf).to.deep.equal([{bidder: 'bidderA', maxBids: 1}]);
    });

    it('should modify multbid entries and add to global config', function () {
      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 0}, {bidder: 'bidderB', maxBids: 15}]});
      const conf = config.getConfig('multibid');

      expect(conf).to.deep.equal([{bidder: 'bidderA', maxBids: 1}, {bidder: 'bidderB', maxBids: 9}]);
    });

    it('should filter multbid entry and add modified to global config', function () {
      config.setConfig({multibid: [{bidder: 'bidderA', maxBids: 0}, {maxBids: 15}]});
      const conf = config.getConfig('multibid');

      expect(conf.length).to.equal(1);
      expect(conf).to.deep.equal([{bidder: 'bidderA', maxBids: 1}]);
    });
  });

  describe('sort multibid', function () {
    it('should not alter order', function () {
      const bids = [{
        'bidderCode': 'bidderA',
        'cpm': 75,
        'originalCpm': 75,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }, {
        'bidderCode': 'bidA2',
        'cpm': 75,
        'originalCpm': 75,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }];

      const expected = [{
        'bidderCode': 'bidderA',
        'cpm': 75,
        'originalCpm': 75,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }, {
        'bidderCode': 'bidA2',
        'cpm': 75,
        'originalCpm': 75,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }];
      const result = bids.sort(sortByMultibid);

      expect(result).to.deep.equal(expected);
    });

    it('should sort dynamic alias bidders to end', function () {
      const bids = [{
        'bidderCode': 'bidA2',
        'cpm': 75,
        'originalCpm': 75,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }, {
        'bidderCode': 'bidderA',
        'cpm': 22,
        'originalCpm': 22,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }, {
        'bidderCode': 'bidderB',
        'cpm': 4,
        'originalCpm': 4,
        'multibidPrefix': 'bidB',
        'originalBidder': 'bidderB',
        'bidder': 'bidderB',
      }, {
        'bidderCode': 'bidB',
        'cpm': 2,
        'originalCpm': 2,
        'multibidPrefix': 'bidB',
        'originalBidder': 'bidderB',
        'bidder': 'bidderB',
      }];
      const expected = [{
        'bidderCode': 'bidderA',
        'cpm': 22,
        'originalCpm': 22,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }, {
        'bidderCode': 'bidderB',
        'cpm': 4,
        'originalCpm': 4,
        'multibidPrefix': 'bidB',
        'originalBidder': 'bidderB',
        'bidder': 'bidderB',
      }, {
        'bidderCode': 'bidA2',
        'cpm': 75,
        'originalCpm': 75,
        'multibidPrefix': 'bidA',
        'originalBidder': 'bidderA',
        'bidder': 'bidderA',
      }, {
        'bidderCode': 'bidB',
        'cpm': 2,
        'originalCpm': 2,
        'multibidPrefix': 'bidB',
        'originalBidder': 'bidderB',
        'bidder': 'bidderB',
      }];
      const result = bids.sort(sortByMultibid);

      expect(result).to.deep.equal(expected);
    });
  });
});
