import {ajax} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';
import {getGlobal} from '../src/prebidGlobal';
import {logError, logInfo, deepClone} from '../src/utils';

const analyticsType = 'endpoint';

export const ANALYTICS_VERSION = '1.0.0';

const DEFAULT_SERVER = 'https://prebid-analytics.c.appier.net/v1';

const {
  EVENTS: {
    AUCTION_END,
    BID_WON,
    BID_TIMEOUT
  }
} = CONSTANTS;

export const BIDDER_STATUS = {
  BID: 'bid',
  NO_BID: 'noBid',
  BID_WON: 'bidWon',
  TIMEOUT: 'timeout'
};

export const getCpmInUsd = function (bid) {
  if (bid.currency === 'USD') {
    return bid.cpm;
  } else {
    return bid.getCpmInNewCurrency('USD');
  }
};

const analyticsOptions = {};

export const parseBidderCode = function (bid) {
  let bidderCode = bid.bidderCode || bid.bidder;
  return bidderCode.toLowerCase();
};

export const parseAdUnitCode = function (bidResponse) {
  return bidResponse.adUnitCode.toLowerCase();
};

export const appierAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {

  cachedAuctions: {},

  initConfig(config) {
    /**
     * Required option: affiliateId
     * Required option: configId
     *
     * Optional option: server
     * Optional option: sampling
     * Optional option: adSampling
     * Optional option: autoPick
     * Optional option: predictionId
     * @type {boolean}
     */
    analyticsOptions.options = deepClone(config.options);
    if (typeof config.options.affiliateId !== 'string' || config.options.affiliateId.length < 1) {
      logError('"options.affiliateId" is required.');
      return false;
    }
    if (typeof config.options.configId !== 'string' || config.options.configId.length < 1) {
      logError('"options.configId" is required.');
      return false;
    }

    analyticsOptions.affiliateId = config.options.affiliateId;
    analyticsOptions.configId = config.options.configId;
    analyticsOptions.server = config.options.server || DEFAULT_SERVER;

    analyticsOptions.sampled = true;
    if (typeof config.options.sampling === 'number') {
      analyticsOptions.sampled = Math.random() < parseFloat(config.options.sampling);
    }
    analyticsOptions.adSampled = false;
    if (typeof config.options.adSampling === 'number') {
      analyticsOptions.adSampled = Math.random() < parseFloat(config.options.adSampling);
    }
    analyticsOptions.autoPick = config.options.autoPick || null;
    analyticsOptions.predictionId = config.options.predictionId || null;

    return true;
  },
  sendEventMessage(endPoint, data) {
    logInfo(`AJAX: ${endPoint}: ` + JSON.stringify(data));

    ajax(`${analyticsOptions.server}/${endPoint}`, null, JSON.stringify(data), {
      contentType: 'application/json',
      withCredentials: true
    });
  },
  createCommonMessage(auctionId) {
    return {
      version: ANALYTICS_VERSION,
      auctionId: auctionId,
      affiliateId: analyticsOptions.affiliateId,
      configId: analyticsOptions.configId,
      referrer: window.location.href,
      sampling: analyticsOptions.options.sampling,
      adSampling: analyticsOptions.options.adSampling,
      prebid: '$prebid.version$',
      autoPick: analyticsOptions.autoPick,
      predictionId: analyticsOptions.predictionId,
      adUnits: {},
    };
  },
  serializeBidResponse(bid, status) {
    const result = {
      prebidWon: (status === BIDDER_STATUS.BID_WON),
      isTimeout: (status === BIDDER_STATUS.TIMEOUT),
      status: status,
    };
    if (status === BIDDER_STATUS.BID || status === BIDDER_STATUS.BID_WON) {
      Object.assign(result, {
        time: bid.timeToRespond,
        cpm: bid.cpm,
        currency: bid.currency,
        originalCpm: bid.originalCpm || bid.cpm,
        cpmUsd: getCpmInUsd(bid),
        originalCurrency: bid.originalCurrency || bid.currency,
      });
    }
    return result;
  },
  addBidResponseToMessage(message, bid, status) {
    const adUnitCode = parseAdUnitCode(bid);
    message.adUnits[adUnitCode] = message.adUnits[adUnitCode] || {};
    const bidder = parseBidderCode(bid);
    const bidResponse = this.serializeBidResponse(bid, status);
    message.adUnits[adUnitCode][bidder] = bidResponse;
  },
  createBidMessage(auctionEndArgs, winningBids, timeoutBids) {
    const {auctionId, timestamp, timeout, auctionEnd, adUnitCodes, bidsReceived, noBids} = auctionEndArgs;
    const message = this.createCommonMessage(auctionId);

    message.auctionElapsed = (auctionEnd - timestamp);
    message.timeout = timeout;

    adUnitCodes.forEach((adUnitCode) => {
      message.adUnits[adUnitCode] = {};
    });

    // We handled noBids first because when currency conversion is enabled, a bid with a foreign currency
    // will be set to NO_BID initially, and then set to BID after the currency rate json file is fully loaded.
    // In this situation, the bid exists in both noBids and bids arrays.
    noBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.NO_BID));

    // This array may contain some timeout bids (responses come back after auction timeout)
    bidsReceived.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.BID));

    // We handle timeout after bids since it's possible that a bid has a response, but the response comes back
    // after auction end. In this case, the bid exists in both bidsReceived and timeoutBids arrays.
    timeoutBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.TIMEOUT));

    // mark the winning bids with prebidWon = true
    winningBids.forEach(bid => {
      const adUnitCode = parseAdUnitCode(bid);
      const bidder = parseBidderCode(bid);
      message.adUnits[adUnitCode][bidder].prebidWon = true;
    });
    return message;
  },
  createImpressionMessage(bid) {
    const message = this.createCommonMessage(bid.auctionId);
    this.addBidResponseToMessage(message, bid, BIDDER_STATUS.BID_WON);
    return message;
  },
  createCreativeMessage(auctionId, bids) {
    const message = this.createCommonMessage(auctionId);
    bids.forEach((bid) => {
      const adUnitCode = parseAdUnitCode(bid);
      const bidder = parseBidderCode(bid);
      message.adUnits[adUnitCode] = message.adUnits[adUnitCode] || {};
      message.adUnits[adUnitCode][bidder] = {ad: bid.ad};
    });
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
    const highestCpmBids = getGlobal().getHighestCpmBids();
    this.sendEventMessage('bid',
      this.createBidMessage(auctionEndArgs, highestCpmBids, cachedAuction.timeoutBids)
    );
    if (analyticsOptions.adSampled) {
      this.sendEventMessage('cr',
        this.createCreativeMessage(auctionEndArgs.auctionId, auctionEndArgs.bidsReceived)
      );
    }
  },
  handleBidTimeout(timeoutBids) {
    timeoutBids.forEach((bid) => {
      const cachedAuction = this.getCachedAuction(bid.auctionId);
      cachedAuction.timeoutBids.push(bid);
    });
  },
  handleBidWon(bidWonArgs) {
    this.sendEventMessage('imp', this.createImpressionMessage(bidWonArgs));
  },
  track({eventType, args}) {
    if (analyticsOptions.sampled) {
      switch (eventType) {
        case BID_WON:
          this.handleBidWon(args);
          break;
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

// save the base class function
appierAnalyticsAdapter.originEnableAnalytics = appierAnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
appierAnalyticsAdapter.enableAnalytics = function (config) {
  if (this.initConfig(config)) {
    appierAnalyticsAdapter.originEnableAnalytics(config); // call the base class function
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: appierAnalyticsAdapter,
  code: 'appierAnalytics'
});
