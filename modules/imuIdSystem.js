/**
 * The {@link module:modules/userId} module is required
 * @module modules/imuIdSystem
 *
 * @requires module:modules/userId
 */

import { timestamp, logError } from '../src/utils.js';
import { ajax } from '../src/ajax.js'
import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 */

const MODULE_NAME = 'imuid';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

export const storageKey = '__im_uid';
export const storagePpKey = '__im_ppid';
export const cookieKey = '_im_vid';
export const apiDomain = 'sync6.im-apps.net';
const storageMaxAge = 1800000; // 30 minites (30 * 60 * 1000)
const cookiesMaxAge = 97200000000; // 37 months ((365 * 3 + 30) * 24 * 60 * 60 * 1000)

function setImDataInCookie(value) {
  storage.setCookie(
    cookieKey,
    value,
    new Date(timestamp() + cookiesMaxAge).toUTCString(),
    'none'
  );
}

export function removeImDataFromLocalStorage() {
  storage.removeDataFromLocalStorage(storageKey);
  storage.removeDataFromLocalStorage(`${storageKey}_mt`);
  storage.removeDataFromLocalStorage(storagePpKey);
}

export function getLocalData() {
  const mt = storage.getDataFromLocalStorage(`${storageKey}_mt`);
  let expired = true;
  if (Date.parse(mt) && Date.now() - (new Date(mt)).getTime() < storageMaxAge) {
    expired = false;
  }
  return {
    id: storage.getDataFromLocalStorage(storageKey),
    ppid: storage.getDataFromLocalStorage(storagePpKey),
    vid: storage.getCookie(cookieKey),
    expired: expired
  };
}

export function getApiUrl(cid, url) {
  if (url) {
    return `${url}?cid=${cid}`;
  }
  return `https://${apiDomain}/${cid}/pid`;
}

export function apiSuccessProcess(jsonResponse) {
  if (!jsonResponse) {
    return;
  }
  if (jsonResponse.uid && jsonResponse.ppid) {
    storage.setDataInLocalStorage(storageKey, jsonResponse.uid);
    storage.setDataInLocalStorage(`${storageKey}_mt`, new Date(timestamp()).toUTCString());
    storage.setDataInLocalStorage(storagePpKey, jsonResponse.ppid);
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
        const callbackObj = {
          imuid: responseObj.uid,
          imppid: responseObj.ppid
        };
        callback(callbackObj);
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

/** @type {Submodule} */
export const imuIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @returns {{imuid: string, imppid: string} | undefined}
   */
  decode(ids) {
    if (ids && typeof ids === 'object') {
      return {
        imuid: ids.imuid,
        imppid: ids.imppid
      };
    }
    return undefined;
  },
  /**
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {{id:{imuid: string, imppid: string}} | undefined | {callback:function}}}
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
      return {callback: callImuidApi(apiUrl)};
    }
    if (localData.expired) {
      callImuidApi(apiUrl)();
    }
    return {
      id: {
        imuid: localData.id,
        imppid: localData.ppid
      }
    };
  },
  eids: {
    'imppid': {
      source: 'ppid.intimatemerger.com',
      atype: 1
    },
    'imuid': {
      source: 'intimatemerger.com',
      atype: 1
    },
  }
};

submodule('userId', imuIdSubmodule);
