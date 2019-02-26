import {ajax} from 'src/ajax'; // ajaxBuilder()
import adapter from '../src/AnalyticsAdapter';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager';

const utils = require('../src/utils');
const analyticsType = 'endpoint';
const DEFAULT_SERVER = 'analytics.c.apx.net';
const {
  EVENTS: {
    AUCTION_INIT,
    AUCTION_END,
    BID_REQUESTED,
    BID_RESPONSE,
    BID_ADJUSTMENT,
    BIDDER_DONE,
    BID_WON
  }
} = CONSTANTS;

let analyticsOptions = {};

let appierAnalyticsAdapter = Object.assign(adapter({DEFAULT_SERVER, analyticsType}), {
  eventMessage: {},

  initConfig(config) {
    /**
     * Required option: affiliateId
     * Optional option: server
     * @type {boolean}
     */
    analyticsOptions.options = utils.deepClone(config.options);

    analyticsOptions.affiliateId = analyticsOptions.options.affiliateId || (analyticsOptions.options.affiliateId[0]) || null;
    if (!analyticsOptions.affiliateId) {
      console.log('"options.affiliateId" is required.');
      return false;
    }

    analyticsOptions.server = analyticsOptions.options.server || DEFAULT_SERVER;
    analyticsOptions.sampled = typeof analyticsOptions.sampling === 'undefined' ||
      Math.random() < parseFloat(analyticsOptions.sampling);

    return true;
  },

  sendEventMessage (eventType, eventName, data) {
    let message = {
      eventTimeMillis: Date.now(),
      integration: INTEGRATION,
      version: '$prebid.version$',
      referrerUri: referrer
    };

    // ajax = function (url, callback, data, options = {})
    ajax(analyticsOptions.server, null, JSON.stringify(message), {
      contentType: 'application/json'
    });

  },

  buildEventMessage() {

  },

  track({eventType, args}) {
    switch (eventType) {
      case AUCTION_INIT:
        // do something
        console.log('AUCTION_INIT: ' + JSON.stringify(args));
        break;
      case BID_REQUESTED:
        // do something
        console.log('BID_REQUESTED: ' + JSON.stringify(args));
        break;
      case BID_RESPONSE:
        // do something
        console.log('BID_RESPONSE: ' + JSON.stringify(args));
        break;
      case BID_ADJUSTMENT:
        // do something
        console.log('BID_ADJUSTMENT: ' + JSON.stringify(args));
        break;
      case BIDDER_DONE:
        // do something
        console.log('BIDDER_DONE: ' + JSON.stringify(args));
        break;
      case BID_WON:
        // do something
        console.log('BID_WON: ' + JSON.stringify(args));
        break;
      case AUCTION_END:
        // do something
        console.log('AUCTION_END: ' + JSON.stringify(args));
        break;
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
