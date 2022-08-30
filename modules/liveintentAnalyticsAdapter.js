import {ajax} from '../src/ajax.js';
import { deepClone, logInfo, logError } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adaptermanager from '../src/adaptermanager.js';

const analyticsType = 'endpoint';
const url = 'https://wba.liadm.com/analytic-events';
const gvlid = 148;
const adapterCode = 'liAnalytics';
const bidWonTimeout = 2000; // TODO check
const { EVENTS: { AUCTION_END } } = CONSTANTS;
const payload = {}

function handleAuctionEnd(args) {

  setTimeout(() => {
    let winningBids = $$PREBID_GLOBAL$$.getAllWinningBids(); // wait/get winning bids
    // filter winningBids?
    let data = createAnalyticsEvent(args, winningBids); // transform data
    sendAnalyticsEvent(data);   // send data
  }, bidWonTimeout);



}

function createAnalyticsEvent(args, winningBids) {
  // generate instanceId
  // url ?? is it config.publisherDomain?

}

function sendAnalyticsEvent(data) {
  ajax(url, {
    success: function () {
      logInfo('LiveIntent Prebid Analytics: send data success');
    },
    error: function (e) {
      logInfo('LiveIntent Prebid Analytics: send data error' + e);
    }
  }, data, {
    contentType: 'application/json',
    method: 'POST'
  })
}

let liAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({ eventType, args }) {
    if (typeof args !== 'undefined') {
      switch (eventType) {
        case AUCTION_END: handleAuctionEnd(args);
        default: break;
      }
    }
  }
});

// save the base class function
liAnalytics.originEnableAnalytics = liAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
liAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  liAnalytics.originEnableAnalytics(config);  // call the base class function
};

adaptermanager.registerAnalyticsAdapter({
  adapter: liAnalytics,
  code: adapterCode,
  gvlid: gvlid
});

export default liAnalytics;
