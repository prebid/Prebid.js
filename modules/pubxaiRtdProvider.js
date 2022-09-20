import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { deepAccess, logError } from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'pubxai';

function init(provider) {
  const useRtd = deepAccess(provider, 'params.useRtd');
  if (!useRtd) {
    return false;
  }
  return true;
}

function fetchDataFromURL(url) {
  return new Promise((resolve, reject) => {
    const callback = {
      success(responseText, response) {
        resolve(JSON.parse(response.response));
      },
      error(error) {
        reject(error);
      }
    };

    ajax(url, callback);
  })
}

function setDataToConfig(url) {
  fetchDataFromURL(url)
    .then(response => {
      const { bucket, ...floorValues } = response;
      window.__PBXCNFG__.prb = bucket;
      window.__PBXCNFG__.flrs = floorValues;
    })
    .catch(err => {
      logError('pubX API Fetch Error: ', err);
    })
}

function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const endpoint = deepAccess(config, 'params.endpoint');
  setDataToConfig(endpoint);
}


export const pubxaiSubmodule = {
  name: SUBMODULE_NAME,
  init,
  getBidRequestData,
};

export function beforeInit() {
  submodule(MODULE_NAME, pubxaiSubmodule);
}

beforeInit();