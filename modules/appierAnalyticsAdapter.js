import {ajax} from 'src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';

const utils = require('../src/utils');
const analyticsType = 'endpoint';

const DEFAULT_SERVER = 'https://prebid-analytics.c.appier.net/v1';
const ANALYTICS_VERSION = '0.1.0';
const SEND_TIMEOUT = 200;

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

// used for analytics
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
    return this.cache[auctionId].bids[adUnitCode][bidderCode];
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
  getStatus(auctionId, adUnitCode) {
    return this.cache[auctionId].status[adUnitCode];
  },
  setStatus(auctionId, adUnitCode, newValue) {
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
  }
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
      console.log('"options.affiliateId" is required.');
      return false;
    }
    if (typeof config.options.configId !== 'string' || config.options.configId.length < 1) {
      console.log('"options.configId" is required.');
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
  parseBidderCode(bid) {
    let bidderCode = bid.bidderCode || bid.bidder;
    return bidderCode.toLowerCase();
  },
  parseAdUnitCode(bidResponse) {
    return bidResponse.adUnitCode.toLowerCase();
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
    for (let bidderRequest of auction.bidderRequests) {
      const bidderCode = this.parseBidderCode(bidderRequest);
      for (let bid of bidderRequest.bids) {
        const adUnitCode = this.parseAdUnitCode(bid);
        cacheManager.initBidsCache(auction.auctionId, adUnitCode, bidderCode);
        cacheManager.setStatus(auction.auctionId, adUnitCode, AUCTION_STATUS.IN_PROGRESS);
      }
    }
  },
  handleBidRequestedMessage(bid) {
    const bidderCode = this.parseBidderCode(bid);
    for (let bid of bid.bids) {
      const adUnitCode = this.parseAdUnitCode(bid);
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.REQUESTED,
        'isTimeout': true, // First set to true to wait response
      });
    }
  },
  handleBidderDoneMessage(bid) {
    const bidderCode = this.parseBidderCode(bid);
    for (let bid of bid.bids) {
      const adUnitCode = this.parseAdUnitCode(bid);
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'isTimeout': cacheManager.getStatus(bid.auctionId, adUnitCode) === AUCTION_STATUS.COMPLETED
      });
    }
  },
  handleBidResponseMessage(bid) {
    const adUnitCode = this.parseAdUnitCode(bid);
    const bidderCode = this.parseBidderCode(bid);
    cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
      'time': bid.timeToRespond,
      // 'latency': Date.now() - bidResponse.requestTimestamp - bidResponse.timeToRespond,
      'status': BIDDER_STATUS.BID,
      'cpm': bid.cpm,
      'currency': bid.currency,
      'originalCpm': bid.originalCpm || bid.cpm,
      'cpmUsd': getCpmInUsd(bid),
      'originalCurrency': bid.originalCurrency || bid.currency,
      'isTimeout': cacheManager.getStatus(bid.auctionId, adUnitCode) === AUCTION_STATUS.FINISHED,
      'prebidWon': false
    });
  },
  handleBidAdjustmentMessage(bid) {
    const adUnitCode = this.parseAdUnitCode(bid);
    const bidderCode = this.parseBidderCode(bid);
    if (bid.cpm > cacheManager.getBidsCache(bid.auctionId, adUnitCode, bidderCode).cpm) {
      cacheManager.updateBidsCache(bid.auctionId, adUnitCode, bidderCode, {
        'cpm': bid.cpm,
        'cpmUsd': getCpmInUsd(bid)
      });
    }
  },
  handleBidTimeoutMessage(bidTimeoutList) {
    for (let bidTimeout of bidTimeoutList) {
      const adUnitCode = this.parseAdUnitCode(bidTimeout);
      const bidderCode = this.parseBidderCode(bidTimeout);
      cacheManager.updateBidsCache(bidTimeout.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.TIMEOUT,
        'isTimeout': true
      });
    }
  },
  handleBidAdMessage(bid) {
    const adUnitCode = this.parseAdUnitCode(bid);
    const bidderCode = this.parseBidderCode(bid);
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
    for (let adUnit of auction.adUnits) {
      const adUnitCode = adUnit.code.toLowerCase();
      cacheManager.setStatus(auction.auctionId, adUnitCode, AUCTION_STATUS.COMPLETED);
    }
    // Update no-bids in bidCache
    for (let noBid of auction.noBids) {
      const adUnitCode = this.parseAdUnitCode(noBid);
      const bidderCode = this.parseBidderCode(noBid);
      cacheManager.updateBidsCache(auction.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.NO_BID
      });
    }
  },
  handlePrebidWonMessage(prebidWonBids) {
    for (let prebidWonBid of prebidWonBids) {
      const adUnitCode = this.parseAdUnitCode(prebidWonBid);
      const bidderCode = this.parseBidderCode(prebidWonBid);
      cacheManager.updateBidsCache(prebidWonBid.auctionId, adUnitCode, bidderCode, {
        'prebidWon': true
      });
    }
  },
  handleAuctionEndMessage(args, highestCpmBids) {
    setTimeout(() => {
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
    }, SEND_TIMEOUT);
  },
  handleBidWonMessage(bidWonMessage) {
    const payload = this.buildBidWonMessage(bidWonMessage);
    this.sendEventMessage('imp', Object.assign({},
      cacheManager.cache[args.auctionId].header, payload
    ));
  },
  buildBidWonMessage(bid) {
    const adUnitCode = this.parseAdUnitCode(bid);
    const bidderCode = this.parseBidderCode(bid);
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
    console.log(`AJAX: ${endPoint}: ` + JSON.stringify(data));
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
          this.handleAuctionEndMessage(args, pbjs.getHighestCpmBids());
          break;
      }
    }
  },
  getAnalyticsOptions() {
    return analyticsOptions;
  },
  getCacheManager() {
    return cacheManager;
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
