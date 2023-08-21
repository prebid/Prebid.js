import {deepClone, logError, getParameterByName} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import CONSTANTS from '../src/constants.json';
import adapterManager from '../src/adapterManager.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';

const VERSION = '1.0.4';
const MODULE_NAME = 'nobidAnalyticsAdapter';
const ANALYTICS_DATA_NAME = 'analytics.nobid.io';
const RETENTION_SECONDS = 7 * 24 * 3600;
const TEST_ALLOCATION_PERCENTAGE = 5; // dont block 5% of the time;
window.nobidAnalyticsVersion = VERSION;
const analyticsType = 'endpoint';
const url = 'localhost:8383/event';
const GVLID = 816;
const storage = getStorageManager({gvlid: GVLID, moduleName: MODULE_NAME, moduleType: MODULE_TYPE_ANALYTICS});
const {
  EVENTS: {
    AUCTION_INIT,
    BID_REQUESTED,
    BID_TIMEOUT,
    BID_RESPONSE,
    BID_WON,
    AUCTION_END,
    AD_RENDER_SUCCEEDED
  }
} = CONSTANTS;
function log (msg) {
  // eslint-disable-next-line no-console
  console.log(`%cNoBid Analytics ${VERSION}`, 'padding: 2px 8px 2px 8px; background-color:#f50057; color: white', msg);
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
    else if (env == 'dev') ret = 'https://localhost:8383';
    return ret;
  }
  if (!nobidAnalytics.initOptions || !nobidAnalytics.initOptions.siteId || !event) return;
  if (nobidAnalytics.isAnalyticsDisabled()) {
    log('NoBid Analytics is Disabled');
    return;
  }
  try {
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
  cleanupObjectAttributes(data, ['bidderCode', 'size', 'statusMessage', 'adId', 'requestId', 'mediaType', 'adUnitCode', 'cpm', 'timeToRespond']);
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
  if (data) cleanupObjectAttributes(data.bidsReceived, ['bidderCode', 'width', 'height', 'adUnitCode', 'statusMessage', 'requestId', 'mediaType', 'cpm']);
  if (data) cleanupObjectAttributes(data.noBids, ['bidder', 'sizes', 'bidId']);
  if (data.bidderRequests) cleanupObjectAttributes(data.bidderRequests.bids, ['mediaTypes', 'adUnitCode', 'sizes', 'bidId']);
  if (data.bidderRequests) cleanupObjectAttributes(data.bidderRequests.refererInfo, ['topmostLocation']);
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
  isAnalyticsDisabled () {
    let stored = storage.getDataFromLocalStorage(ANALYTICS_DATA_NAME);
    if (!isJson(stored)) return false;
    stored = JSON.parse(stored);
    if (this.isExpired(stored)) return false;
    return stored.disabled;
  },
  processServerResponse (response) {
    if (!isJson(response)) return;
    const resp = JSON.parse(response);
    storage.setDataInLocalStorage(ANALYTICS_DATA_NAME, JSON.stringify({ ...resp, ts: Date.now() }));
  }
}

adapterManager.registerAnalyticsAdapter({
  adapter: nobidAnalytics,
  code: 'nobidAnalytics',
  gvlid: GVLID
});
window.nobidCarbonizer = {
  getStoredLocalData: function () {
    return storage.getDataFromLocalStorage(ANALYTICS_DATA_NAME);
  },
  isActive: function () {
    let stored = storage.getDataFromLocalStorage(ANALYTICS_DATA_NAME);
    if (!isJson(stored)) return false;
    stored = JSON.parse(stored);
    if (isExpired(stored, nobidAnalytics.retentionSeconds)) return false;
    return stored.carbonizer_active || false;
  },
  carbonizeAdunits: function (adunits, skipTestGroup) {
    function carbonizeAdunit (adunit) {
      let stored = storage.getDataFromLocalStorage(ANALYTICS_DATA_NAME);
      if (!isJson(stored)) return;
      stored = JSON.parse(stored);
      if (isExpired(stored, nobidAnalytics.retentionSeconds)) return;
      const carbonizerBidders = stored.bidders || [];
      const allowedBidders = adunit.bids.filter(rec => carbonizerBidders.includes(rec.bidder));
      adunit.bids = allowedBidders;
    }
    if (this.isActive()) {
      // 5% of the time do not block;
      if (!skipTestGroup && Math.floor(Math.random() * 101) <= TEST_ALLOCATION_PERCENTAGE) return;
      adunits.forEach(adunit => {
        carbonizeAdunit(adunit);
      });
    }
  }
};
export default nobidAnalytics;
