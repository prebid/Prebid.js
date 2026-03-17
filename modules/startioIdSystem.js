/**
 * This module adds startio ID support to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/startioIdSystem
 * @requires module:modules/userId
 */
import { logError, formatQS } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';

const MODULE_NAME = 'startioId';
const DEFAULT_ENDPOINT = 'https://cs.startappnetwork.com/get-uid-obj?p=m4b8b3y4';

const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function getCachedId() {
  let cachedId;

  if (storage.cookiesAreEnabled()) {
    cachedId = storage.getCookie(MODULE_NAME);
  }

  if (!cachedId && storage.hasLocalStorage()) {
    const expirationStr = storage.getDataFromLocalStorage(`${MODULE_NAME}_exp`);
    if (expirationStr) {
      const expirationDate = new Date(expirationStr);
      if (expirationDate > new Date()) {
        cachedId = storage.getDataFromLocalStorage(MODULE_NAME);
      }
    }
  }

  return cachedId || null;
}

function storeId(id, expiresInDays) {
  expiresInDays = expiresInDays || 90;
  const expirationDate = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toUTCString();

  if (storage.cookiesAreEnabled()) {
    storage.setCookie(MODULE_NAME, id, expirationDate, 'None');
  }

  if (storage.hasLocalStorage()) {
    storage.setDataInLocalStorage(`${MODULE_NAME}_exp`, expirationDate);
    storage.setDataInLocalStorage(MODULE_NAME, id);
  }
}

function fetchIdFromServer(callback, expiresInDays, consentData) {
  const consentParams = getUserSyncParams(
    consentData?.gdpr,
    consentData?.usp,
    consentData?.gpp
  );
  const queryString = formatQS(consentParams);
  const url = queryString ? `${DEFAULT_ENDPOINT}&${queryString}` : DEFAULT_ENDPOINT;

  const callbacks = {
    success: response => {
      let responseId;
      try {
        const responseObj = JSON.parse(response);
        if (responseObj && responseObj.uid) {
          responseId = responseObj.uid;
          storeId(responseId, expiresInDays);
        } else {
          logError(`${MODULE_NAME}: Server response missing 'uid' field`);
        }
      } catch (error) {
        logError(`${MODULE_NAME}: Error parsing server response`, error);
      }
      callback(responseId);
    },
    error: error => {
      logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
      callback();
    }
  };
  ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true });
}

export const startioIdSubmodule = {
  name: MODULE_NAME,
  decode(value) {
    return value && typeof value === 'string'
      ? { 'startioId': value }
      : undefined;
  },
  getId(config, consentData, storedId) {
    if (storedId) {
      return { id: storedId };
    }

    const cachedId = getCachedId();
    if (cachedId) {
      return { id: cachedId };
    }
    const storageConfig = config && config.storage;
    const expiresInDays = storageConfig && storageConfig.expires;
    return { callback: (cb) => fetchIdFromServer(cb, expiresInDays, consentData) };
  },

  eids: {
    'startioId': {
      source: 'start.io',
      atype: 1
    },
  }
};

submodule('userId', startioIdSubmodule);
