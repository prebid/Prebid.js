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

/** @type {RtdSubmodule} */
export const subModuleObj = {
  name: MODULE_NAME,
  gvlid: GVLID,
  init: init,
  getTargetingData: getTargetingData
};

export const insurAdsRtdProvider = {
  name: MODULE_NAME,
  gvlid: GVLID,
  init: init,
  getTargetingData: getTargetingData
};

function init(config, userConsent) {
  const publicId = config?.params?.publicId;

  if (!publicId) {
    logInfo(LOG_PREFIX + 'publicId is required');
    return false;
  }

  // Start fetch immediately without blocking init
  makeApiCall(publicId);

  logInfo(LOG_PREFIX + 'submodule init', config, userConsent);
  return true;
}

function makeApiCall(publicId) {
  const currentUrl = encodeURIComponent(location.href);

  fetch(`${ENDPOINT}/${publicId}?url=${currentUrl}`, {
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

function getTargetingData(adUnitCodes, config, userConsent, auctionDetails) {
  logInfo(LOG_PREFIX + 'submodule getTargetingData', adUnitCodes, config, userConsent);
  const targetingData = {};

  // Use the keyValues from the API response stored internally
  if (!keyValues || Object.keys(keyValues).length === 0) {
    logInfo(LOG_PREFIX + 'No keyValues available to set targeting data');
    return targetingData;
  }

  adUnitCodes.forEach(code => {
    targetingData[code] = keyValues;
  });

  return targetingData;
}

function beforeInit() {
  // take actions to get data as soon as possible
  submodule('realTimeData', subModuleObj);
}

beforeInit();
