import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';

const store = require('store');

const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BIDDER_DONE,
    BID_TIMEOUT,
    BID_WON,
    SET_TARGETING
  },
  INTERNAL_EVENTS: {
    XHR_TIMEDOUT
  },
} = CONSTANTS;

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

let result = {};
let counter;
// https://stackoverflow.com/questions/14341156/calculating-page-load-time-in-javascript
let pageLoadStarted = window.performance.timing.navigationStart;

let baseAdapter = adapter({analyticsType: 'endpoint'});
let consoleAnalyticsAdapter = Object.assign({}, baseAdapter, {
  enableAnalytics(config = {}) {
    baseAdapter.enableAnalytics.call(this, config);
    counter = store.get('prebid-counter');
    if (typeof counter === 'undefined') {
      counter = 1;
      store.set('prebid-counter', counter);
    } else {
      counter = Number(counter) + 1;
      store.set('prebid-counter', counter);
    }
  },
  disableAnalytics() {
    this.getUrl = baseAdapter.getUrl;
    accountId = null;
    baseAdapter.disableAnalytics.apply(this, arguments);
  },
  track({eventType, args}) {
    let key = 'prebid-' + counter;
    switch (eventType) {
      case AUCTION_INIT:
        result[args.auctionId] = {
          'auctionStart': args.timestamp,
          'auctionTimeout': args.timeout,
        }
        result['global'] = {
          'setTargetingCalled': 'no'
        }
        break;
      case BID_REQUESTED:
        let temp = {}
        let auctionId = args.auctionId;
        let numberOfBidsRequested = result[auctionId]['numberOfBidsRequested'];
        if (typeof numberOfBidsRequested === 'undefined') {
          temp[auctionId] = { 'numberOfBidsRequested': 1 }
        } else {
          temp[auctionId] = {
            'numberOfBidsRequested': ++numberOfBidsRequested
          }
        }
        result = mergeDeep(result, temp);
        break;
      case BID_RESPONSE:
        auctionId = args.auctionId;
        let numberOfBidsReceived = result[auctionId]['numberOfBidsReceived'];
        temp = {};
        if (typeof numberOfBidsReceived === 'undefined') {
          temp[auctionId] = { 'numberOfBidsReceived': 1 }
        } else {
          temp[auctionId] = {
            'numberOfBidsReceived': ++numberOfBidsReceived
          }
        }

        temp[auctionId]['bidder'] = {};
        let timingObject = {
          'requestStart': args.requestTimestamp - pageLoadStarted,
          'requestFinished': args.responseTimestamp - pageLoadStarted,
          'requestTook': (args.responseTimestamp - pageLoadStarted) - (args.requestTimestamp - pageLoadStarted)
        };
        if (typeof result[auctionId]['bidder'] === 'undefined' || typeof result[auctionId]['bidder'][args.bidderCode] === 'undefined') {
          temp[auctionId]['bidder'][args.bidderCode] = [timingObject];
        } else {
          temp[auctionId]['bidder'][args.bidderCode] = result[auctionId]['bidder'][args.bidderCode].concat(timingObject);
        }
        result = mergeDeep(result, temp);
        break;
      case BIDDER_DONE:
        let doneCbCount = result[args.auctionId]['doneCbCount'];
        temp = {};
        if (typeof doneCbCount === 'undefined') {
          temp[args.auctionId] = { 'doneCbCount': 1 }
        } else {
          temp[args.auctionId] = {
            'doneCbCount': ++doneCbCount
          }
        }
        result = mergeDeep(result, temp);
        store.set(key, result);
        break;
      case SET_TARGETING:
        temp = {};
        temp['global'] = {
          'setTargetingCalled': 'yes'
        }
        result = mergeDeep(result, temp);
        store.set(key, result);
        break;
      case BID_WON:
        break;
      case AUCTION_END:
        temp = {};
        temp[args.auctionId] = {
          'auctionFinished': args.timestamp,
          'auctionDuration': args.timestamp - result[args.auctionId].auctionStart
        }
        result = mergeDeep(result, temp);
        store.set(key, result);
        break;
      case BID_TIMEOUT:
        auctionId = null;
        let bidders = [];
        args.forEach((bidder) => {
          auctionId = bidder.auctionId;
          bidders.push(bidder.bidder);
        });
        temp = {};
        temp[auctionId] = {
          'auctionTimedOut': true,
          'timedOutBidders': bidders.join(',')
        }
        result = mergeDeep(result, temp);
        break;
      case XHR_TIMEDOUT:
        let xhrTimeout = result['global']['xhrTimeout'];
        let timedOutUrls = result['global']['timedOutUrls'];
        temp = {};
        temp['global'] = {
          'xhrTimeout': (typeof xhrTimeout === 'undefined') ? 1 : ++xhrTimeout,
          'timedOutUrls': (typeof timedOutUrls === 'undefined') ? [args] : timedOutUrls.concat(args)
        }

        result = mergeDeep(result, temp);
        store.set(key, result);
        break;
    }
  }
});

adaptermanager.registerAnalyticsAdapter({
  adapter: consoleAnalyticsAdapter,
  code: 'consoleAnalytics'
});

export default consoleAnalyticsAdapter;
