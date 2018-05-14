import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import { logInfo } from 'src/utils';

const analyticsType = 'endpoint';
const DEFAULT_HOST = 'integrations.rivr.simplaex.net/prebid/auctions';
const DEFAULT_QUEUE_TIMEOUT = 4000;

const RIVR_HB_EVENTS = {
  AUCTION_INIT: 'auctionInit',
  BID_REQUEST: 'bidRequested',
  BID_RESPONSE: 'bidResponse',
  BID_WON: 'bidWon',
  AUCTION_END: 'auctionEnd',
  TIMEOUT: 'adapterTimedOut'
};

let rivrAnalytics = Object.assign(adapter({analyticsType}), {
  track({ eventType, args }) {
    if (!rivrAnalytics.context) {
      return;
    }
    logInfo(`ARGUMENTS FOR TYPE: ============= ${eventType}`, args);
    let handler = null;
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        if (rivrAnalytics.context.queue) {
          rivrAnalytics.context.queue.init();
        }
        handler = trackAuctionInit;
        break;
      case CONSTANTS.EVENTS.BID_REQUESTED:
        handler = trackBidRequest;
        break;
      case CONSTANTS.EVENTS.BID_RESPONSE:
        handler = trackBidResponse;
        break;
      case CONSTANTS.EVENTS.BID_WON:
        handler = trackBidWon;
        break;
      case CONSTANTS.EVENTS.BID_TIMEOUT:
        handler = trackBidTimeout;
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        handler = trackAuctionEnd;
        break;
    }
    if (handler) {
      let events = handler(args);
      if (rivrAnalytics.context.queue) {
        rivrAnalytics.context.queue.push(events);
      }
      if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
        sendAll();
      }
    }
  }
});

function sendAll() {
  let events = rivrAnalytics.context.queue.popAll();
  if (events.length !== 0) {
    let req = Object.assign({}, {hb_ev: events});
    logInfo('sending request to analytics => ', req);
    ajax(`http://${rivrAnalytics.context.host}`, () => {
    }, JSON.stringify(req));
  }
}

function trackAuctionInit() {
  rivrAnalytics.context.auctionTimeStart = Date.now();
  const event = createHbEvent(undefined, RIVR_HB_EVENTS.AUCTION_INIT);
  return [event];
}

function trackBidRequest(args) {
  return args.bids.map(bid =>
    createHbEvent(args.bidderCode, RIVR_HB_EVENTS.BID_REQUEST, bid.adUnitCode));
}

function trackBidResponse(args) {
  const event = createHbEvent(args.bidderCode, RIVR_HB_EVENTS.BID_RESPONSE,
    args.adUnitCode, args.cpm, args.timeToRespond / 1000);
  return [event];
}

function trackBidWon(args) {
  const event = createHbEvent(args.bidderCode, RIVR_HB_EVENTS.BID_WON, args.adUnitCode, args.cpm);
  return [event];
}

function trackAuctionEnd(args) {
  const event = createHbEvent(undefined, RIVR_HB_EVENTS.AUCTION_END, undefined,
    undefined, (Date.now() - rivrAnalytics.context.auctionTimeStart) / 1000);
  return [event];
}

function trackBidTimeout(args) {
  return args.map(bidderName => createHbEvent(bidderName, RIVR_HB_EVENTS.TIMEOUT));
}

function createHbEvent(adapter, event, tagid = undefined, value = 0, time = 0) {
  let ev = { event: event };
  if (adapter) {
    ev.adapter = adapter
  }
  if (tagid) {
    ev.tagid = tagid;
  }
  if (value) {
    ev.val = value;
  }
  if (time) {
    ev.time = time;
  }
  return ev;
}

/**
 * Expiring queue implementation. Fires callback on elapsed timeout since last last update or creation.
 * @param callback
 * @param ttl
 * @constructor
 */
export function ExpiringQueue(callback, ttl) {
  let queue = [];
  let timeoutId;

  this.push = (event) => {
    if (event instanceof Array) {
      queue.push.apply(queue, event);
    } else {
      queue.push(event);
    }
    reset();
  };

  this.popAll = () => {
    let result = queue;
    queue = [];
    reset();
    return result;
  };

  /**
   * For test/debug purposes only
   * @return {Array}
   */
  this.peekAll = () => {
    return queue;
  };

  this.init = reset;

  function reset() {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      if (queue.length) {
        callback();
      }
    }, ttl);
  }
}

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  rivrAnalytics.context = {
    host: config.options.host || DEFAULT_HOST,
    pubId: config.options.pubId,
    queue: new ExpiringQueue(sendAll, config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT)
  };
  logInfo('Rivr Analytics enabled with config', rivrAnalytics.context);
  rivrAnalytics.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: rivrAnalytics,
  code: 'rivr'
});

export default rivrAnalytics
