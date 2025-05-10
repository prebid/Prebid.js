import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess } from '../src/utils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

export const MODULE_NAME = 'goldfishAdsRtd';
export const MODULE_TYPE = 'realTimeData';
export const ENDPOINT_URL = 'https://prebid.goldfishads.com/iab-segments';
export const DATA_STORAGE_KEY = 'goldfishads_data';
export const DATA_STORAGE_TTL = 1800 * 1000// TTL in seconds

export const ADAPTER_VERSION = '1.0';

export const storage = getStorageManager({
  gvlid: null,
  moduleName: MODULE_NAME,
  moduleType: MODULE_TYPE,
});

/**
 *
 * @param {{response: string[]} } response
 * @returns
 */
export const manageCallbackResponse = (response) => {
  try {
    const foo = JSON.parse(response.response);
    if (!Array.isArray(foo)) throw new Error('Invalid response');
    const enrichedResponse = {
      ext: {
        segtax: 4
      },
      segment: foo.map((segment) => { return { id: segment } }),
    };
    const output = {
      name: 'goldfishads.com',
      ...enrichedResponse,
    };
    return output;
  } catch (e) {
    throw e;
  };
};

/**
 * @param {string} key
 * @returns { Promise<{name: 'goldfishads.com', ext: { segtag: 4 }, segment: string[]}> }
 */

const getTargetingDataFromApi = (key) => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      customHeaders: {
        'Accept': 'application/json'
      }
    }
    const callbacks = {
      success(responseText, response) {
        try {
          const output = manageCallbackResponse(response);
          resolve(output);
        } catch (e) {
          reject(e);
        }
      },
      error(error) {
        reject(error);
      }
    };
    ajax(`${ENDPOINT_URL}?key=${key}`, callbacks, null, requestOptions)
  })
};

/**
 * @returns {{
 *    name: 'golfishads.com',
 *   ext: { segtax: 4},
 *   segment: string[]
 * } | null }
 */
export const getStorageData = () => {
  const now = new Date();
  const data = storage.getDataFromLocalStorage(DATA_STORAGE_KEY);
  if (data === null) return null;
  try {
    const foo = JSON.parse(data);
    if (now.getTime() > foo.expiry) return null;
    return foo.targeting;
  } catch (e) {
    return null;
  }
};

/**
 * @param { { key: string } } payload
 * @returns {Promise<{
 *  name: string,
 *  ext: { segtax: 4},
 *  segment: string[]
 * }> | null
 * }
 */

const getTargetingData = (payload) => new Promise((resolve) => {
  const targeting = getStorageData();
  if (targeting === null) {
    getTargetingDataFromApi(payload.key)
      .then((response) => {
        const now = new Date()
        const data = {
          targeting: response,
          expiry: now.getTime() + DATA_STORAGE_TTL,
        };
        storage.setDataInLocalStorage(DATA_STORAGE_KEY, JSON.stringify(data));
        resolve(response);
      })
      .catch((e) => {
        resolve(null);
      });
  } else {
    resolve(targeting);
  }
})

/**
 *
 * @param {*} config
 * @param {*} userConsent
 * @returns {boolean}
 */

const init = (config, userConsent) => {
  if (!config.params || !config.params.key) return false;
  // return { type: (typeof config.params.key === 'string') };
  if (!(typeof config.params.key === 'string')) return false;
  return true;
};

/**
 *
 * @param {{
 *  name: string,
 *  ext: { segtax: 4},
 *  segment: {id: string}[]
 * } | null } userData
 * @param {*} reqBidsConfigObj
 * @returns
 */
export const updateUserData = (userData, reqBidsConfigObj) => {
  if (userData === null) return;
  const bidders = ['appnexus', 'rubicon', 'nexx360'];
  for (let i = 0; i < bidders.length; i++) {
    const bidderCode = bidders[i];
    const originalConfig = deepAccess(reqBidsConfigObj, `ortb2Fragments.bidder[${bidderCode}].user.data`) || [];
    const userConfig = [
      ...originalConfig,
      userData,
    ];
    reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments || {};
    reqBidsConfigObj.ortb2Fragments.bidder = reqBidsConfigObj.ortb2Fragments.bidder || {};
    reqBidsConfigObj.ortb2Fragments.bidder[bidderCode] = reqBidsConfigObj.ortb2Fragments.bidder[bidderCode] || {};
    reqBidsConfigObj.ortb2Fragments.bidder[bidderCode].user = reqBidsConfigObj.ortb2Fragments.bidder[bidderCode].user = {};
    reqBidsConfigObj.ortb2Fragments.bidder[bidderCode].user.data = reqBidsConfigObj.ortb2Fragments.bidder[bidderCode].user.data || userConfig;
  }
  return reqBidsConfigObj;
}

/**
 *
 * @param {*} reqBidsConfigObj
 * @param {*} callback
 * @param {*} moduleConfig
 * @param {*} userConsent
 * @returns {void}
 */
const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  const payload = {
    key: moduleConfig.params.key,
  };
  getTargetingData(payload)
    .then((userData) => {
      updateUserData(userData, reqBidsConfigObj);
      callback();
    });
};

/** @type {RtdSubmodule} */
export const goldfishAdsSubModule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
};

submodule(MODULE_TYPE, goldfishAdsSubModule);
