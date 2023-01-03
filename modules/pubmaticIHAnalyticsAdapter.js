import { logError, logInfo, isNumber } from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import CONSTANTS from '../src/constants.json';
import { ajax } from '../src/ajax.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { getCoreStorageManager } from '../src/storageManager.js';
import * as events from '../src/events.js';

/// /////////// CONSTANTS //////////////
const ADAPTER_CODE = 'pubmaticIH';
const END_POINT_HOST = 'https://t.pubmatic.com/';
const END_POINT_BID_LOGGER = END_POINT_HOST + 'wl?';
const LOG_PRE_FIX = 'PubMatic-Identity-Analytics: ';

// todo: input profileId and profileVersionId ; defaults to zero or one
const enc = window.encodeURIComponent;
const DEFAULT_PUBLISHER_ID = 0;
const DEFAULT_PROFILE_ID = 0;
const DEFAULT_PROFILE_VERSION_ID = 0;
const DEFAULT_IDENTITY_ONLY = '0';
const IH_INIT = "initIdentityHub"; 
const IH_ANALYTICS_EXPIRY = 7;
const IH_LOGGER_STORAGE_KEY = "IH_LGCL_TS"

/// /////////// VARIABLES //////////////
let publisherId = DEFAULT_PUBLISHER_ID; // int: mandatory
let profileId = DEFAULT_PROFILE_ID; // int: optional
let profileVersionId = DEFAULT_PROFILE_VERSION_ID; // int: optional
let identityOnly = DEFAULT_IDENTITY_ONLY;
let domain = "";

export const coreStorage = getCoreStorageManager('userid');

/// /////////// HELPER FUNCTIONS //////////////

export function firePubMaticIHLoggerCall() {
  var ts = coreStorage.getDataFromLocalStorage(IH_LOGGER_STORAGE_KEY);
  const today = new Date();
  const expiry = isNumber(window.IHPWT.ihAnalyticsAdapterExpiry) ? window.IHPWT.ihAnalyticsAdapterExpiry : IH_ANALYTICS_EXPIRY;

  const expiresStr = (new Date(Date.now() + (expiry * (60 * 60 * 24 * 1000)))).toUTCString();
  if (ts === undefined || (ts !== undefined && new Date(ts) < today)) {
    logInfo("IHANALYTICS: Emitting event IH_INIT");
    coreStorage.setDataInLocalStorage(IH_LOGGER_STORAGE_KEY, expiresStr);
    events.emit(IH_INIT);
  } else {
    logInfo("IHANALYTICS: Not triggering logger call");
  }
};

function executeIHLoggerCall() {
  let pixelURL = END_POINT_BID_LOGGER;
  let outputObj = {};
  outputObj['pubid'] = '' + publisherId;
  outputObj['pid'] = '' + profileId;
  outputObj['pdvid'] = '' + profileVersionId;
  outputObj['ih'] = identityOnly;
  outputObj['orig'] = domain;
  pixelURL += 'pubid=' + publisherId;
  ajax(
    pixelURL,
    null,
    'json=' + enc(JSON.stringify(outputObj)), {
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true,
      method: 'POST'
    }
  );
};

/// /////////// ADAPTER EVENT HANDLER FUNCTIONS //////////////

/// /////////// ADAPTER DEFINITION //////////////

let baseAdapter = adapter({
  analyticsType: 'endpoint'
});
let pubmaticIHAdapter = Object.assign({}, baseAdapter, {

  enableAnalytics(conf = {}) {
    let error = false;

    if (typeof conf.options === 'object') {
      if (conf.options.publisherId) {
        publisherId = Number(conf.options.publisherId);
      }
      profileId = Number(conf.options.profileId) || 0;
      profileVersionId = Number(conf.options.profileVersionId) || 0;
      identityOnly = conf.options.identityOnly;
      domain = conf.options.domain || "";
    } else {
      logError(LOG_PRE_FIX + 'Config not found.');
      error = true;
    }

    if (!publisherId) {
      logError(LOG_PRE_FIX + 'Missing publisherId(Number).');
      error = true;
    }

    if (error) {
      logError(LOG_PRE_FIX + 'Not collecting data due to error(s).');
    } else {
      baseAdapter.enableAnalytics.call(this, conf);
    }
  },

  disableAnalytics() {
    publisherId = 0;
    profileId = 0;
    profileVersionId = 0;
    identityOnly = '0';
    baseAdapter.disableAnalytics.apply(this, arguments);
  },

  track({
    eventType
  }) {
    switch (eventType) {
      case IH_INIT:
        logInfo('IHANALYTICS Logger fired')
        executeIHLoggerCall();
        break;
    }
  }
});

/// /////////// ADAPTER REGISTRATION //////////////

adapterManager.registerAnalyticsAdapter({
  adapter: pubmaticIHAdapter,
  code: ADAPTER_CODE
});

(getGlobal()).firePubMaticIHLoggerCall = firePubMaticIHLoggerCall;
// export default pubmaticAdapter;
export { pubmaticIHAdapter as default };
