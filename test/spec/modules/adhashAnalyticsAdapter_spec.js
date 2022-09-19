import { expect } from 'chai';
import adhashAdapter from 'modules/adhashAnalyticsAdapter.js';
import { getAuctionTracker, getTimeouts, getSavedFallbackData,clearSavedFallbackData } from 'modules/adhashAnalyticsAdapter.js';
import CONSTANTS from 'src/constants.json';
import * as events from 'src/events.js';

const {
  EVENTS: {
    AUCTION_INIT,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    BID_WON,
    AUCTION_END,
    NO_BID
  }
} = CONSTANTS;

const AD_UNIT_CODE = 'test-ad-unit';
const AUCTION_ID = 'test-auction-id';
const CPM_WIN = 5;
const CPM_LOSE = 4;
const CURRENT_TIME = 1663318800000;
const SLOT_LOAD_WAIT_TIME = 10;

const ANALYTICS_CONFIG = {
  publisherId: '0xc3b09b27e9c6ef73957901aa729b9e69e5bbfbfb',
  platformURL: 'https://adhash.com/p/struma/',
  orgId: 'test-org-id',
  publisherAccountId: 123,
  publisherPlatformId: 'test-platform-id',
  configId: 'my_config',
  optimizerConfig: 'my my optimizer',
  sample: 1.0,
  payloadWaitTime: SLOT_LOAD_WAIT_TIME,
  payloadWaitTimePadding: SLOT_LOAD_WAIT_TIME
};

const auctionInitArgs = {
  auctionId: AUCTION_ID,
    timestamp: CURRENT_TIME,
    timeout: 3000,
  adUnitCodes: [AD_UNIT_CODE],
};

const bidRequestedAdhashArgs = {
  auctionId: AUCTION_ID,
  bidderCode: 'adhash',
  auctionStart: CURRENT_TIME,
  timeout: 2000,
  bids: [
    {
      adUnitCode: AD_UNIT_CODE,
      bidId: 'adhash-request-id',
      params: { unit: 'adhash-ad-unit-id' },
    }
  ],
  start: CURRENT_TIME + 10
};

const bidRequestedOpenXArgs = {
  auctionId: AUCTION_ID,
  bidderCode: 'openx',
  auctionStart: CURRENT_TIME,
  timeout: 1000,
  bids: [
    {
      adUnitCode: AD_UNIT_CODE,
      bidId: 'openx-request-id',
      params: { unit: 'openx-ad-unit-id' },
    }
  ],
  start: CURRENT_TIME + 20
};

const bidResponseAdhashArgs = {
  adUnitCode: AD_UNIT_CODE,
  bidderCode: 'adhash',
  cpm: CPM_WIN,
  netRevenue: true,
  requestId: 'adhash-request-id',
  mediaType: 'banner',
  width: 300,
  height: 250,
  adId: 'adhash-ad-id',
  auctionId: AUCTION_ID,
  creativeId: 'adhash-creative-id',
  currency: 'BG',
  timeToRespond: 100,
  responseTimestamp: CURRENT_TIME + 30,
  ts: 'test-adhash-ts'
};

const bidResponseOpenXArgs = {
  adUnitCode: AD_UNIT_CODE,
  bidderCode: 'openx',
  cpm: CPM_LOSE,
  netRevenue: true,
  requestId: 'openx-request-id',
  mediaType: 'banner',
  width: 300,
  height: 250,
  adId: 'openx-ad-id',
  auctionId: AUCTION_ID,
  creativeId: 'openx-creative-id',
  currency: 'BG',
  timeToRespond: 100,
  responseTimestamp: CURRENT_TIME + 40,
  ts: 'test-openx-ts'
};

const bidRequestedRubiconArgs = {
  auctionId: AUCTION_ID,
  bidderCode: 'rubicon',
  auctionStart: CURRENT_TIME,
  timeout: 1000,
  bids: [],
  start: CURRENT_TIME + 50
};

const noBidsRubiconArgs = {
  adUnitCode: AD_UNIT_CODE,
  auctionId: AUCTION_ID,
  bidder: 'rubicon'
}

const bidTimeoutRubiconArgs = {
  adUnitCode: AD_UNIT_CODE,
  auctionId: AUCTION_ID,
  bidder: 'rubicon'
}

const bidWonAdhashArgs = {
  adUnitCode: AD_UNIT_CODE,
  auctionId: AUCTION_ID,
  bidderCode: 'adhash',
  requestId: 'adhash-request-id',
  adId: 'adhash-ad-id'
};

const auctionEndArgs = {
  auctionId: AUCTION_ID,
  timestamp: CURRENT_TIME,
  auctionEnd: CURRENT_TIME + 100,
  timeout: 3000,
  adUnitCodes: [AD_UNIT_CODE],
};

describe('adhashAnalyticsAdapter', function () {
  let clock;

  beforeEach(function() {
    sinon.stub(events, 'getEvents').returns([]);
    clock = sinon.useFakeTimers(CURRENT_TIME);
  });

  afterEach(function() {
    events.getEvents.restore();
    clock.restore();
  });

  describe('auctionInit', function () {
    adhashAdapter.enableAnalytics({options: ANALYTICS_CONFIG});

    let clock = sinon.useFakeTimers(CURRENT_TIME);
    clock.tick(SLOT_LOAD_WAIT_TIME * 2);

    it('should initialize the auction tracker with empty data for each ad unit', function() {
      simulateAuction([
        [AUCTION_INIT, auctionInitArgs]
      ]);
      let auctionTracker = getAuctionTracker();
      var unitIsInitialized = auctionTracker[AUCTION_ID] != undefined && auctionTracker[AUCTION_ID][[auctionInitArgs.adUnitCodes[0]]] != undefined;
      expect(unitIsInitialized).is.true;
    });

    adhashAdapter.disableAnalytics();
  });

  describe('auctionEnd with fallback', function () {
    let clock = sinon.useFakeTimers(CURRENT_TIME);

    beforeEach(function () {
      adhashAdapter.enableAnalytics({options: ANALYTICS_CONFIG});

      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedRubiconArgs],
        [NO_BID, noBidsRubiconArgs],
        [AUCTION_END, auctionEndArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);
    });

    afterEach(function () {
      adhashAdapter.disableAnalytics();
    });

    it('should have fallback data', function () {
      let fallbackData = getSavedFallbackData();
      expect(fallbackData).to.contain({adTagId: AD_UNIT_CODE});
      clearSavedFallbackData();
    });
  });

  describe('auctionEnd', function () {
    let adhashBidResponse;
    let openxBidResponse;
    let auctionTracker;

    let clock = sinon.useFakeTimers(CURRENT_TIME);
    beforeEach(function () {
      adhashAdapter.enableAnalytics({options: ANALYTICS_CONFIG});

      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedAdhashArgs],
        [BID_REQUESTED, bidRequestedOpenXArgs],
        [BID_RESPONSE, bidResponseAdhashArgs],
        [BID_RESPONSE, bidResponseOpenXArgs],
        [BID_REQUESTED, bidRequestedRubiconArgs],
        [AUCTION_END, auctionEndArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);

      auctionTracker = getAuctionTracker();
      adhashBidResponse = auctionTracker[AUCTION_ID][AD_UNIT_CODE]['res']['adhash'];
      openxBidResponse = auctionTracker[AUCTION_ID][AD_UNIT_CODE]['res']['openx'];
    });

    afterEach(function () {
      adhashAdapter.disableAnalytics();
    });

    it('should have a cost for a single impression for every bid based on the CPM', function () {
      let adhashCost = adhashBidResponse.cost ? adhashBidResponse.cost : 0;
      let openxCost = openxBidResponse.cost ? openxBidResponse.cost : 0;
      let adhashCostDifference = Math.abs(adhashCost - (CPM_WIN / 1000));
      let openxCostDifference = Math.abs(openxCost - (CPM_LOSE / 1000));
      expect(adhashBidResponse.cost).is.not.undefined;
      expect(openxBidResponse.cost).is.not.undefined;
      expect(adhashCostDifference).lt(Number.EPSILON);
      expect(openxCostDifference).lt(Number.EPSILON);
    });

    it('should track the currency', function () {
      expect(adhashBidResponse.currency).to.equal(bidResponseAdhashArgs.currency);
      expect(openxBidResponse.currency).to.equal(bidResponseOpenXArgs.currency);
    });

    it('should track the bid\'s latency', function () {
      expect(adhashBidResponse.delay).to.equal(bidResponseAdhashArgs.timeToRespond);
      expect(openxBidResponse.delay).to.equal(bidResponseOpenXArgs.timeToRespond);
    });

    it('should not have any bid winners', function () {
      expect(adhashBidResponse.win).to.equal(false);
      expect(openxBidResponse.win).to.equal(false);
    });
  });

  describe('bidWon', function () {
    let adhashBidResponse;
    let openxBidResponse;
    let auctionTracker;

    let clock = sinon.useFakeTimers(CURRENT_TIME);
    beforeEach(function () {
      adhashAdapter.enableAnalytics({options: ANALYTICS_CONFIG});

      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedAdhashArgs],
        [BID_REQUESTED, bidRequestedOpenXArgs],
        [BID_RESPONSE, bidResponseAdhashArgs],
        [BID_RESPONSE, bidResponseOpenXArgs],
        [AUCTION_END, auctionEndArgs],
        [BID_WON, bidWonAdhashArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);

      auctionTracker = getAuctionTracker();
      adhashBidResponse = auctionTracker[AUCTION_ID][AD_UNIT_CODE]['res']['adhash'];
      openxBidResponse = auctionTracker[AUCTION_ID][AD_UNIT_CODE]['res']['openx'];
    });

    afterEach(function () {
      adhashAdapter.disableAnalytics();
    });

    it('should have a winning bidder that was marked as having a bid', function () {
      expect(adhashBidResponse).to.contain({bid: true});
    });

    it('should mark the rest of the bidders as the losers', function () {
      expect(openxBidResponse).to.contain({win: false});
    });
  });

  describe('noBid', function () {
    let auctionTracker;
    let clock = sinon.useFakeTimers(CURRENT_TIME);

    beforeEach(function () {
      adhashAdapter.enableAnalytics({options: ANALYTICS_CONFIG});

      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedOpenXArgs],
        [BID_RESPONSE, bidResponseOpenXArgs],
        [BID_REQUESTED, bidRequestedRubiconArgs],
        [NO_BID, noBidsRubiconArgs],
        [AUCTION_END, auctionEndArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);
      auctionTracker = getAuctionTracker();
    });

    afterEach(function () {
      adhashAdapter.disableAnalytics();
    });

    it('should add the responses with no bids to the auction tracker', function() {
      expect(auctionTracker[AUCTION_ID][AD_UNIT_CODE].nob['rubicon']).is.not.undefined;
    });

    it('should not add the responses with bids to the responses with no bids', function() {
      expect(auctionTracker[AUCTION_ID][AD_UNIT_CODE].nob['openx']).is.undefined;
    });

    it('should mark the responses with no bids as not winning', function() {
      expect(auctionTracker[AUCTION_ID][AD_UNIT_CODE].nob['rubicon']['bid']).is.false;
      expect(auctionTracker[AUCTION_ID][AD_UNIT_CODE].nob['rubicon']['win']).is.false;
    });
  });

  describe('bidTimeout', function () {
    let clock = sinon.useFakeTimers(CURRENT_TIME);

    beforeEach(function () {
      adhashAdapter.enableAnalytics({options: ANALYTICS_CONFIG});
    });

    afterEach(function () {
      adhashAdapter.disableAnalytics();
    });

    it('should add the bid timeout data to the auction tracker', function () {
      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedRubiconArgs],
        [BID_TIMEOUT, [bidTimeoutRubiconArgs]],
        [AUCTION_END, auctionEndArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);
      
      let timeoutData = getTimeouts();
      for (let singleTimeout of timeoutData) {
        expect(singleTimeout).to.contain({adUnitCode: AD_UNIT_CODE});
      }
    });

    it('should mark the bid with timeout as such when it hasn\'t been added to the bidders with no bids', function () {
      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedRubiconArgs],
        [BID_TIMEOUT, [bidTimeoutRubiconArgs]],
        [AUCTION_END, auctionEndArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);

      let auctionTracker = getAuctionTracker();
      expect(auctionTracker[AUCTION_ID][AD_UNIT_CODE]['nob'][bidTimeoutRubiconArgs.bidder]).to.contain({timeout: true});
    });

    it('should mark the bid with timeout as such when it has already been added to the bidders with no bids', function () {
      simulateAuction([
        [AUCTION_INIT, auctionInitArgs],
        [BID_REQUESTED, bidRequestedRubiconArgs],
        [NO_BID, noBidsRubiconArgs],
        [BID_TIMEOUT, [bidTimeoutRubiconArgs]],
        [AUCTION_END, auctionEndArgs]
      ]);

      clock.tick(SLOT_LOAD_WAIT_TIME * 2);

      let auctionTracker = getAuctionTracker();
      expect(auctionTracker[AUCTION_ID][AD_UNIT_CODE]['nob'][bidTimeoutRubiconArgs.bidder]).to.contain({timeout: true});
    });
  });

  function simulateAuction(events) {
    let highestBid;
    let bidRequests = [];
    let bidResponses = [];
    let noBids = [];
    let allArgs = {};

    for (let event of events) {
      const [eventType, args] = event;
      if (eventType == BID_RESPONSE) {
        highestBid = highestBid || args;
        if (highestBid.cpm < args.cpm) {
          highestBid = args;
        }
        bidResponses.push(args);
        allArgs['bidsReceived'] = bidResponses;
      } else if (eventType == BID_REQUESTED) {
        bidRequests.push(args);
        allArgs['bidderRequests'] = bidRequests;
      } else if (eventType == NO_BID) {
        noBids.push(args);
        adhashAdapter.track({ eventType, args });
        continue;
      } else if (eventType == BID_WON || eventType == BID_TIMEOUT) {
        adhashAdapter.track({ eventType, args });
        continue;
      } else if (eventType == AUCTION_INIT) {
        allArgs = args;
      } else if (eventType == AUCTION_END) {
        allArgs['noBids'] = noBids;
        if (!allArgs['bidsReceived']) {
          allArgs['bidsReceived'] = [];
        }
      }

      adhashAdapter.track({ eventType, args: allArgs });
    };
  }
});
