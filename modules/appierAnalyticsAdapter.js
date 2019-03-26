import {ajax} from 'src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';
import {logError, logInfo} from '../src/utils';

const utils = require('../src/utils');
const analyticsType = 'endpoint';

const DEFAULT_SERVER = 'https://prebid-analytics.c.appier.net/v1';
const ANALYTICS_VERSION = '0.1.0';
const SEND_TIMEOUT = 100;

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BID_ADJUSTMENT,
    BIDDER_DONE,
    BID_WON,
    BID_TIMEOUT
  }
} = CONSTANTS;

const AUCTION_STATUS = {
  'IN_PROGRESS': 'inProgress',
  'COMPLETED': 'completed'
};
const BIDDER_STATUS = {
  'REQUESTED': 'requested',
  'BID': 'bid',
  'NO_BID': 'noBid',
  'TIMEOUT': 'timeout',
  'BID_WON': 'bidWon'
};

export function detectDevice(userAgent) {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(userAgent))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent))) {
    return 'mobile';
  }
  return 'desktop';
}

const getCpmInUsd = function (bid) {
  if (bid.currency === 'USD') {
    return bid.cpm;
  } else {
    return bid.getCpmInNewCurrency('USD');
  }
};

const analyticsOptions = {};
const cacheManager = {
  cache: {},
  initAuction(auctionId) {
    this.cache[auctionId] = {
      header: {},
      bids: {
        adUnits: {}
      },
      ads: {
        adUnits: {}
      },
      status: {},
      bidsWon: {
        adUnits: {}
      }
    }
  },
  setHeaderCache(auctionId, newObject) {
    this.cache[auctionId].header = newObject;
  },
  updateHeaderCache(auctionId, newObject) {
    Object.assign(this.cache[auctionId].header, newObject)
  },
  getBidsCache(auctionId, adUnitCode, bidderCode) {
    return this.cache[auctionId].bids.adUnits[adUnitCode][bidderCode];
  },
  initBidsCache(auctionId, adUnitCode, bidderCode) {
    const bidsCacheSection = this.cache[auctionId].bids.adUnits;
    bidsCacheSection[adUnitCode] = bidsCacheSection[adUnitCode] || {};
    bidsCacheSection[adUnitCode][bidderCode] = bidsCacheSection[adUnitCode][bidderCode] || {};
  },
  updateBidsCache(auctionId, adUnitCode, bidderCode, newObject) {
    const bidsCacheSection = this.cache[auctionId].bids.adUnits;
    Object.assign(bidsCacheSection[adUnitCode][bidderCode], newObject)
  },
  getAuctionStatus(auctionId, adUnitCode) {
    return this.cache[auctionId].status[adUnitCode];
  },
  setAuctionStatus(auctionId, adUnitCode, newValue) {
    this.cache[auctionId].status[adUnitCode] = newValue;
  },
  setAdCache(auctionId, adUnitCode, bidderCode, newObject) {
    const crsCacheSection = this.cache[auctionId].ads.adUnits;
    crsCacheSection[adUnitCode] = crsCacheSection[adUnitCode] || {};
    crsCacheSection[adUnitCode][bidderCode] = newObject;
  },
  setBidWonCache(auctionId, adUnitCode, bidderCode, newObject) {
    const bidsWonCacheSection = this.cache[auctionId].bidsWon.adUnits;
    bidsWonCacheSection[adUnitCode] = bidsWonCacheSection[adUnitCode] || {};
    bidsWonCacheSection[adUnitCode][bidderCode] = newObject;
  },
  isBidderTimeout(auctionId, adUnitCode, bidderCode) {
    const bid = cacheManager.getBidsCache(auctionId, adUnitCode, bidderCode);
    return this.getAuctionStatus(auctionId, adUnitCode) === AUCTION_STATUS.COMPLETED ||
      bid.status === BIDDER_STATUS.TIMEOUT
  }
};

const parseBidderCode = function (bid) {
  let bidderCode = bid.bidderCode || bid.bidder;
  return bidderCode.toLowerCase();
};

const parseAdUnitCode = function (bidResponse) {
  return bidResponse.adUnitCode.toLowerCase();
};

export const appierAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {

  initConfig(config) {
    /**
     * Required option: affiliateId
     * Required option: configId
     *
     * Optional option: server
     * Optional option: sampling
     * Optional option: adSampling
     * Optional option: autoPick
     * @type {boolean}
     */
    analyticsOptions.options = utils.deepClone(config.options);
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

    analyticsOptions.sampled = true; // Default is to collect bids data
    if (typeof config.options.sampling === 'number') {
      analyticsOptions.sampled = Math.random() < parseFloat(config.options.sampling);
    }
    analyticsOptions.adSampled = false; // Default is *NOT* to collect creative
    if (typeof config.options.adSampling === 'number') {
      analyticsOptions.adSampled = Math.random() < parseFloat(config.options.adSampling);
    }
    analyticsOptions.autoPick = config.options.autoPick || null;

    return true;
  },
  initCommonMessageHeader(auction) {
    cacheManager.setHeaderCache(auction.auctionId, {
      'eventId': auction.auctionId,
      'version': ANALYTICS_VERSION,
      'affiliateId': analyticsOptions.affiliateId,
      'configId': analyticsOptions.configId,
      'referrer': window.location.href,
      'device': detectDevice(navigator.userAgent.toLowerCase()),
      'sampling': analyticsOptions.options.sampling,
      'adSampling': analyticsOptions.options.adSampling,
      'prebid': '$prebid.version$',
      'autoPick': analyticsOptions.options.autoPick,
      'timeout': auction.timeout,
      'start': auction.timestamp || Date.now(),
      'finish': 0,
    });
  },
  initAuctionEventMessage(auction) {
    // build nested object structure of bids within adUnits
    auction.bidderRequests.forEach(function (bidderRequest) {
      const bidderCode = parseBidderCode(bidderRequest);
      bidderRequest.bids.forEach(function (bid) {
        const adUnitCode = parseAdUnitCode(bid);
        cacheManager.initBidsCache(auction.auctionId, adUnitCode, bidderCode);
        cacheManager.setAuctionStatus(auction.auctionId, adUnitCode, AUCTION_STATUS.IN_PROGRESS);
      });
    });
  },
  handleBidRequestedMessage(bidMessage) {
    const bidderCode = parseBidderCode(bidMessage);
    bidMessage.bids.forEach(function (bid) {
      const adUnitCode = parseAdUnitCode(bid);
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.REQUESTED,
        'isTimeout': true, // First set to true to wait response
      });
    });
  },
  handleBidderDoneMessage(bidMessage) {
    const bidderCode = parseBidderCode(bidMessage);
    bidMessage.bids.forEach(function (bid) {
      const adUnitCode = parseAdUnitCode(bid);
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'isTimeout': cacheManager.isBidderTimeout(bid.auctionId, adUnitCode, bidderCode)
      });
    });
  },
  handleBidResponseMessage(bid) {
    const adUnitCode = parseAdUnitCode(bid);
    const bidderCode = parseBidderCode(bid);
    const isBidderTimeout = cacheManager.isBidderTimeout(bid.auctionId, adUnitCode, bidderCode);
    cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
      'time': bid.timeToRespond,
      'status': (isBidderTimeout) ? BIDDER_STATUS.TIMEOUT : BIDDER_STATUS.BID,
      'cpm': bid.cpm,
      'currency': bid.currency,
      'originalCpm': bid.originalCpm || bid.cpm,
      'cpmUsd': getCpmInUsd(bid),
      'originalCurrency': bid.originalCurrency || bid.currency,
      'isTimeout': isBidderTimeout,
      'prebidWon': false
    });
  },
  handleBidAdjustmentMessage(bid) {
    const adUnitCode = parseAdUnitCode(bid);
    const bidderCode = parseBidderCode(bid);
    if (bid.cpm > cacheManager.getBidsCache(bid.auctionId, adUnitCode, bidderCode).cpm) {
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'cpm': bid.cpm,
        'cpmUsd': getCpmInUsd(bid)
      });
    }
  },
  handleBidTimeoutMessage(bidTimeoutList) {
    bidTimeoutList.forEach(function (bid) {
      const adUnitCode = parseAdUnitCode(bid);
      const bidderCode = parseBidderCode(bid);
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.TIMEOUT,
        'isTimeout': true
      });
    });
  },
  handleBidAdMessage(bid) {
    const adUnitCode = parseAdUnitCode(bid);
    const bidderCode = parseBidderCode(bid);
    cacheManager.setAdCache(bid.auctionId, adUnitCode, bidderCode, {
      'ads': bid.ad
    });
  },
  updateAuctionEndMessage(auction) {
    // Set finished time
    cacheManager.updateHeaderCache(auction.auctionId, {
      'finish': auction.auctionEnd || Date.now()
    });
    // Update cached auction status
    auction.adUnits.forEach(function (adUnit) {
      const adUnitCode = adUnit.code.toLowerCase();
      cacheManager.setAuctionStatus(auction.auctionId, adUnitCode, AUCTION_STATUS.COMPLETED);
    });
    // Update no-bids in bidCache
    auction.noBids.forEach(function (noBid) {
      const adUnitCode = parseAdUnitCode(noBid);
      const bidderCode = parseBidderCode(noBid);
      if (cacheManager.isBidderTimeout(auction.auctionId, adUnitCode, bidderCode)) {
        cacheManager.updateBidsCache(auction.auctionId, adUnitCode, bidderCode, {
          'status': BIDDER_STATUS.TIMEOUT,
          'isTimeout': true
        });
      } else {
        cacheManager.updateBidsCache(auction.auctionId, adUnitCode, bidderCode, {
          'status': BIDDER_STATUS.NO_BID,
          'isTimeout': false
        });
      }
    });
  },
  handlePrebidWonMessage(prebidWonBids) {
    prebidWonBids.forEach(function (bid) {
      const adUnitCode = parseAdUnitCode(bid);
      const bidderCode = parseBidderCode(bid);
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'prebidWon': true
      });
    });
  },
  handleAuctionEndMessage(args, highestCpmBids) {
    this.updateAuctionEndMessage(args);
    this.handlePrebidWonMessage(highestCpmBids);
    this.sendEventMessage('bid', Object.assign({},
      cacheManager.cache[args.auctionId].header,
      cacheManager.cache[args.auctionId].bids
    ));
    if (analyticsOptions.adSampled) {
      this.sendEventMessage('cr', Object.assign({},
        cacheManager.cache[args.auctionId].header,
        cacheManager.cache[args.auctionId].ads
      ));
    }
  },
  handleBidWonMessage(bidWonMessage) {
    const payload = this.buildBidWonMessage(bidWonMessage);
    this.sendEventMessage('imp', Object.assign({},
      cacheManager.cache[bidWonMessage.auctionId].header, payload
    ));
  },
  buildBidWonMessage(bid) {
    const adUnitCode = parseAdUnitCode(bid);
    const bidderCode = parseBidderCode(bid);
    const bidMessage = {
      'time': bid.timeToRespond,
      'status': BIDDER_STATUS.BID_WON,
      'cpm': bid.cpm,
      'currency': bid.currency,
      'originalCpm': bid.originalCpm || bid.cpm,
      'originalCurrency': bid.originalCurrency || bid.currency,
      'cpmUsd': getCpmInUsd(bid),
      'isTimeout': false,
      'prebidWon': true
    };
    cacheManager.setBidWonCache(bid.auctionId, adUnitCode, bidderCode, bidMessage);
    return {
      adUnits: {
        [adUnitCode]: {
          [bidderCode]: bidMessage
        }
      }
    };
  },
  sendEventMessage(endPoint, data) {
    logInfo(`AJAX: ${endPoint}: ` + JSON.stringify(data));

    ajax(`${analyticsOptions.server}/${endPoint}`, null, JSON.stringify(data), {
      contentType: 'application/json'
    });
  },
  track({eventType, args}) {
    if (analyticsOptions.sampled) {
      switch (eventType) {
        case AUCTION_INIT:
          cacheManager.initAuction(args.auctionId);
          this.initCommonMessageHeader(args);
          this.initAuctionEventMessage(args);
          break;
        case BID_REQUESTED:
          this.handleBidRequestedMessage(args);
          break;
        case BID_ADJUSTMENT:
          this.handleBidAdjustmentMessage(args);
          break;
        case BID_RESPONSE:
          this.handleBidResponseMessage(args);
          if (analyticsOptions.adSampled) {
            this.handleBidAdMessage(args);
          }
          break;
        case BIDDER_DONE:
          this.handleBidderDoneMessage(args);
          break;
        case BID_WON:
          this.handleBidWonMessage(args);
          break;
        case BID_TIMEOUT:
          this.handleBidTimeoutMessage(args);
          break;
        case AUCTION_END:
          setTimeout(() => {
            this.handleAuctionEndMessage(args, pbjs.getHighestCpmBids());
          }, SEND_TIMEOUT);
          break;
      }
    }
  },
  getAnalyticsOptions() {
    return analyticsOptions;
  },
  getCache() {
    return cacheManager.cache;
  }
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
