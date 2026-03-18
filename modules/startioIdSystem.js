/**
 * This module adds startio ID support to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/startioIdSystem
 * @requires module:modules/userId
 */
import { logError, formatQS } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { getUserSyncParams } from '../libraries/userSyncUtils/userSyncUtils.js';

const MODULE_NAME = 'startioId';
const DEFAULT_ENDPOINT = 'https://cs.startappnetwork.com/get-uid-obj?p=m4b8b3y4';

function fetchIdFromServer(callback, consentData) {
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
    if (config.storage && config.storage.expires == null) {
      config.storage.expires = 90;
    }
    return { callback: (cb) => fetchIdFromServer(cb, consentData) };
  },

  eids: {
    'startioId': {
      source: 'start.io',
      atype: 1
    },
  }
};

submodule('userId', startioIdSubmodule);
