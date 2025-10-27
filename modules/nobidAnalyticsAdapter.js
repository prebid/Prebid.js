import {deepClone, logError, getParameterByName, logMessage} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import { EVENTS } from '../src/constants.js';
import adapterManager from '../src/adapterManager.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const VERSION = '2.0.2';
const MODULE_NAME = 'nobidAnalyticsAdapter';
const ANALYTICS_OPT_FLUSH_TIMEOUT_SECONDS = 5 * 1000;
const RETENTION_SECONDS = 1 * 24 * 3600;
const TEST_ALLOCATION_PERCENTAGE = 5; // dont block 5% of the time;
window.nobidAnalyticsVersion = VERSION;
const analyticsType = 'endpoint';
const url = 'localhost:8383/event';
const GVLID = 816;
const storage = getStorageManager({gvlid: GVLID, moduleName: MODULE_NAME, moduleType: MODULE_TYPE_ANALYTICS});
const {
  AUCTION_INIT,
  BID_REQUESTED,
  BID_TIMEOUT,
  BID_RESPONSE,
  BID_WON,
  AUCTION_END,
  AD_RENDER_SUCCEEDED
} = EVENTS;
function log (msg) {
  logMessage(`%cNoBid Analytics ${VERSION}: ${msg}`);
}
function isJson (str) {
  return str && str.startsWith('{') && str.endsWith('}');
}
function isExpired (data, retentionSeconds) {
  retentionSeconds = retentionSeconds || RETENTION_SECONDS;
  if (data.ts + retentionSeconds * 1000 < Date.now()) return true;
  return false;
}
function sendEvent (event, eventType) {
  function resolveEndpoint() {
    var ret = 'https://carbon-nv.servenobids.com/admin/status';
    var env = (typeof getParameterByName === 'function') && (getParameterByName('nobid-env'));
    env = window.location.href.indexOf('nobid-env=dev') > 0 ? 'dev' : env;
    if (!env) ret = 'https://carbon-nv.servenobids.com';
    else if (env === 'dev') ret = 'https://localhost:8383';
    return ret;
  }
  if (!nobidAnalytics.initOptions || !nobidAnalytics.initOptions.siteId || !event) return;
  if (nobidAnalytics.isAnalyticsDisabled(eventType)) {
    log('NoBid Analytics is Disabled');
    return;
  }
  try {
    event.version = VERSION;
    event.pbver = '$prebid.version$';
    const endpoint = `${resolveEndpoint()}/event/${eventType}?pubid=${nobidAnalytics.initOptions.siteId}`;
    ajax(endpoint,
      function (response) {
        try {
          nobidAnalytics.processServerResponse(response);
        } catch (e) {
          logError(e);
        }
      },
      JSON.stringify(event),
      {
        contentType: 'application/json',
        method: 'POST'
      }
    );
  } catch (err) {
    log(`Sending event error ${err}`);
  }
}
function cleanupObjectAttributes (obj, attributes) {
  if (!obj) return;
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      Object.keys(item).forEach(attr => { if (!attributes.includes(attr)) delete item[attr] });
    });
  } else Object.keys(obj).forEach(attr => { if (!attributes.includes(attr)) delete obj[attr] });
}
function sendBidWonEvent (event, eventType) {
  const data = deepClone(event);
  cleanupObjectAttributes(data, ['bidderCode', 'size', 'statusMessage', 'adId', 'requestId', 'mediaType', 'adUnitCode', 'cpm', 'currency', 'originalCpm', 'originalCurrency', 'timeToRespond']);
  if (nobidAnalytics.topLocation) data.topLocation = nobidAnalytics.topLocation;
  sendEvent(data, eventType);
}
function sendAuctionEndEvent (event, eventType) {
  if (event?.bidderRequests?.length > 0 && event?.bidderRequests[0]?.refererInfo?.topmostLocation) {
    nobidAnalytics.topLocation = event.bidderRequests[0].refererInfo.topmostLocation;
  }
  const data = deepClone(event);

  cleanupObjectAttributes(data, ['timestamp', 'timeout', 'auctionId', 'bidderRequests', 'bidsReceived']);
  if (data) cleanupObjectAttributes(data.bidderRequests, ['bidderCode', 'bidderRequestId', 'bids', 'refererInfo']);
  if (data) cleanupObjectAttributes(data.bidsReceived, ['bidderCode', 'width', 'height', 'adUnitCode', 'statusMessage', 'requestId', 'mediaType', 'cpm', 'currency', 'originalCpm', 'originalCurrency']);
  if (data) cleanupObjectAttributes(data.noBids, ['bidder', 'sizes', 'bidId']);
  if (data.bidderRequests) {
    data.bidderRequests.forEach(bidderRequest => {
      cleanupObjectAttributes(bidderRequest.bids, ['mediaTypes', 'adUnitCode', 'sizes', 'bidId']);
    });
  }
  if (data.bidderRequests) {
    data.bidderRequests.forEach(bidderRequest => {
      cleanupObjectAttributes(bidderRequest.refererInfo, ['topmostLocation']);
    });
  }
  sendEvent(data, eventType);
}
function auctionInit (event) {
  if (event?.bidderRequests?.length > 0 && event?.bidderRequests[0]?.refererInfo?.topmostLocation) {
    nobidAnalytics.topLocation = event.bidderRequests[0].refererInfo.topmostLocation;
  }
}
let nobidAnalytics = Object.assign(adapter({url, analyticsType}), {
  track({ eventType, args }) {
    switch (eventType) {
      case AUCTION_INIT:
        auctionInit(args);
        break;
      case BID_REQUESTED:
        break;
      case BID_RESPONSE:
        break;
      case BID_WON:
        sendBidWonEvent(args, eventType);
        break;
      case BID_TIMEOUT:
        break;
      case AUCTION_END:
        sendAuctionEndEvent(args, eventType);
        break;
      case AD_RENDER_SUCCEEDED:
        break;
      default:
        break;
    }
  }
});

nobidAnalytics = {
  ...nobidAnalytics,
  originEnableAnalytics: nobidAnalytics.enableAnalytics, // save the base class function
  enableAnalytics: function (config) { // override enableAnalytics so we can get access to the config passed in from the page
    if (!config.options.siteId) {
      logError('NoBid Analytics - siteId parameter is not defined. Analytics won\'t work');
      return;
    }
    this.initOptions = config.options;
    this.originEnableAnalytics(config); // call the base class function
  },
  retentionSeconds: RETENTION_SECONDS,
  isExpired (data) {
    return isExpired(data, this.retentionSeconds);
  },
  isAnalyticsDisabled (eventType) {
    let stored = storage.getDataFromLocalStorage(this.ANALYTICS_DATA_NAME);
    if (!isJson(stored)) return false;
    stored = JSON.parse(stored);
    if (this.isExpired(stored)) return false;
    if (stored.disabled === 1) return true;
    else if (stored.disabled === 0) return false;
    if (eventType) {
      if (stored[`disabled_${eventType}`] === 1) return true;
      else if (stored[`disabled_${eventType}`] === 0) return false;
    }
    return false;
  },
  processServerResponse (response) {
    if (!isJson(response)) return;
    const resp = JSON.parse(response);
    storage.setDataInLocalStorage(this.ANALYTICS_DATA_NAME, JSON.stringify({ ...resp, ts: Date.now() }));
  },
  ANALYTICS_DATA_NAME: 'analytics.nobid.io',
  ANALYTICS_OPT_NAME: 'analytics.nobid.io.optData'
}
adapterManager.registerAnalyticsAdapter({
  adapter: nobidAnalytics,
  code: 'nobid',
  gvlid: GVLID
});
nobidAnalytics.originalAdUnits = {};
window.nobidCarbonizer = {
  getStoredLocalData: function () {
    const a = storage.getDataFromLocalStorage(nobidAnalytics.ANALYTICS_DATA_NAME);
    const b = storage.getDataFromLocalStorage(nobidAnalytics.ANALYTICS_OPT_NAME);
    const ret = {};
    if (a) ret[nobidAnalytics.ANALYTICS_DATA_NAME] = a;
    if (b) ret[nobidAnalytics.ANALYTICS_OPT_NAME] = b
    return ret;
  },
  isActive: function () {
    let stored = storage.getDataFromLocalStorage(nobidAnalytics.ANALYTICS_DATA_NAME);
    if (!isJson(stored)) return false;
    stored = JSON.parse(stored);
    if (isExpired(stored, nobidAnalytics.retentionSeconds)) return false;
    return stored.carbonizer_active || false;
  },
  carbonizeAdunits: function (adunits, skipTestGroup) {
    function processBlockedBidders (blockedBidders) {
      function sendOptimizerData() {
        let optData = storage.getDataFromLocalStorage(nobidAnalytics.ANALYTICS_OPT_NAME);
        storage.removeDataFromLocalStorage(nobidAnalytics.ANALYTICS_OPT_NAME);
        if (isJson(optData)) {
          optData = JSON.parse(optData);
          if (Object.getOwnPropertyNames(optData).length > 0) {
            const event = { o_bidders: optData };
            if (nobidAnalytics.topLocation) event.topLocation = nobidAnalytics.topLocation;
            sendEvent(event, 'optData');
          }
        }
      }
      if (blockedBidders && blockedBidders.length > 0) {
        let optData = storage.getDataFromLocalStorage(nobidAnalytics.ANALYTICS_OPT_NAME);
        optData = isJson(optData) ? JSON.parse(optData) : {};
        const bidders = blockedBidders.map(rec => rec.bidder);
        if (bidders && bidders.length > 0) {
          bidders.forEach(bidder => {
            if (!optData[bidder]) optData[bidder] = 1;
            else optData[bidder] += 1;
          });
          storage.setDataInLocalStorage(nobidAnalytics.ANALYTICS_OPT_NAME, JSON.stringify(optData));
          if (window.nobidAnalyticsOptTimer) return;
          window.nobidAnalyticsOptTimer = setInterval(sendOptimizerData, ANALYTICS_OPT_FLUSH_TIMEOUT_SECONDS);
        }
      }
    }
    function carbonizeAdunit (adunit) {
      let stored = storage.getDataFromLocalStorage(nobidAnalytics.ANALYTICS_DATA_NAME);
      if (!isJson(stored)) return;
      stored = JSON.parse(stored);
      if (isExpired(stored, nobidAnalytics.retentionSeconds)) return;
      const carbonizerBidders = stored.bidders || [];
      let originalAdUnit = null;
      if (nobidAnalytics.originalAdUnits && nobidAnalytics.originalAdUnits[adunit.code]) originalAdUnit = nobidAnalytics.originalAdUnits[adunit.code];
      const allowedBidders = originalAdUnit.bids.filter(rec => carbonizerBidders.includes(rec.bidder));
      const blockedBidders = originalAdUnit.bids.filter(rec => !carbonizerBidders.includes(rec.bidder));
      processBlockedBidders(blockedBidders);
      adunit.bids = allowedBidders;
    }
    for (const adunit of adunits) {
      if (!nobidAnalytics.originalAdUnits[adunit.code]) nobidAnalytics.originalAdUnits[adunit.code] = deepClone(adunit);
    };
    if (this.isActive()) {
      // 5% of the time do not block;
      if (!skipTestGroup && Math.floor(Math.random() * 101) <= TEST_ALLOCATION_PERCENTAGE) return;
      for (const adunit of adunits) {
        carbonizeAdunit(adunit);
      };
    }
  }
};
export default nobidAnalytics;
