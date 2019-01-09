/**
 * vuble.js - Vuble Prebid Analytics Adapter
 */

import adapter from '../src/AnalyticsAdapter';
import adapterManager from '../src/adapterManager';
import CONSTANTS from '../src/constants.json';
import {ajax} from '../src/ajax';
import * as utils from '../src/utils';

const ANALYTICS_VERSION = '1.0.0';
const DEFAULT_QUEUE_TIMEOUT = 4000;
const DEFAULT_HOST = 'player.mediabong';
const analyticsType = 'endpoint';

const EVENTS = [
  CONSTANTS.EVENTS.AUCTION_INIT,
  CONSTANTS.EVENTS.AUCTION_END,
  CONSTANTS.EVENTS.BID_REQUESTED,
  CONSTANTS.EVENTS.BID_RESPONSE,
  CONSTANTS.EVENTS.BID_WON,
  CONSTANTS.EVENTS.BID_TIMEOUT,
];

var vubleAnalytics = Object.assign(adapter({ analyticsType: analyticsType, }),
  {
    track: function({ eventType, args }) {
      if (!vubleAnalytics.context) {
        return;
      }
      if (EVENTS.indexOf(eventType) !== -1) {
        if (eventType === CONSTANTS.EVENTS.AUCTION_INIT &&
            vubleAnalytics.context.queue) {
          vubleAnalytics.context.queue.init();
        }

        let events = deal[eventType](args);

        if (vubleAnalytics.context.queue) {
          vubleAnalytics.context.queue.push(events);
        }
        if (eventType === CONSTANTS.EVENTS.AUCTION_END) {
          sendAll();
        }
      }
    }
  });

vubleAnalytics.context = {};

vubleAnalytics.originEnableAnalytics = vubleAnalytics.enableAnalytics;

vubleAnalytics.enableAnalytics = config => {
  if (!config.options.pubId) {
    utils.logError('The publisher id is not defined. Analytics won\'t work');

    return;
  }

  if (!config.options.host) {
    if (!config.options.env) {
      utils.logError('The environement is not defined. Analytics won\'t work');

      return;
    }
    config.options.host = DEFAULT_HOST + '.' + config.options.env + '/t';
  }

  vubleAnalytics.context = {
    host: config.options.host,
    pubId: config.options.pubId,
    requestTemplate: buildRequestTemplate(config.options.pubId),
    queue: new ExpiringQueue(
      sendAll,
      config.options.queueTimeout || DEFAULT_QUEUE_TIMEOUT
    ),
  };
  vubleAnalytics.originEnableAnalytics(config);
};

adapterManager.registerAnalyticsAdapter({
  adapter: vubleAnalytics,
  code: 'vuble'
});

export default vubleAnalytics;

function sendAll() {
  let events = vubleAnalytics.context.queue.popAll();
  if (events.length !== 0) {
    let req = Object.assign(
      {},
      vubleAnalytics.context.requestTemplate,
      {rtb: events}
    );
    ajax(
      `//${vubleAnalytics.context.host}/rtb.php`,
      undefined,
      JSON.stringify(req)
    );
  }
}

var deal =
{
  auctionInit() {
    vubleAnalytics.context.auctionTimeStart = Date.now();
    return [{
      event: CONSTANTS.EVENTS.AUCTION_INIT,
      date: vubleAnalytics.context.auctionTimeStart,
    }];
  },

  bidRequested(args) {
    return args.bids.map(
      function(bid) {
        let vubleEvent = { event: CONSTANTS.EVENTS.BID_REQUESTED };

        if (typeof args.bidderCode !== 'undefined') {
          vubleEvent.adapter = args.bidderCode
        }
        if (typeof bid.bidId !== 'undefined') {
          vubleEvent.bidder = bid.bidId;
        }
        if (typeof bid.bidderRequestId !== 'undefined') {
          vubleEvent.id = bid.bidderRequestId;
        }
        if (typeof bid.params.floorPrice !== 'undefined') {
          vubleEvent.floor = bid.params.floorPrice;
        }
        if (typeof bid.params.zoneId !== 'undefined') {
          vubleEvent.zoneId = bid.params.zoneId;
        }
        if (typeof bid.mediaTypes !== 'undefined' &&
            typeof bid.mediaTypes.videos !== 'undefined' &&
            typeof bid.mediaTypes.videos.context !== 'undefined') {
          vubleEvent.context = bid.mediaTypes.videos.context;
        }
        if (typeof bid.sizes !== 'undefined') {
          vubleEvent.size = bid.sizes;
        }

        return vubleEvent;
      }
    );
  },

  bidResponse(args) {
    const event = formalizeBidEvent(
      args.bidderCode,
      CONSTANTS.EVENTS.BID_RESPONSE,
      args.cpm,
      args.dealId,
      args.adId
    );

    return [event];
  },

  bidWon(args) {
    const event = formalizeBidEvent(
      args.bidderCode,
      CONSTANTS.EVENTS.BID_WON,
      args.cpm,
      args.dealId,
    );

    return [event];
  },

  auctionEnd() {
    return [{
      event: CONSTANTS.EVENTS.AUCTION_END,
      time: (Date.now() - vubleAnalytics.context.auctionTimeStart) / 1000,
    }];
  },

  bidTimeout(args) {
    return args.map((bid) => {
      return {
        adapter: bid,
        event: CONSTANTS.EVENTS.BID_TIMEOUT,
      };
    });
  }
};

function formalizeBidEvent(adapter, event, value = 0, dealId = 0, id = 0) {
  let vubleEvent = { event: event };

  if (adapter) {
    vubleEvent.adapter = adapter
  }
  if (value) {
    vubleEvent.val = value;
  }
  if (dealId) {
    vubleEvent.id = dealId;
  }
  if (id) {
    vubleEvent.id = id;
  }

  return vubleEvent;
}

function buildRequestTemplate(pubId) {
  const topLocation = utils.getTopWindowLocation();

  return {
    ver: ANALYTICS_VERSION,
    domain: topLocation.hostname,
    path: topLocation.pathname,
    pubid: pubId,
    width: window.screen.width,
    height: window.screen.height,
    lang: navigator.language,
  }
}

/**
 * Expiring queue implementation
 * @param callback
 * @param time
 */
export function ExpiringQueue(callback, time) {
  let queue = [];
  let timeoutId;

  this.push = event => {
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
    }, time);
  }
}
