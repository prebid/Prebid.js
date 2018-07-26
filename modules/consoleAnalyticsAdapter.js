import adapter from 'src/AnalyticsAdapter';
import adaptermanager from 'src/adaptermanager';
import CONSTANTS from 'src/constants.json';
import includes from 'core-js/library/fn/array/includes';
import { ajax } from '../src/ajax';

const store = require('store');
const ENDPOINT = 'http://js-download.prebid.org/logger';

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
    XHR_TIMEDOUT,
    SRA
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

let sraBidders = [];
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
    let temp = {};
    let auctionId;
    switch (eventType) {
      case AUCTION_INIT:
        result[args.auctionId] = {
          'auctionStart': args.timestamp,
          'auctionTimeout': args.timeout,
          'numberOfBidsRequested': 0,
          'numberOfBidsReceived': 0,
          'doneCbCount': 0
        }
        result['global'] = {
          'setTargetingCalled': 'no'
        }
        break;
      case BID_REQUESTED:
        temp = {};
        auctionId = args.auctionId;
        let numberOfBidsRequested = result[auctionId]['numberOfBidsRequested'];
        temp[auctionId] = {
          'numberOfBidsRequested': ++numberOfBidsRequested
        }

        result = mergeDeep(result, temp);
        break;
      case SRA:
        sraBidders.push(args.bidder);
        break;
      case BID_RESPONSE:
        auctionId = args.auctionId;
        let numberOfBidsReceived = result[auctionId]['numberOfBidsReceived'];
        temp = {};
        temp[auctionId] = {
          'numberOfBidsReceived': ++numberOfBidsReceived
        };

        if ((typeof result[auctionId]['bidder'] !== 'undefined' && typeof result[auctionId]['bidder'][args.bidderCode] !== 'undefined') && !includes(sraBidders, args.bidderCode)) {
          break;
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
        temp[args.auctionId] = {
          'doneCbCount': ++doneCbCount
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
        sendData(args.auctionId);
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

function sendData(auctionId) {
  let data = Object.assign(result[auctionId], {auctionId});
  ajax(`${ENDPOINT}/csv`, null, JSON.stringify(data));
  ajax(`${ENDPOINT}/raw`, null, JSON.stringify(result[auctionId]));
}

adaptermanager.registerAnalyticsAdapter({
  adapter: consoleAnalyticsAdapter,
  code: 'consoleAnalytics'
});

export default consoleAnalyticsAdapter;
