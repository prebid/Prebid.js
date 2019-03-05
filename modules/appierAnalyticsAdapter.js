import {ajax} from 'src/ajax'; // ajaxBuilder()
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';

const utils = require('../src/utils');
const analyticsType = 'endpoint';
const DEFAULT_SERVER = 'analytics.c.apx.appier.net.dummy';
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

let analyticsOptions = {};

const eventCache = {};

function detectDevice() { // Need Unit testing
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(navigator.userAgent.toLowerCase()))) {
    return 'tablet';
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(navigator.userAgent.toLowerCase()))) {
    return 'mobile';
  }
  return 'desktop';
}

let appierAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {
  version: '1.0.1903', // TODO: make this const?

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
    analyticsOptions.options = utils.deepClone(config.options); // Make a copy so we can access it later
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
  initCommonMessageHeader(auction, cache) {
    console.log('initCommonMessageHeader');
    cache[auction.auctionId] = cache[auction.auctionId] || {};
    return cache[auction.auctionId].header = {
      'eventId': auction.auctionId,
      'version': appierAnalyticsAdapter.version, // AnalyticsAdapter version
      'affiliateId': analyticsOptions.affiliateId, // TODO: This may not required
      'configId': analyticsOptions.configId,
      'referrer': window.location.href,
      'device': detectDevice(), // TODO: May not need this, append UA at beacon
      'sampling': analyticsOptions.options.sampling,
      'cr_sampling': analyticsOptions.options.cr_sampling, // TODO: need a better name OR remove
      'prebid': '$prebid.version$',
      'autoPick': analyticsOptions.options.autoPick,
      'timeout': auction.timeout
    };
  },
  initAuctionEventMessage(auction, cache) {
    console.log('initAuctionEventMessage');
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
    let adUnits = cache[auction.auctionId].bids.adUnits;
    let adUnitStatus = cache[auction.auctionId].status = {};

    // build nested object structure of bids within adUnits
    for (let bidderRequest of auction.bidderRequests) {
      for (let bid of bidderRequest.bids) {
        let adUnitCode = bid.adUnitCode.toLowerCase();
        let bidderCode = bidderRequest.bidderCode.toLowerCase();
        adUnits[adUnitCode] = adUnits[adUnitCode] || {};
        adUnits[adUnitCode][bidderCode] = {};
        adUnitStatus[adUnitCode] = AUCTION_STATUS.IN_PROGRESS;
      }
    }
    console.log('initAuctionEventMessage OK');
  },
  updateBidRequestedMessage(bidRequested, cache) {
    console.log('updateBidRequestedMessage');
    // build nested object structure of bids within adUnits
    let bidderCode = bidRequested.bidderCode.toLowerCase();
    let adUnitsCache = cache[bidRequested.auctionId].bids.adUnits;
    for (let bid of bidRequested.bids) {
      let adUnitCode = bid.adUnitCode.toLowerCase();
      Object.assign(adUnitsCache[adUnitCode][bidderCode], {
        'status': BIDDER_STATUS.REQUESTED, // Default to NO_BID until response occurs
        'isTimeout': cache[bidRequested.auctionId].status[adUnitCode] === true // First set to true to wait response
      });
    }
    console.log('updateBidRequestedMessage OK');
  },
  updateBidderDoneMessage(bidRequested, cache) {
    console.log('updateBidRequestedMessage');
    // build nested object structure of bids within adUnits
    let bidderCode = bidRequested.bidderCode.toLowerCase();
    let adUnitsCache = cache[bidRequested.auctionId].bids.adUnits;
    for (let bid of bidRequested.bids) {
      let adUnitCode = bid.adUnitCode.toLowerCase();
      Object.assign(adUnitsCache[adUnitCode][bidderCode], {
        'isTimeout': cache[bidRequested.auctionId].status[adUnitCode] === AUCTION_STATUS.COMPLETED
      });
    }
    console.log('updateBidRequestedMessage OK');
  },
  updateBidResponseMessage(bidResponse, cache) {
    console.log('updateBidResponseMessage');
    let adUnitCode = bidResponse.adUnitCode.toLowerCase();
    let bidderCode = bidResponse.bidderCode.toLowerCase();
    // console.log('# RESPONSE requestTimestamp: ' + (Date.now() - bidResponse.requestTimestamp));
    Object.assign(cache[bidResponse.auctionId].bids.adUnits[adUnitCode][bidderCode], {
      'time': bidResponse.timeToRespond,
      'latency': Date.now() - bidResponse.requestTimestamp - bidResponse.timeToRespond, // rubicon did this
      'status': BIDDER_STATUS.BID,
      'cpm': bidResponse.cpm,
      'currency': bidResponse.currency,
      'originalCpm': bidResponse.originalCpm || bidResponse.cpm,
      'originalCurrency': bidResponse.originalCurrency || bidResponse.currency,
      'isTimeout': cache[bidResponse.auctionId].status[adUnitCode] === AUCTION_STATUS.FINISHED
    });
    console.log('updateBidResponseMessage OK');
  },
  updateBidTimeoutMessage(bidTimeoutResponse, cache) {
    console.log('updateBidTimeoutMessage');
    for (let bidTimeout of bidTimeoutResponse) {
      let adUnitCode = bidTimeout.adUnitCode.toLowerCase();
      let bidderCode = bidTimeout.bidderCode.toLowerCase();
      Object.assign(cache[bidTimeout.auctionId].bids.adUnits[adUnitCode][bidderCode], {
        'status': BIDDER_STATUS.TIMEOUT,
        'isTimeout': true
      })
    }
    console.log('updateBidTimeoutMessage OK');
  },
  updateBidCreativeMessage(bidResponse, cache) {
    console.log('updateBidCreativeMessage');
    let adUnitCode = bidResponse.adUnitCode.toLowerCase();
    let bidderCode = bidResponse.bidderCode.toLowerCase();
    let adUnits = cache[bidResponse.auctionId].crs.adUnits;

    adUnits[adUnitCode] = adUnits[adUnitCode] || {};
    adUnits[adUnitCode][bidderCode] = {
      'ads': bidResponse.ad
    };
    console.log('updateBidCreativeMessage OK');
  },
  updateAuctionEndMessage(auction, cache) {
    console.log('updateAuctionEndMessage');

    Object.assign(cache[auction.auctionId]['bids'], {
      'finish': auction.auctionEnd || Date.now(),
    });
    // let adUnits = cache[auction.auctionId]['bids']['adUnits'];
    let adUnitStatus = cache[auction.auctionId]['status'] = {};

    // build nested object structure of bids within adUnits
    for (let bidderRequest of auction.bidderRequests) {
      for (let bid of bidderRequest.bids) {
        let adUnitCode = bid.adUnitCode.toLowerCase();
        adUnitStatus[adUnitCode] = AUCTION_STATUS.COMPLETED;
      }
    }

    console.log('updateAuctionEndMessage OK');
  },
  buildBidWonMessage(bidWonResponse, cache) {
    console.log('buildBidWonMessage');
    let adUnitCode = bidWonResponse.adUnitCode.toLowerCase();
    let bidderCode = bidWonResponse.bidderCode.toLowerCase();
    let message = {
      'adUnits': {}
    };
    message.adUnits[adUnitCode] = {};
    message.adUnits[adUnitCode][bidderCode] = {
      'time': bidWonResponse.timeToRespond,
      'latency': Date.now() - bidWonResponse.requestTimestamp - bidWonResponse.timeToRespond, // rubicon did this
      'status': BIDDER_STATUS.BID,
      'cpm': bidWonResponse.cpm,
      'currency': bidWonResponse.currency,
      'originalCpm': bidWonResponse.originalCpm || bidWonResponse.cpm,
      'originalCurrency': bidWonResponse.originalCurrency || bidWonResponse.currency,
      'isTimeout': cache[bidWonResponse.auctionId].status[adUnitCode] === false
    };
    console.log('buildBidWonMessage OK');
    return message;
  },
  sendEventMessage (endPoint, data) {
    console.log(`AJAX: ${endPoint}: ` + JSON.stringify(data));
    ajax(`//${analyticsOptions.server}/${endPoint}`, null, JSON.stringify(data), {
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
          // console.log('AUCTION_INIT: ' + JSON.stringify(args));
          break;
        case BID_REQUESTED:
          // init bid request
          this.updateBidRequestedMessage(args, eventCache);
          console.log(`BID_REQUESTED: ${args.bidderCode}`);
          // console.log(`BID_REQUESTED: ${args.bidderCode}: ` + JSON.stringify(args));
          break;
        case BID_ADJUSTMENT:
          // adjust the final price, use the higher one
          // TODO: update the adjusted price
          console.log(`BID_ADJUSTMENT: ${args.bidderCode}`);
          // console.log(`BID_ADJUSTMENT: ${args.bidderCode}: ` + JSON.stringify(args));
          break;

        case BID_RESPONSE:
          // bid response if has bid
          this.updateBidResponseMessage(args, eventCache);
          if (analyticsOptions.cr_sampled) {
            this.updateBidCreativeMessage(args, eventCache);
          }
          console.log(`BID_RESPONSE: ${args.bidderCode}`);
          // console.log(`BID_RESPONSE: ${args.bidderCode}: ` + JSON.stringify(args));
          break;
        case BIDDER_DONE:
          this.updateBidderDoneMessage(args, eventCache);
          console.log(`BIDDER_DONE: ${args.bidderCode}`);
          // console.log(`BIDDER_DONE: ${args.bidderCode}: ` + JSON.stringify(args));
          break;
        case BID_WON:
          // only appear when bid won and has impression
          let bidWonMessage = this.buildBidWonMessage(args, eventCache);
          this.sendEventMessage('imp', Object.assign(
            {}, eventCache[args.auctionId].header, bidWonMessage
          ));
          console.log('BID_WON: ' + JSON.stringify(args));
          break;
        case BID_TIMEOUT:
          // get a list of bid timeout, not always present
          console.log('BID_TIMEOUT: ' + JSON.stringify(args));
          this.updateBidTimeoutMessage(args, eventCache);
          break;
        case AUCTION_END:
          // auction end, response after this means timeout
          this.updateAuctionEndMessage(args, eventCache);
          console.log(`AUCTION_END`);
          // console.log(`AUCTION_END: ` + JSON.stringify(args));
          // console.log(`FINAL CACHE: ` + JSON.stringify(eventCache));
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
