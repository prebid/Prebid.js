import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import {deepClone, logError, logInfo} from '../src/utils.js';

const analyticsType = 'endpoint';

export const ANALYTICS_VERSION = '1.0.0';

const ANALYTICS_SERVER = 'https://europe-west2-greenbids-357713.cloudfunctions.net/publisher-analytics-endpoint';

const {
  EVENTS: {
    AUCTION_END,
    BID_TIMEOUT,
  }
} = CONSTANTS;

export const BIDDER_STATUS = {
  BID: 'bid',
  NO_BID: 'noBid',
  TIMEOUT: 'timeout'
};

const analyticsOptions = {};

export const parseBidderCode = function (bid) {
  let bidderCode = bid.bidderCode || bid.bidder;
  return bidderCode.toLowerCase();
};

export const parseAdUnitCode = function (bidResponse) {
  return bidResponse.adUnitCode.toLowerCase();
};

export const greenbidsAnalyticsAdapter = Object.assign(adapter({ANALYTICS_SERVER, analyticsType}), {

  cachedAuctions: {},

  initConfig(config) {
    /**
     * Required option: pbuid
     * @type {boolean}
     */
    analyticsOptions.options = deepClone(config.options);
    if (typeof config.options.pbuid !== 'string' || config.options.pbuid.length < 1) {
      logError('"options.pbuid" is required.');
      return false;
    }
    analyticsOptions.sampled = true;
    if (typeof config.options.sampling === 'number') {
      analyticsOptions.sampled = Math.random() < parseFloat(config.options.sampling);
    }

    analyticsOptions.pbuid = config.options.pbuid
    analyticsOptions.server = ANALYTICS_SERVER;
    return true;
  },
  sendEventMessage(endPoint, data) {
    logInfo(`AJAX: ${endPoint}: ` + JSON.stringify(data));

    ajax(`${analyticsOptions.server}${endPoint}`, null, JSON.stringify(data), {
      contentType: 'application/json'
    });
  },
  createCommonMessage(auctionId) {
    return {
      version: ANALYTICS_VERSION,
      auctionId: auctionId,
      referrer: window.location.href,
      sampling: analyticsOptions.options.sampling,
      prebid: '$prebid.version$',
      pbuid: analyticsOptions.pbuid,
      adUnits: {},
    };
  },
  serializeBidResponse(bid, status) {
    const result = {
      isTimeout: (status === BIDDER_STATUS.TIMEOUT),
      status: status,
    };
    if (status === BIDDER_STATUS.BID) {
      Object.assign(result, {
        time: bid.timeToRespond,
        cpm: bid.cpm,
        currency: bid.currency,
      });
    }
    return result;
  },
  addBidResponseToMessage(message, bid, status) {
    const adUnitCode = parseAdUnitCode(bid);
    message.adUnits[adUnitCode] = message.adUnits[adUnitCode] || {};
    const bidder = parseBidderCode(bid);
    message.adUnits[adUnitCode][bidder] = this.serializeBidResponse(bid, status);
  },
  createBidMessage(auctionEndArgs, timeoutBids) {
    const {auctionId, timestamp, auctionEnd, adUnitCodes, bidsReceived, noBids} = auctionEndArgs;
    const message = this.createCommonMessage(auctionId);

    message.auctionElapsed = (auctionEnd - timestamp);

    adUnitCodes.forEach((adUnitCode) => {
      message.adUnits[adUnitCode] = {};
    });

    // In this situation, the bid exists in both noBids and bids arrays.
    noBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.NO_BID));

    // This array may contain some timeout bids (responses come back after auction timeout)
    bidsReceived.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.BID));

    // We handle timeout after bids since it's possible that a bid has a response, but the response comes back
    // after auction end. In this case, the bid exists in both bidsReceived and timeoutBids arrays.
    timeoutBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.TIMEOUT));

    return message;
  },
  getCachedAuction(auctionId) {
    this.cachedAuctions[auctionId] = this.cachedAuctions[auctionId] || {
      timeoutBids: [],
    };
    return this.cachedAuctions[auctionId];
  },
  handleAuctionEnd(auctionEndArgs) {
    const cachedAuction = this.getCachedAuction(auctionEndArgs.auctionId);
    this.sendEventMessage('/',
      this.createBidMessage(auctionEndArgs, cachedAuction.timeoutBids)
    );
  },
  handleBidTimeout(timeoutBids) {
    timeoutBids.forEach((bid) => {
      const cachedAuction = this.getCachedAuction(bid.auctionId);
      cachedAuction.timeoutBids.push(bid);
    });
  },
  track({eventType, args}) {
    if (analyticsOptions.sampled) {
      switch (eventType) {
        case BID_TIMEOUT:
          this.handleBidTimeout(args);
          break;
        case AUCTION_END:
          this.handleAuctionEnd(args);
          break;
      }
    }
  },
  getAnalyticsOptions() {
    return analyticsOptions;
  },
});

greenbidsAnalyticsAdapter.originEnableAnalytics = greenbidsAnalyticsAdapter.enableAnalytics;

greenbidsAnalyticsAdapter.enableAnalytics = function(config) {
  this.initConfig(config);
  logInfo('loading greenbids analytics');
  greenbidsAnalyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: greenbidsAnalyticsAdapter,
  code: 'greenbids'
});

export default greenbidsAnalyticsAdapter;
