// see http://prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adaptermanager from '../src/adapterManager.js';

const analyticsType = 'endpoint';
// const url = 'URL_TO_SERVER_ENDPOINT';

// --- custom code begins ---

const QUEUE_TIMEOUT = 4000;

let analyticsAdapter = Object.assign(adapter({analyticsType}),
  {
    track({eventType, args}) {
      if (!analyticsAdapter.context) {
        return;
      }
      let handler = null;
      switch (eventType) {
        case EVENTS.AUCTION_INIT:
          if (analyticsAdapter.context.queue) {
            analyticsAdapter.context.queue.init();
          }
          handler = trackAuctionInit;
          break;
        case EVENTS.ADD_AD_UNITS:
          handler = trackAddAdUnits;
          break;
        case EVENTS.REQUEST_BIDS:
          handler = trackRequestBids;
          break;
        case EVENTS.BID_REQUESTED:
          handler = trackBidRequest;
          break;
        case EVENTS.BID_ADJUSTMENT:
          handler = trackBidAdjustment;
          break;
        case EVENTS.BID_RESPONSE:
          handler = trackBidResponse;
          break;
        case EVENTS.BID_WON:
          handler = trackBidWon;
          break;
        case EVENTS.BID_TIMEOUT:
          handler = trackBidTimeout;
          break;
        case EVENTS.AUCTION_END:
          handler = trackAuctionEnd;
          break;
        case EVENTS.SET_TARGETING:
          handler = trackSetTargeting;
          break;
      }
      if (handler) {
        let events = handler(args);
        if (analyticsAdapter.context.queue) {
          analyticsAdapter.context.queue.push(events);
        }
        if (eventType === EVENTS.AUCTION_END) {
          sendAll();
        }
      }
    }
  });

function buildRequestTemplate(options) {
  return {
    pv: options.pv
  }
}

function sendAll() {
  let events = analyticsAdapter.context.queue.popAll();
  if (events.length !== 0) {
    let req = Object.assign({}, analyticsAdapter.context.requestTemplate, {hb_ev: events});
    // eslint-disable-next-line no-console
    console.log(req);
  }
}

function trackAuctionInit(args) {
  const event = createHbEvent(undefined, EVENTS.AUCTION_INIT, undefined, args.auctionId, args);
  return [event];
}

function trackAddAdUnits(args) {
  const event = createHbEvent(undefined, EVENTS.ADD_AD_UNITS, undefined, undefined, args);
  return [event];
}

function trackRequestBids(args) {
  const event = createHbEvent(undefined, EVENTS.REQUEST_BIDS, undefined, undefined, args);
  return [event];
}

function trackBidRequest(args) {
  return args.bids.map(bid =>
    createHbEvent(args.bidderCode, EVENTS.BID_REQUESTED, bid.adUnitCode, bid.auctionId, args));
}

function trackBidAdjustment(args) {
  return args.bids.map(bid =>
    createHbEvent(args.bidderCode, EVENTS.BID_ADJUSTMENT, bid.placementCode, bid.auctionId, args));
}

function trackBidResponse(args) {
  const event = createHbEvent(args.bidderCode, EVENTS.BID_RESPONSE, args.adUnitCode, args.auctionId, args);
  return [event];
}

function trackBidWon(args) {
  const event = createHbEvent(args.bidderCode, EVENTS.BID_WON, args.adUnitCode, args.auctionId, args);
  return [event];
}

function trackAuctionEnd(args) {
  const event = createHbEvent(undefined, EVENTS.AUCTION_END, undefined, args.auctionId, args);
  return [event];
}

function trackBidTimeout(args) {
  return args.map(bid => createHbEvent(bid.bidder, EVENTS.BID_TIMEOUT, bid.adUnitCode, bid.auctionId, args));
}

function trackSetTargeting() {
  const event = createHbEvent(undefined, EVENTS.SET_TARGETING, undefined, undefined, undefined);
  return [event];
}

function createHbEvent(bidder, event, slotId = undefined, auctionId = undefined, args) {
  let ev = {event: event};
  if (bidder) {
    ev.bidder = bidder
  }
  if (slotId) {
    ev.slotId = slotId;
  }
  if (auctionId) {
    ev.auctionId = auctionId;
  }
  ev.args = args;
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

analyticsAdapter.context = {};

// --- custom code ends ---

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;

analyticsAdapter.enableAnalytics = (config) => {
  analyticsAdapter.context = {
    requestTemplate: buildRequestTemplate(config.options),
    queue: new ExpiringQueue(sendAll, QUEUE_TIMEOUT)
  };
  analyticsAdapter.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: analyticsAdapter,
  code: 'consoleLogging'
});
