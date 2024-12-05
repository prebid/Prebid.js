/**
 * This module adds GrowthCode HEM and other Data to Bid Requests
 * @module modules/growthCodeRtdProvider
 */
import { submodule } from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';
import {
  logMessage, logError, mergeDeep
} from '../src/utils.js';
import * as ajax from '../src/ajax.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import {tryAppendQueryString} from '../libraries/urlUtils/urlUtils.js';

const MODULE_NAME = 'growthCodeRtd';
const LOG_PREFIX = 'GrowthCodeRtd: ';
const ENDPOINT_URL = 'https://p2.gcprivacy.com/v2/rtd?'
const RTD_EXPIRE_KEY = 'gc_rtd_expires_at'
const RTD_CACHE_KEY = 'gc_rtd_items'

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: MODULE_NAME });
let items

export const growthCodeRtdProvider = {
  name: MODULE_NAME,
  init: init,
  getBidRequestData: alterBidRequests,
  addData: addData,
  callServer: callServer
};

/**
 * Parse json if possible, else return null
 * @param data
 * @returns {any|null}
 */
function tryParse(data) {
  try {
    return JSON.parse(data);
  } catch (err) {
    logError(err);
    return null;
  }
}

/**
 * Init The RTD Module
 * @param config
 * @param userConsent
 * @returns {boolean}
 */
function init(config, userConsent) {
  logMessage(LOG_PREFIX + 'Init RTB');

  if (config == null) {
    return false
  }

  const configParams = (config && config.params) || {};
  let expiresAt = parseInt(storage.getDataFromLocalStorage(RTD_EXPIRE_KEY, null));

  items = tryParse(storage.getDataFromLocalStorage(RTD_CACHE_KEY, null));

  if (configParams.pid === undefined) {
    return true; // Die gracefully
  } else {
    return callServer(configParams, items, expiresAt, userConsent);
  }
}
function callServer(configParams, items, expiresAt, userConsent) {
  // Expire Cache
  let now = Math.trunc(Date.now() / 1000);
  if ((!isNaN(expiresAt)) && (now > expiresAt)) {
    expiresAt = NaN;
    storage.removeDataFromLocalStorage(RTD_CACHE_KEY, null)
    storage.removeDataFromLocalStorage(RTD_EXPIRE_KEY, null)
  }
  if ((items === null) && (isNaN(expiresAt))) {
    let gcid = storage.getDataFromLocalStorage('gcid')

    let url = configParams.url ? configParams.url : ENDPOINT_URL;
    url = tryAppendQueryString(url, 'pid', configParams.pid);
    url = tryAppendQueryString(url, 'u', window.location.href);
    url = tryAppendQueryString(url, 'gcid', gcid);
    if ((userConsent !== null) && (userConsent.gdpr !== null) && (userConsent.gdpr.consentString)) {
      url = tryAppendQueryString(url, 'tcf', userConsent.gdpr.consentString)
    }

    ajax.ajaxBuilder()(url, {
      success: response => {
        let respJson = tryParse(response);
        // If response is a valid json and should save is true
        if (respJson && respJson.results >= 1) {
          storage.setDataInLocalStorage(RTD_CACHE_KEY, JSON.stringify(respJson.items), null);
          storage.setDataInLocalStorage(RTD_EXPIRE_KEY, respJson.expires_at, null)
        } else {
          storage.setDataInLocalStorage(RTD_EXPIRE_KEY, respJson.expires_at, null)
        }
      },
      error: error => {
        logError(LOG_PREFIX + 'ID fetch encountered an error', error);
      }
    }, undefined, {method: 'GET', withCredentials: true})
  }

  return true;
}

function addData(reqBidsConfigObj, items) {
  let merge = false

  for (let j = 0; j < items.length; j++) {
    let item = items[j]
    let data = JSON.parse(item.parameters);
    if (item['attachment_point'] === 'data') {
      mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, data)
      merge = true
    }
  }
  return merge
}

/**
 * Alter the Bid Request for additional information such as HEM or 3rd Party Ids
 * @param reqBidsConfigObj
 * @param callback
 * @param config
 * @param userConsent
 */
function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  if (items != null) {
    addData(reqBidsConfigObj, items)
  }
  callback();
}

submodule('realTimeData', growthCodeRtdProvider);
