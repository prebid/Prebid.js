import {ajax} from '../src/ajax.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import {deepClone, logError, logInfo} from '../src/utils.js';

const analyticsType = 'endpoint';

export const ANALYTICS_VERSION = '1.0.0';

const ANALYTICS_SERVER = 'https://a.greenbids.ai';

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
      adUnits: [],
    };
  },
  serializeBidResponse(bid, status) {
    return {
      bidder: bid.bidder,
      isTimeout: (status === BIDDER_STATUS.TIMEOUT),
      hasBid: (status === BIDDER_STATUS.BID),
    };
  },
  addBidResponseToMessage(message, bid, status) {
    const adUnitCode = bid.adUnitCode.toLowerCase();
    const adUnitIndex = message.adUnits.findIndex((adUnit) => {
      return adUnit.code === adUnitCode;
    });
    if (adUnitIndex === -1) {
      logError('Trying to add to non registered adunit');
      return;
    }
    const bidderIndex = message.adUnits[adUnitIndex].bidders.findIndex((bidder) => {
      return bidder.bidder === bid.bidder;
    });
    if (bidderIndex === -1) {
      message.adUnits[adUnitIndex].bidders.push(this.serializeBidResponse(bid, status));
    } else {
      if (status === BIDDER_STATUS.BID) {
        message.adUnits[adUnitIndex].bidders[bidderIndex].hasBid = true;
      } else if (status === BIDDER_STATUS.TIMEOUT) {
        message.adUnits[adUnitIndex].bidders[bidderIndex].isTimeout = true;
      }
    }
  },
  createBidMessage(auctionEndArgs, timeoutBids) {
    logInfo(auctionEndArgs)
    const {auctionId, timestamp, auctionEnd, adUnits, bidsReceived, noBids} = auctionEndArgs;
    const message = this.createCommonMessage(auctionId);

    message.auctionElapsed = (auctionEnd - timestamp);

    adUnits.forEach((adUnit) => {
      const adUnitCode = adUnit.code.toLowerCase();
      message.adUnits.push({
        code: adUnitCode,
        mediaTypes: {
          ...(adUnit.mediaTypes.banner !== undefined) && {banner: adUnit.mediaTypes.banner},
          ...(adUnit.mediaTypes.video !== undefined) && {video: adUnit.mediaTypes.video},
          ...(adUnit.mediaTypes.native !== undefined) && {native: adUnit.mediaTypes.native}
        },
        ortb2Imp: adUnit.ortb2Imp || {},
        bidders: [],
      });
    });

    // We enrich noBid then bids, then timeouts, because in case of a timeout, one response from a bidder
    // Can be in the 3 arrays, and we want that case reflected in the call
    noBids.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.NO_BID));

    bidsReceived.forEach(bid => this.addBidResponseToMessage(message, bid, BIDDER_STATUS.BID));

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
    switch (eventType) {
      case BID_TIMEOUT:
        this.handleBidTimeout(args);
        break;
      case AUCTION_END:
        this.handleAuctionEnd(args);
        break;
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
