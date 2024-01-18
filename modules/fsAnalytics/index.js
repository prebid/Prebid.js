import {ajax} from '../../src/ajax.js';
import adapter from '../../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../../src/constants.json';
import {default as adapterManager} from '../../src/adapterManager.js';

const analyticsType = 'endpoint';
const url = 'https://us-central1-freestar-157323.cloudfunctions.net/';

const pageviewId = (Math.random() + 1).toString(36).substring(7);
const siteId = window.freestar.fsdata.siteId || 0;

const URLS = {
  PAGEVIEW: 'https://us-central1-freestar-157323.cloudfunctions.net/f6r_d7y_pageview',
  BIDWON: 'https://us-central1-freestar-157323.cloudfunctions.net/f6r_d7y_prebid-bidswon_raw_v1'
}

const handlePageview = () => {
  sendEvent({
    'domain': location.host,
  }, URLS.PAGEVIEW);
}

const handlerBidWon = (args) => {
  sendEvent(args, URLS.BIDWON);
}

const disallowedParams = ['ad'];

const sendEvent = (args, url) => {
  for(let i = 0; i < disallowedParams.length; i++) {
    if (args[disallowedParams[i]]) {
      delete args[disallowedParams[i]];
    }
  }
  args = Object.assign(args, {
    pageviewId,
    siteId
  });
  console.log('sendEvent', args, url);
  ajax(url, undefined, JSON.stringify(args), {method: 'POST'});
}

let fsAnalytics = Object.assign(adapter({url, analyticsType}), {
  track: function(event) {
    const { eventType, args } = event;

    try {
      switch (eventType) {
        case CONSTANTS.EVENTS.BID_WON:
          handlerBidWon(args);
          break;
      }
    } catch (error) {
      logError('Error on FS Analytics Adapter', error);
    }
  }
});

fsAnalytics.originEnableAnalytics = fsAnalytics.enableAnalytics;

fsAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  fsAnalytics.originEnableAnalytics(config);
  handlePageview();
};

adapterManager.registerAnalyticsAdapter({
  adapter: fsAnalytics,
  code: 'fsAnalytics',
  gvlid: 1
});

export default fsAnalytics;