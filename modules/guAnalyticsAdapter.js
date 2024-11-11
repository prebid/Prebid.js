// see http://prebid.org/dev-docs/integrate-with-the-prebid-analytics-api.html
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import * as utils from '../src/utils.js';
import {ajax} from '../src/ajax.js';

// eslint-disable-next-line prebid/validate-imports
import { log } from '@guardian/libs';

/*
 * Update whenever you want to make sure you're sending the right version of analytics.
 * This is useful when some browsers are using old code and some new, for example.
 */
const VERSION = 9;

const analyticsType = 'endpoint';
const SENDALL_ON = {};

// Look there: http://jsben.ch/qhIE6
SENDALL_ON[EVENTS.AUCTION_END] = true;
SENDALL_ON[EVENTS.BID_WON] = true;

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
        case EVENTS.BID_REQUESTED:
          handler = trackBidRequest;
          break;
        case EVENTS.BID_RESPONSE:
          handler = trackBidResponse;
          break;
        case EVENTS.NO_BID:
          handler = trackNoBid;
          break;
        case EVENTS.AUCTION_END:
          handler = trackAuctionEnd;
          break;
        case EVENTS.BID_WON:
          handler = trackBidWon;
          break;
      }
      if (handler) {
        let events = handler(args);
        if (events && analyticsAdapter.context.queue) {
          if (eventType === EVENTS.BID_WON) {
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
  if (args.bidderCode !== 'ozone') return args.bidderCode;

  // Ozone represents several different advertisers
  if (args.adserverTargeting) {
    /**
     * Each Ozone bid contains information about all the other bids.
     * To pinpoint which advertiser is reponsible for the bid,
     * we can match `adId` against the adserverTargeting key-values for each.
     *
     * For example, given `oz_appnexus_adId: "123abc456def789-0-0"`,
     * we want to capture `appnexus` if `adId` matches `123abc456def789-0-0`
     */
    for (let key in args.adserverTargeting) {
      const [, advertiser, info] = key.split('_');
      const value = args.adserverTargeting[key];
      if (info === 'adId' && value === args.adId) {
        return `ozone-${advertiser}`;
      }
    }

    // If none matched, use ozone’s winner as fallback
    if (args.adserverTargeting.oz_winner &&
    typeof args.adserverTargeting.oz_winner === 'string') {
      return `ozone-${args.adserverTargeting.oz_winner}`;
    }
  }

  return `ozone-unknown`;
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
    if (analyticsAdapter.context.enableV2Endpoint) {
      analyticsAdapter.ajaxCallv2(JSON.stringify(req));
    }
  }
}

function isValid(events) {
  return events.length > 0 && (events[0].ev === 'init' || events[0].ev === 'bidwon');
}

function logEvents(events) {
  const isBid = events[0]?.ev === 'init';
  const isBidWon = events[0]?.ev === 'bidwon';
  let logMsg = '';
  if (isBid) {
    const slotId = events?.find(e => e.sid)?.sid;
    logMsg = `bids for ${slotId}`;
  } else if (isBidWon) {
    const bidId = events[0]?.bid;
    logMsg = `bid won ${bidId}`;
  }
  log('commercial', `Prebid.js events: ${logMsg}`, events);
}

analyticsAdapter.ajaxCall = function ajaxCall(data) {
  const url = `${analyticsAdapter.context.ajaxUrl}/commercial/api/hb`;
  const callback = (data) => logEvents(JSON.parse(data).hb_ev);
  const options = {
    method: 'POST',
    contentType: 'text/plain; charset=utf-8'
  };
  ajax(url, callback(data), data, options);
};

// Temporary function for testing new analytics endpoint
analyticsAdapter.ajaxCallv2 = function ajaxCallv2(data) {
  const url = analyticsAdapter.context.ajaxUrlV2;
  if (!url) {
    return;
  }
  const callback = (data) => logEvents(JSON.parse(data).hb_ev);
  const options = {
    method: 'POST',
    contentType: 'text/plain; charset=utf-8',
    keepalive: true
  };
  ajax(url, callback(data), data, options);
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
    enableV2Endpoint: config.options.enableV2Endpoint,
    ajaxUrlV2: config.options.ajaxUrlV2,
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

export const _ = {
  getBidderCode
}
