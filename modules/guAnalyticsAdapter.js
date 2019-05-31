// see http://prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html
import adapter from 'src/AnalyticsAdapter';
import CONSTANTS from 'src/constants.json';
import adapterManager from 'src/adapterManager';
import * as utils from 'src/utils';
import {ajax} from 'src/ajax';

/*
 * Update whenever you want to make sure you're sending the right version of analytics.
 * This is useful when some browsers are using old code and some new, for example.
 */
const VERSION = 8;

const analyticsType = 'endpoint';
const SENDALL_ON = {};

// Look there: http://jsben.ch/qhIE6
SENDALL_ON[CONSTANTS.EVENTS.AUCTION_END] = true;
SENDALL_ON[CONSTANTS.EVENTS.BID_WON] = true;

let analyticsAdapter = Object.assign(adapter({analyticsType}),
  {
    track({eventType, args}) {
      if (!analyticsAdapter.context) {
        return;
      }
      let handler = null;
      switch (eventType) {
        case CONSTANTS.EVENTS.AUCTION_INIT:
          if (analyticsAdapter.context.queue) {
            analyticsAdapter.context.queue.init();
          }
          handler = trackAuctionInit;
          break;
        case CONSTANTS.EVENTS.BID_REQUESTED:
          handler = trackBidRequest;
          break;
        case CONSTANTS.EVENTS.BID_RESPONSE:
          handler = trackBidResponse;
          break;
        case CONSTANTS.EVENTS.NO_BID:
          handler = trackNoBid;
          break;
        case CONSTANTS.EVENTS.AUCTION_END:
          handler = trackAuctionEnd;
          break;
        case CONSTANTS.EVENTS.BID_WON:
          handler = trackBidWon;
          break;
      }
      if (handler) {
        let events = handler(args);
        if (events && analyticsAdapter.context.queue) {
          if (eventType === CONSTANTS.EVENTS.BID_WON) {
            // clear queue to avoid sending late bids with bidWon event
            analyticsAdapter.context.queue.init();
          }
          analyticsAdapter.context.queue.push(events);
        }
        if (SENDALL_ON[eventType]) {
          sendAll();
        }
      }
    }
  });

function getBidderCode(args) {
  if (args.bidderCode === 'ozone') {
    if (args.adserverTargeting && args.adserverTargeting.oz_winner) {
      return `${args.bidderCode}-${args.adserverTargeting.oz_winner}`;
    } else {
      return `${args.bidderCode}-unknown`;
    }
  }
  return args.bidderCode;
}

function buildRequestTemplate(options) {
  return {
    v: VERSION,
    pv: options.pv
  }
}

function sendAll() {
  let events = analyticsAdapter.context.queue.popAll();
  if (isValid(events)) {
    let req = Object.assign({}, analyticsAdapter.context.requestTemplate, {hb_ev: events});
    analyticsAdapter.ajaxCall(JSON.stringify(req));
  }
}

function isValid(events) {
  return events.length > 0 && (events[0].ev === 'init' || events[0].ev === 'bidwon');
}

analyticsAdapter.ajaxCall = function ajaxCall(data) {
  const url = `${analyticsAdapter.context.ajaxUrl}/commercial/api/hb`;
  const callback = () => {
  };
  const options = {
    method: 'POST',
    contentType: 'text/plain; charset=utf-8'
  };
  ajax(url, callback, data, options);
};

function trackBidWon(args) {
  const event = {ev: 'bidwon'};
  setSafely(event, 'aid', args.auctionId);
  setSafely(event, 'bid', args.requestId);
  return [event];
}

function trackAuctionInit(args) {
  analyticsAdapter.context.auctionTimeStart = Date.now();
  const event = {ev: 'init'};
  setSafely(event, 'aid', args.auctionId);
  setSafely(event, 'st', analyticsAdapter.context.auctionTimeStart);
  return [event];
}

function trackBidRequest(args) {
  if (args.bids) {
    return args.bids.map(bid => {
      const event = {ev: 'request'};
      setSafely(event, 'n', args.bidderCode);
      setSafely(event, 'sid', bid.adUnitCode);
      setSafely(event, 'bid', bid.bidId);
      setSafely(event, 'st', args.start);
      return event;
    });
  }
  return null;
}

function trackBidResponse(args) {
  if (args.statusMessage === 'Bid available') {
    const event = {ev: 'response'};
    setSafely(event, 'n', getBidderCode(args));
    setSafely(event, 'bid', args.requestId);
    setSafely(event, 'sid', args.adUnitCode);
    setSafely(event, 'cpm', args.cpm);
    setSafely(event, 'pb', args.pbCg);
    setSafely(event, 'cry', args.currency);
    setSafely(event, 'net', args.netRevenue);
    setSafely(event, 'did', args.adId);
    setSafely(event, 'cid', args.creativeId);
    setSafely(event, 'sz', args.size);
    setSafely(event, 'ttr', args.timeToRespond);
    setSafely(event, 'lid', args.dealId);

    if (args.meta) {
      setSafely(event, 'dsp', args.meta.networkId);
      setSafely(event, 'adv', args.meta.buyerId);
      setSafely(event, 'bri', args.meta.brandId);
      setSafely(event, 'brn', args.meta.brandName);
      setSafely(event, 'add', args.meta.clickUrl);
    }

    return [event];
  }
  return null;
}

function trackNoBid(args) {
  const duration = Date.now() - analyticsAdapter.context.auctionTimeStart;
  const event = { ev: 'nobid' };
  setSafely(event, 'n', args.bidder);
  setSafely(event, 'bid', args.bidId);
  setSafely(event, 'sid', args.adUnitCode);
  setSafely(event, 'aid', args.auctionId);
  setSafely(event, 'ttr', duration);
  return [event];
}

function trackAuctionEnd(args) {
  const duration = Date.now() - analyticsAdapter.context.auctionTimeStart;
  const event = {ev: 'end'};
  setSafely(event, 'aid', args.auctionId);
  setSafely(event, 'ttr', duration);
  return [event];
}

// Protect against setting undefined or null values
function setSafely(obj, key, value) {
  if (value === undefined || value === null) {
    return;
  }
  Object.assign(obj, {[key]: value});
}

export function AnalyticsQueue() {
  let queue = [];

  this.push = (event) => {
    if (event instanceof Array) {
      queue.push.apply(queue, event);
    } else {
      queue.push(event);
    }
  };

  this.popAll = () => {
    let result = queue;
    queue = [];
    return result;
  };

  /**
   * For test/debug purposes only
   * @return {Array}
   */
  this.peekAll = () => {
    return queue;
  };

  this.init = () => {
    queue = [];
  };
}

analyticsAdapter.context = {};

analyticsAdapter.originEnableAnalytics = analyticsAdapter.enableAnalytics;

analyticsAdapter.enableAnalytics = (config) => {
  if (!config.options.ajaxUrl) {
    utils.logError('ajaxUrl is not defined. Analytics won\'t work');
    return;
  }
  if (!config.options.pv) {
    utils.logError('pv is not defined. Analytics won\'t work');
    return;
  }
  analyticsAdapter.context = {
    ajaxUrl: config.options.ajaxUrl,
    pv: config.options.pv,
    requestTemplate: buildRequestTemplate(config.options),
    queue: new AnalyticsQueue()
  };
  analyticsAdapter.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: analyticsAdapter,
  code: 'gu'
});

export default analyticsAdapter;
