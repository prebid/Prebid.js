/**
 * The {@link module:modules/userId} module is required
 * @module modules/imuIdSystem
 *
 * @requires module:modules/userId
 */

import { timestamp, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js'
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();

export const storageKey = '__im_uid';
export const cookieKey = '_im_vid';
export const apiUrl = 'https://audiencedata.im-apps.net/imuid/get';
const storageMaxAge = 1800000; // 30 minites (30 * 60 * 1000)
const cookiesMaxAge = 97200000000; // 37 months ((365 * 3 + 30) * 24 * 60 * 60 * 1000)

export function setImDataInLocalStorage(value) {
  storage.setDataInLocalStorage(storageKey, value);
  storage.setDataInLocalStorage(`${storageKey}_mt`, new Date(timestamp()).toUTCString());
}

export function removeImDataFromLocalStorage() {
  storage.removeDataFromLocalStorage(storageKey);
  storage.removeDataFromLocalStorage(`${storageKey}_mt`);
}

function setImDataInCookie(value) {
  storage.setCookie(
    cookieKey,
    value,
    new Date(timestamp() + cookiesMaxAge).toUTCString(),
    'none'
  );
}

export function getLocalData() {
  const mt = storage.getDataFromLocalStorage(`${storageKey}_mt`);
  let expired = true;
  if (Date.parse(mt) && Date.now() - (new Date(mt)).getTime() < storageMaxAge) {
    expired = false;
  }
  return {
    id: storage.getDataFromLocalStorage(storageKey),
    vid: storage.getCookie(cookieKey),
    expired: expired
  };
}

export function apiSuccessProcess(jsonResponse) {
  if (!jsonResponse) {
    return;
  }
  if (jsonResponse.uid) {
    setImDataInLocalStorage(jsonResponse.uid);
    if (jsonResponse.vid) {
      setImDataInCookie(jsonResponse.vid);
    }
  } else {
    removeImDataFromLocalStorage();
  }
}

export function getApiCallback(callback) {
  return {
    success: response => {
      let responseObj = {};
      if (response) {
        try {
          responseObj = JSON.parse(response);
          apiSuccessProcess(responseObj);
        } catch (error) {
          logError('User ID - imuid submodule: ' + error);
        }
      }
      if (callback && responseObj.uid) {
        callback(responseObj.uid);
      }
    },
    error: error => {
      logError('User ID - imuid submodule was unable to get data from api: ' + error);
      if (callback) {
        callback();
      }
    }
  };
}

export function callImuidApi(apiUrl) {
  return function (callback) {
    ajax(apiUrl, getApiCallback(callback), undefined, {method: 'GET', withCredentials: true});
  };
}

export function getApiUrl(cid, url) {
  if (url) {
    return `${url}?cid=${cid}`;
  }
  return `${apiUrl}?cid=${cid}`;
}

/** @type {Submodule} */
export const imuIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'imuid',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{imuid: string} | undefined}
   */
  decode(id) {
    if (id && typeof id === 'string') {
      return {imuid: id};
    }
    return undefined;
  },
  /**
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {{id: string} | undefined | {callback:function}}}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.cid !== 'number') {
      logError('User ID - imuid submodule requires a valid cid to be defined');
      return undefined;
    }
    let apiUrl = getApiUrl(configParams.cid, configParams.url);
    const localData = getLocalData();
    if (localData.vid) {
      apiUrl += `&vid=${localData.vid}`;
      setImDataInCookie(localData.vid);
    }

    if (!localData.id) {
      return {callback: callImuidApi(apiUrl)}
    }
    if (localData.expired) {
      callImuidApi(apiUrl)();
    }
    return {id: localData.id};
  }
};

submodule('userId', imuIdSubmodule);
