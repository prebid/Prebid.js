import {ajax} from 'src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';

const utils = require('../src/utils');
const analyticsType = 'endpoint';

const DEFAULT_SERVER = 'https://analytics.c.apx.appier.net.dummy';
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

function detectDevice() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

const analyticsOptions = {};
const cacheManager = {
  cache: {},
  initAuction(auctionId) {
    this.cache[auctionId] = {
      header: {},
      bids: {
        adUnits: {}
      },
      crs: {
        adUnits: {}
      },
      status: {},
      bidsWon: {
        adUnits: {}
      }
    }
  },
  setCachedHeader(auctionId, newObject) {
    this.cache[auctionId].header = newObject;
  },
  updateCachedHeader(auctionId, newObject) {
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
  setCrsCache(auctionId, adUnitCode, bidderCode, newObject) {
    const crsCacheSection = this.cache[auctionId].crs.adUnits;
    crsCacheSection[adUnitCode] = crsCacheSection[adUnitCode] || {};
    crsCacheSection[adUnitCode][bidderCode] = newObject;
  },
  setBidWonCache(auctionId, adUnitCode, bidderCode, newObject) {
    const bidsWonCacheSection = this.cache[auctionId].bidsWon.adUnits;
    bidsWonCacheSection[adUnitCode] = bidsWonCacheSection[adUnitCode] || {};
    bidsWonCacheSection[adUnitCode][bidderCode] = newObject;
  }
};

const appierAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {

  initConfig(config) {
    /**
     * Required option: affiliateId  // TODO: May not need this
     * Required option: configId
     *
     * Optional option: server
     * Optional option: sampling
     * Optional option: crSampling   // TODO: Need a better name
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
    analyticsOptions.crSampled = false; // Default is *NOT* to collect creative
    if (typeof config.options.crSampling === 'number') {
      analyticsOptions.crSampled = Math.random() < parseFloat(config.options.crSampling);
    }
    analyticsOptions.autoPick = config.options.autoPick || null;

    return true;
  },
  parseBidderCode(bidResponse) {
    return bidResponse.bidderCode.toLowerCase();
  },
  parseAdUnitCode(bidResponse) {
    return bidResponse.adUnitCode.toLowerCase();
  },
  initCommonMessageHeader(auction) {
    cacheManager.setCachedHeader(auction.auctionId, {
      'eventId': auction.auctionId,
      'version': ANALYTICS_VERSION,
      'affiliateId': analyticsOptions.affiliateId,
      'configId': analyticsOptions.configId,
      'referrer': window.location.href,
      'device': detectDevice(), // TODO: May not need this, use UA at beacon instead?
      'sampling': analyticsOptions.options.sampling,
      'crSampling': analyticsOptions.options.crSampling, // TODO: need a better name OR remove
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
  updateBidRequestedMessage(bidRequested) {
    const bidderCode = this.parseBidderCode(bidRequested);
    for (let bid of bidRequested.bids) {
      const adUnitCode = this.parseAdUnitCode(bid);
      cacheManager.updateBidsCache(bidRequested.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.REQUESTED,
        'isTimeout': true // First set to true to wait response
        // TODO: Other default values
      });
    }
  },
  updateBidderDoneMessage(bidRequested) {
    const bidderCode = this.parseBidderCode(bidRequested);
    for (let bid of bidRequested.bids) {
      const adUnitCode = this.parseAdUnitCode(bid);
      cacheManager.updateBidsCache(bidRequested.auctionId, adUnitCode, bidderCode, {
        'isTimeout': cacheManager.getStatus(bidRequested.auctionId, adUnitCode) === AUCTION_STATUS.COMPLETED
      });
    }
  },
  updateBidResponseMessage(bidResponse) {
    const adUnitCode = this.parseAdUnitCode(bidResponse);
    const bidderCode = this.parseBidderCode(bidResponse);
    cacheManager.updateBidsCache(bidResponse.auctionId, adUnitCode, bidderCode, {
      'time': bidResponse.timeToRespond,
      // 'latency': Date.now() - bidResponse.requestTimestamp - bidResponse.timeToRespond,
      'status': BIDDER_STATUS.BID,
      'cpm': bidResponse.cpm,
      'currency': bidResponse.currency,
      'originalCpm': bidResponse.originalCpm || bidResponse.cpm,
      'cpmUsd': 'TBD', // TODO: fill this
      'originalCurrency': bidResponse.originalCurrency || bidResponse.currency,
      'isTimeout': cacheManager.getStatus(bidResponse.auctionId, adUnitCode) === AUCTION_STATUS.FINISHED,
      'prebidWon': false
    });
  },
  updateBidAdjustmentMessage(bidAdjustmentMessage) {
    const auctionId = bidAdjustmentMessage.auctionId;
    const adUnitCode = this.parseAdUnitCode(bidAdjustmentMessage);
    const bidderCode = this.parseBidderCode(bidAdjustmentMessage);
    if (bidAdjustmentMessage.cpm > cacheManager.getBidsCache(auctionId, adUnitCode, bidderCode).cpm) {
      cacheManager.updateBidsCache(auctionId, adUnitCode, bidderCode, {
        'cpm': bidAdjustmentMessage.cpm
        // bidAdjustment has no original CPM, Leave it as it was
        // TODO: update adjusted cpmUsd
      });
    }
  },
  updateBidTimeoutMessage(bidTimeoutResponse) {
    for (let bidTimeout of bidTimeoutResponse) {
      const auctionId = bidTimeout.auctionId;
      const adUnitCode = this.parseAdUnitCode(bidTimeout);
      const bidderCode = this.parseBidderCode(bidTimeout);
      cacheManager.updateBidsCache(auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.TIMEOUT,
        'isTimeout': true
      });
    }
  },
  updateBidCreativeMessage(bidResponse) {
    const adUnitCode = this.parseAdUnitCode(bidResponse);
    const bidderCode = this.parseBidderCode(bidResponse);
    cacheManager.setCrsCache(bidResponse.auctionId, adUnitCode, bidderCode, {
      'ads': bidResponse.ad
    });
  },
  updateAuctionEndMessage(auction) {
    // Set finished time
    cacheManager.updateCachedHeader(auction.auctionId, {
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
      const bidderCode = noBid.bidder.toLowerCase(); // TODO: noBid response has no bidderCode, need to check.
      cacheManager.updateBidsCache(auction.auctionId, adUnitCode, bidderCode, {
        'status': BIDDER_STATUS.NO_BID
      });
    }
  },
  updatePrebidWonMessage(prebidWonBids) {
    for (let prebidWonBid of prebidWonBids) {
      const adUnitCode = this.parseAdUnitCode(prebidWonBid);
      const bidderCode = this.parseBidderCode(prebidWonBid);
      cacheManager.updateBidsCache(prebidWonBid.auctionId, adUnitCode, bidderCode, {
        'prebidWon': true
      });
    }
  },
  buildBidWonMessage(bidWonResponse) {
    const adUnitCode = this.parseAdUnitCode(bidWonResponse);
    const bidderCode = this.parseBidderCode(bidWonResponse);
    cacheManager.setBidWonCache(bidWonResponse.auctionId, adUnitCode, bidderCode, {
      'time': bidWonResponse.timeToRespond,
      'status': BIDDER_STATUS.BID_WON,
      'cpm': bidWonResponse.cpm,
      'currency': bidWonResponse.currency,
      'originalCpm': bidWonResponse.originalCpm || bidWonResponse.cpm,
      'originalCurrency': bidWonResponse.originalCurrency || bidWonResponse.currency,
      'isTimeout': false
    });
  },
  sendEventMessage (endPoint, data) {
    console.log(`AJAX: ${endPoint}: ` + JSON.stringify(data));
    ajax(`${analyticsOptions.server}/${endPoint}`, null, JSON.stringify(data), {
      contentType: 'application/json'
    });
  },
  track({eventType, args}) {
    if (analyticsOptions.sampled) {
      switch (eventType) {
        case AUCTION_INIT:
          // init auction, always the first event
          cacheManager.initAuction(args.auctionId);
          this.initCommonMessageHeader(args);
          this.initAuctionEventMessage(args);
          break;
        case BID_REQUESTED:
          // init bid request
          this.updateBidRequestedMessage(args);
          break;
        case BID_ADJUSTMENT:
          // adjust the final cpm price, use the higher one
          this.updateBidAdjustmentMessage(args);
          break;
        case BID_RESPONSE:
          // bid response if has bid
          this.updateBidResponseMessage(args);
          if (analyticsOptions.crSampled) {
            this.updateBidCreativeMessage(args);
          }
          break;
        case BIDDER_DONE:
          this.updateBidderDoneMessage(args);
          break;
        case BID_WON:
          // only appear when bid won and has impression
          console.log('############ BID WON!! ############');
          this.buildBidWonMessage(args);
          this.sendEventMessage('imp', Object.assign({},
            cacheManager.cache[args.auctionId].header,
            cacheManager.cache[args.auctionId].bidsWon
          ));
          break;
        case BID_TIMEOUT:
          // get a list of bid timeout, not always present
          this.updateBidTimeoutMessage(args);
          break;
        case AUCTION_END:
          // auction end, response after this means timeout
          // TODO: add a flag to record messages has sent
          console.log(`AUCTION_END: ` + JSON.stringify(args));
          setTimeout(() => {
            this.updateAuctionEndMessage(args);
            this.updatePrebidWonMessage(pbjs.getHighestCpmBids());
            this.sendEventMessage('bid', Object.assign({},
              cacheManager.cache[args.auctionId].header,
              cacheManager.cache[args.auctionId].bids
            ));
            if (analyticsOptions.crSampled) {
              this.sendEventMessage('cr', Object.assign({},
                cacheManager.cache[args.auctionId].header,
                cacheManager.cache[args.auctionId].crs
              ));
            }
          }, SEND_TIMEOUT);
          break;
      }
    }
  }
});

// save the base class function
appierAnalyticsAdapter.originEnableAnalytics = appierAnalyticsAdapter.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
appierAnalyticsAdapter.enableAnalytics = function (config) {
  if (this.initConfig(config)) {
    console.log('AppierAnalyticsAdapter enabled.');
    appierAnalyticsAdapter.originEnableAnalytics(config); // call the base class function
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: appierAnalyticsAdapter,
  code: 'appierAnalytics'
});
