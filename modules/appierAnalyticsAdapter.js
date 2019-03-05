import {ajax} from 'src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';

const utils = require('../src/utils');
const analyticsType = 'endpoint';
const DEFAULT_SERVER = 'https://analytics.c.apx.appier.net.dummy';
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

const analyticsOptions = {};
const eventCache = {};

function detectDevice() {
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

let appierAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {
  version: '1.0.190305',
  initConfig(config) {
    /**
     * Required option: affiliateId  // TODO: May not need this
     * Required option: configId
     *
     * Optional option: server
     * Optional option: sampling
     * Optional option: cr_sampling   // TODO: Need a better name
     * Optional option: autoPick
     * @type {boolean}
     */
    analyticsOptions.options = utils.deepClone(config.options);
    analyticsOptions.affiliateId = config.options.affiliateId || (config.options.affiliateId[0]) || null;
    if (!analyticsOptions.affiliateId) {
      console.log('"options.affiliateId" is required.');
      return false;
    }
    analyticsOptions.configId = config.options.configId || (config.options.configId[0]) || null;
    if (!analyticsOptions.configId) {
      console.log('"options.configId" is required.');
      return false;
    }

    analyticsOptions.server = config.options.server || DEFAULT_SERVER;
    analyticsOptions.sampled = typeof config.options.sampling === 'undefined' ||
      Math.random() < parseFloat(config.options.sampling);
    analyticsOptions.cr_sampled = typeof config.options.cr_sampling === 'undefined' ||
      Math.random() < parseFloat(config.options.cr_sampling);
    analyticsOptions.autoPick = config.options.autoPick || null;

    return true;
  },
  parseBidderCode(bidResponse) {
    return bidResponse.bidderCode.toLowerCase();
  },
  parseAdUnitCode(bidResponse) {
    return bidResponse.adUnitCode.toLowerCase();
  },
  initCommonMessageHeader(auction, cache) {
    cache[auction.auctionId] = {};
    cache[auction.auctionId].header = {
      'eventId': auction.auctionId,
      'version': appierAnalyticsAdapter.version,
      'affiliateId': analyticsOptions.affiliateId, // TODO: This may not required
      'configId': analyticsOptions.configId,
      'referrer': window.location.href,
      'device': detectDevice(), // TODO: May not need this, use UA at beacon instead?
      'sampling': analyticsOptions.options.sampling,
      'cr_sampling': analyticsOptions.options.cr_sampling, // TODO: need a better name OR remove
      'prebid': '$prebid.version$',
      'autoPick': analyticsOptions.options.autoPick,
      'timeout': auction.timeout
    };
  },
  initAuctionEventMessage(auction, cache) {
    cache[auction.auctionId].bids = {
      'start': auction.timestamp || Date.now(),
      'finish': 0,
      'adUnits': {}
    };
    if (analyticsOptions.cr_sampled) {
      cache[auction.auctionId].crs = {
        'adUnits': {}
      };
    }
    let adUnitCache = cache[auction.auctionId].bids.adUnits;
    let adUnitStatus = cache[auction.auctionId].status = {};

    // build nested object structure of bids within adUnits
    for (let bidderRequest of auction.bidderRequests) {
      let bidderCode = this.parseBidderCode(bidderRequest);
      for (let bid of bidderRequest.bids) {
        let adUnitCode = this.parseAdUnitCode(bid);
        adUnitCache[adUnitCode] = adUnitCache[adUnitCode] || {};
        adUnitCache[adUnitCode][bidderCode] = {};
        adUnitStatus[adUnitCode] = AUCTION_STATUS.IN_PROGRESS;
      }
    }
  },
  updateBidRequestedMessage(bidRequested, cache) {
    let bidderCode = this.parseBidderCode(bidRequested);
    let adUnitsCache = cache[bidRequested.auctionId].bids.adUnits;
    for (let bid of bidRequested.bids) {
      let adUnitCode = this.parseAdUnitCode(bid);
      Object.assign(adUnitsCache[adUnitCode][bidderCode], {
        'status': BIDDER_STATUS.REQUESTED,
        'isTimeout': cache[bidRequested.auctionId].status[adUnitCode] === true // First set to true to wait response
        // TODO: Other default values
      });
    }
  },
  updateBidderDoneMessage(bidRequested, cache) {
    let bidderCode = this.parseBidderCode(bidRequested);
    let adUnitsCache = cache[bidRequested.auctionId].bids.adUnits;
    for (let bid of bidRequested.bids) {
      let adUnitCode = this.parseAdUnitCode(bid);
      Object.assign(adUnitsCache[adUnitCode][bidderCode], {
        'isTimeout': cache[bidRequested.auctionId].status[adUnitCode] === AUCTION_STATUS.COMPLETED
      });
    }
  },
  updateBidResponseMessage(bidResponse, cache) {
    let adUnitCode = this.parseAdUnitCode(bidResponse);
    let bidderCode = this.parseBidderCode(bidResponse);
    let adUnitsCache = cache[bidResponse.auctionId].bids.adUnits;
    Object.assign(adUnitsCache[adUnitCode][bidderCode], {
      'time': bidResponse.timeToRespond,
      'latency': Date.now() - bidResponse.requestTimestamp - bidResponse.timeToRespond,
      'status': BIDDER_STATUS.BID,
      'cpm': bidResponse.cpm,
      'currency': bidResponse.currency,
      'originalCpm': bidResponse.originalCpm || bidResponse.cpm,
      'originalCurrency': bidResponse.originalCurrency || bidResponse.currency,
      'isTimeout': cache[bidResponse.auctionId].status[adUnitCode] === AUCTION_STATUS.FINISHED
    });
  },
  updateBidTimeoutMessage(bidTimeoutResponse, cache) {
    for (let bidTimeout of bidTimeoutResponse) {
      let adUnitCode = this.parseAdUnitCode(bidTimeoutResponse);
      let bidderCode = this.parseBidderCode(bidTimeoutResponse);
      let adUnitsCache = cache[bidTimeout.auctionId].bids.adUnits;
      Object.assign(adUnitsCache[adUnitCode][bidderCode], {
        'status': BIDDER_STATUS.TIMEOUT,
        'isTimeout': true
      });
    }
  },
  updateBidCreativeMessage(bidResponse, cache) {
    let adUnitCode = this.parseAdUnitCode(bidResponse);
    let bidderCode = this.parseBidderCode(bidResponse);
    let adUnits = cache[bidResponse.auctionId].crs.adUnits;
    adUnits[adUnitCode] = adUnits[adUnitCode] || {};
    adUnits[adUnitCode][bidderCode] = {
      'ads': bidResponse.ad
    };
  },
  updateAuctionEndMessage(auction, cache) {
    cache[auction.auctionId].bids.finish = auction.auctionEnd || Date.now();

    // Update cached auction status
    let adUnitStatus = cache[auction.auctionId].status;
    for (let adUnit of auction.adUnits) {
      let adUnitCode = adUnit.code.toLowerCase();
      adUnitStatus[adUnitCode] = AUCTION_STATUS.COMPLETED;
    }

    // Update no-bids in bidCache
    let adUnitsCache = cache[auction.auctionId].bids.adUnits;
    for (let noBid of auction.noBids) {
      let adUnitCode = this.parseAdUnitCode(noBid);
      let bidderCode = noBid.bidder.toLowerCase();
      adUnitsCache[adUnitCode][bidderCode].status = BIDDER_STATUS.NO_BID;
    }
  },
  buildBidWonMessage(bidWonResponse) {
    let adUnitCode = this.parseAdUnitCode(bidWonResponse);
    let bidderCode = this.parseBidderCode(bidWonResponse);
    let message = {
      'adUnits': {}
    };
    message.adUnits[adUnitCode] = {};
    message.adUnits[adUnitCode][bidderCode] = {
      'time': bidWonResponse.timeToRespond,
      'status': BIDDER_STATUS.BID_WON,
      'cpm': bidWonResponse.cpm,
      'currency': bidWonResponse.currency,
      'originalCpm': bidWonResponse.originalCpm || bidWonResponse.cpm,
      'originalCurrency': bidWonResponse.originalCurrency || bidWonResponse.currency,
      'isTimeout': false
    };
    console.log('buildBidWonMessage OK');
    return message;
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
          this.initCommonMessageHeader(args, eventCache);
          this.initAuctionEventMessage(args, eventCache);
          break;
        case BID_REQUESTED:
          // init bid request
          this.updateBidRequestedMessage(args, eventCache);
          break;
        case BID_ADJUSTMENT:
          // adjust the final price, use the higher one
          // TODO: update the adjusted price
          console.log(`BID_ADJUSTMENT: ${args.bidderCode}`);
          break;
        case BID_RESPONSE:
          // bid response if has bid
          this.updateBidResponseMessage(args, eventCache);
          if (analyticsOptions.cr_sampled) {
            this.updateBidCreativeMessage(args, eventCache);
          }
          break;
        case BIDDER_DONE:
          this.updateBidderDoneMessage(args, eventCache);
          break;
        case BID_WON:
          // only appear when bid won and has impression
          let bidWonMessage = this.buildBidWonMessage(args, eventCache);
          this.sendEventMessage('imp', Object.assign(
            {}, eventCache[args.auctionId].header, bidWonMessage
          ));
          break;
        case BID_TIMEOUT:
          // get a list of bid timeout, not always present
          this.updateBidTimeoutMessage(args, eventCache);
          break;
        case AUCTION_END:
          // auction end, response after this means timeout
          this.updateAuctionEndMessage(args, eventCache);
          this.sendEventMessage('bids', Object.assign(
            {}, eventCache[args.auctionId].header, eventCache[args.auctionId].bids)
          );
          if (analyticsOptions.cr_sampled) {
            this.sendEventMessage('cr', Object.assign(
              {}, eventCache[args.auctionId].header, eventCache[args.auctionId].crs)
            );
          }
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
