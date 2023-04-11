/**
 * This module adds GrowthCode HEM and other Data to Bid Requests
 * @module modules/growthCodeRtdProvider
 */
import { submodule } from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';
import {
  logMessage, logError, tryAppendQueryString, mergeDeep
} from '../src/utils.js';
import {ajax} from '../src/ajax.js';

const MODULE_NAME = 'growthCodeRtd';
const LOG_PREFIX = 'GrowthCodeRtd: ';
const ENDPOINT_URL = 'https://p2.gcprivacy.com/v2/rtd?'
const RTD_CACHE_KEY = 'gc_rtd_items'

export const storage = getStorageManager({ gvlid: undefined, moduleName: MODULE_NAME });
let items

export const subModuleObj = {
  name: MODULE_NAME,
  init: init,
  getBidRequestData: alterBidRequests
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

  const configParams = (config && config.params) || {};

  items = tryParse(storage.getDataFromLocalStorage(RTD_CACHE_KEY, null));
  if (items === null) {
    let gcid = localStorage.getItem('gcid')

    let url = configParams.url ? configParams.url : ENDPOINT_URL;
    url = tryAppendQueryString(url, 'pid', configParams.pid);
    url = tryAppendQueryString(url, 'u', window.location.href);
    url = tryAppendQueryString(url, 'gcid', gcid);

    ajax(url, {
      success: response => {
        let respJson = tryParse(response);
        // If response is a valid json and should save is true
        if (respJson && respJson.items >= 1) {
          storage.setDataInLocalStorage(RTD_CACHE_KEY, JSON.stringify(respJson.items), null);
        }
      },
      error: error => {
        logError(LOG_PREFIX + 'ID fetch encountered an error', error);
      }
    }, undefined, {method: 'GET', withCredentials: true})
  }

  return true;
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
    let adUnits = reqBidsConfigObj.adUnits
    for (let i = 0; i < adUnits.length; i++) {
      let adUnit = adUnits[i];
      for (let k = 0; k < adUnit.bids.length; k++) {
        let bid = adUnit.bids[k]
        for (let j = 0; j < items.length; j++) {
          let item = items[j]
          if (item.bidder === bid.bidder) {
            let data = JSON.parse(item.parameters);
            if (item.attachment_point === 'reqBidsConfigObj.ortb2Fragments.bidder') {
              mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, data)
            }
          }
        }
      }
    }
  }
  callback();
}

submodule('realTimeData', subModuleObj);
