import { submodule } from '../src/hook.js';
import { logInfo } from '../src/utils.js'
import { fetch } from '../src/ajax.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const SERVER_IP = 'https://services.insurads.com';
const MODULE_NAME = 'insuradsRtd';
const ENDPOINT = `${SERVER_IP}/core/init/prebid`;
const LOG_PREFIX = 'insurads Rtd: ';
const GVLID = 596;

// Internal state to store keyValues
let keyValues = {};
let apiCallPromise = null;

export const insurAdsRtdProvider = {
  name: MODULE_NAME,
  gvlid: GVLID,
  init: init,
  getBidRequestData: getBidRequestData,
};

function init(config, userConsent) {
  const publicId = config?.params?.publicId;

  if (!publicId) {
    logInfo(LOG_PREFIX + 'publicId is required');
    return false;
  }

  // Start fetch immediately without blocking init
  apiCallPromise = makeApiCall(publicId);

  logInfo(LOG_PREFIX + 'submodule init', config, userConsent);
  return true;
}

function makeApiCall(publicId) {
  const currentUrl = encodeURIComponent(location.href);

  return fetch(`${ENDPOINT}/${publicId}?url=${currentUrl}`, {
    keepalive: true,
    credentials: 'include',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then((response) => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }).then((data) => {
    // Store the keyValues internally for later use in getTargetingData
    if (data && data.keyValues) {
      keyValues = data.keyValues;
      logInfo(LOG_PREFIX + 'Received keyValues from endpoint', data.keyValues);
    }
  }).catch((_e) => {
    // ignore errors for now
  });
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  logInfo(LOG_PREFIX + 'submodule getBidRequestData', reqBidsConfigObj, config, userConsent);

  // Wait for API call to complete before enriching bid requests
  const timeout = config?.params?.timeout || 1000; // Default 1 second timeout
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeout));

  Promise.race([apiCallPromise, timeoutPromise])
    .then(() => {
      // Enrich bid requests with RTD data for insurads bidder
      if (keyValues && Object.keys(keyValues).length > 0) {
        reqBidsConfigObj.adUnits.forEach(adUnit => {
          adUnit.bids.forEach(bid => {
            if (bid.bidder === 'insurads') {
              // Add RTD data to bid params so it can be accessed by the adapter
              bid.params = bid.params || {};

              bid.params.rtdData = keyValues;
              logInfo(LOG_PREFIX + 'Enriched bid request for insurads', bid.params.rtdData);
            }
          });
        });
      } else {
        logInfo(LOG_PREFIX + 'No keyValues available for bid enrichment');
      }

      callback();
    })
    .catch((_e) => {
      logInfo(LOG_PREFIX + 'Error waiting for API call');
      callback();
    });
}

function beforeInit() {
  // take actions to get data as soon as possible
  submodule('realTimeData', insurAdsRtdProvider);
}

beforeInit();
