import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import { EVENTS } from '../src/constants.js';
import { logInfo, logError, _each, triggerPixel, logWarn } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { BID_RESPONSE } from '../src/pbjsORTB.js';

const BIDDER_CODE = 'mobkoi';
const analyticsType = 'endpoint';
const GVL_ID = 898;
const {
  BID_WON,
  BIDDER_DONE,
} = EVENTS;

/**
 * The options that are passed in from the page
 */
let initOptions = {};

async function sendGetRequest(url) {
  return new Promise((resolve, reject) => {
    try {
      logInfo('triggerPixel', url);
      triggerPixel(url, resolve);
    } catch (error) {
      try {
        logWarn(`triggerPixel failed. URL: (${url}) Falling back to ajax. Error: `, error);
        ajax(url, resolve, null, {
          contentType: 'application/json',
          method: 'GET',
          withCredentials: false, // No user-specific data is tied to the request
          referrerPolicy: 'unsafe-url',
          crossOrigin: true
        });
      } catch (error) {
        // If failed with both methods, reject the promise
        reject(error);
      }
    }
  });
}

function isMobkoiBid(prebidBid) {
  return prebidBid && prebidBid.bidderCode === BIDDER_CODE;
}

function triggerAllLossBidLossBeacon(prebidBid, mobkoiContext) {
  _each(Object.values(mobkoiContext.prebidAndOrtbBids), (bidContext) => {
    const { ortbBid, bidWin, lurlTriggered } = bidContext;
    if (ortbBid.lurl && !bidWin && !lurlTriggered) {
      logInfo('triggerLossBeacon', bidWin, prebidBid);
      sendGetRequest(ortbBid.lurl);
      // Don't wait for the response to continue to avoid race conditions
      bidContext.lurlTriggered = true;
    }
  });
}

function appendToContext(prebidBid, mobkoiContext) {
  mobkoiContext.prebidAndOrtbBids[prebidBid.adId] = {
    prebidBid,
    ortbBid: prebidBid.ortbBid,
    bidWin: false,
    lurlTriggered: false
  };
}

let mobkoiAnalytics = Object.assign(adapter({analyticsType}), {
  mobkoiContext: {
    prebidAndOrtbBids: {}
  },
  track({
    eventType,
    args
  }) {
    logInfo(`eventType: ${eventType}`, args);

    switch (eventType) {
      case BID_RESPONSE:
        appendToContext(args, this.mobkoiContext);
        break;
      case BID_WON:
        if (isMobkoiBid(args)) {
          this.mobkoiContext.prebidAndOrtbBids[args.adId].bidWin = true;
        }

        triggerAllLossBidLossBeacon(args, this.mobkoiContext);
        break;
      case BIDDER_DONE:
        if (args.bidderCode !== BIDDER_CODE) {
          break;
        }
        triggerAllLossBidLossBeacon(args, this.mobkoiContext);
        break;
      default:
        break;
    }
  }
});

// save the base class function
mobkoiAnalytics.originEnableAnalytics = mobkoiAnalytics.enableAnalytics;

// override enableAnalytics so we can get access to the config passed in from the page
mobkoiAnalytics.enableAnalytics = function (config) {
  initOptions = config.options;
  if (!config.options.publisherId) {
    logError('PublisherId option is not defined. Analytics won\'t work');
    return;
  }

  if (!config.options.endpoint) {
    logError('Endpoint option is not defined. Analytics won\'t work');
    return;
  }

  logInfo('mobkoiAnalytics.enableAnalytics', initOptions);
  mobkoiAnalytics.originEnableAnalytics(config); // call the base class function
};

adapterManager.registerAnalyticsAdapter({
  adapter: mobkoiAnalytics,
  code: BIDDER_CODE,
  gvlid: GVL_ID
});

export default mobkoiAnalytics;
