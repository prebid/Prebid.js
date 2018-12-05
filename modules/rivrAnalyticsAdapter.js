import {ajax} from 'src/ajax';
import adapter from 'src/AnalyticsAdapter';
import find from 'core-js/library/fn/array/find';
import CONSTANTS from 'src/constants.json';
import adaptermanager from 'src/adaptermanager';
import * as utils from 'src/utils';

const analyticsType = 'endpoint';

let rivrAnalytics = Object.assign(adapter({analyticsType}), {
  track({ eventType, args }) {
    if (!window.rivraddon || !window.rivraddon.analytics || !window.rivraddon.analytics.getContext()) {
      return;
    }
    utils.logInfo(`ARGUMENTS FOR TYPE: ============= ${eventType}`, args);
    let handler = null;
    switch (eventType) {
      case CONSTANTS.EVENTS.AUCTION_INIT:
        handler = window.rivraddon.analytics.trackAuctionInit;
        break;
      case CONSTANTS.EVENTS.AUCTION_END:
        handler = window.rivraddon.analytics.trackAuctionEnd;
        break;
      case CONSTANTS.EVENTS.BID_WON:
        handler = window.rivraddon.analytics.trackBidWon;
        break;
    }
    if (handler) {
      handler(args)
    }
  }
});

/**
 * Expiring queue implementation. Fires callback on elapsed timeout since last last update or creation.
 * @param callback
 * @param ttl
 * @constructor
 */
export function ExpiringQueue(sendImpressions, sendAuction, ttl, log) {
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
      sendAuction();
      if (queue.length) {
        sendImpressions();
      }
    }, ttl);
  }
};

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  window.rivraddon.analytics.enableAnalytics(config, ExpiringQueue, {utils, ajax, find});
  rivrAnalytics.originEnableAnalytics(config);
};

adaptermanager.registerAnalyticsAdapter({
  adapter: rivrAnalytics,
  code: 'rivr'
});

export default rivrAnalytics
