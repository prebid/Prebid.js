import {ajax} from '../src/ajax';
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';
import * as utils from '../src/utils';

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

// save the base class function
rivrAnalytics.originEnableAnalytics = rivrAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
rivrAnalytics.enableAnalytics = (config) => {
  if (window.rivraddon && window.rivraddon.analytics) {
    window.rivraddon.analytics.enableAnalytics(config, {utils, ajax});
    rivrAnalytics.originEnableAnalytics(config);
  }
};

adapterManager.registerAnalyticsAdapter({
  adapter: rivrAnalytics,
  code: 'rivr'
});

export default rivrAnalytics
