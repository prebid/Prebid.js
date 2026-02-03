import { logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager, STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'startioId';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function storeId(id, storageConfig = {}) {
  const expires = storageConfig.expires || 365;
  const expirationDate = new Date(Date.now() + (expires * 24 * 60 * 60 * 1000));
  const storageType = storageConfig.type || '';
  const useCookie = !storageType || storageType.includes(STORAGE_TYPE_COOKIES);
  const useLocalStorage = !storageType || storageType.includes(STORAGE_TYPE_LOCALSTORAGE);

  if (useCookie && storage.cookiesAreEnabled()) {
    storage.setCookie(MODULE_NAME, id, expirationDate.toUTCString());
  }

  if (useLocalStorage && storage.localStorageIsEnabled()) {
    storage.setDataInLocalStorage(MODULE_NAME, id);
  }
}

export const startioIdSubmodule = {
  name: MODULE_NAME,
  decode(value) {
    return value && typeof value === 'string'
      ? { 'startioId': value }
      : undefined;
  },
  getId(config, consentData, storedId) {
    const configParams = (config && config.params) || {};
    const storageConfig = (config && config.storage) || {};

    if (storedId) {
      return { id: storedId };
    }

    if (!configParams.endpoint || typeof configParams.endpoint !== 'string') {
      logError(`${MODULE_NAME} module requires an endpoint parameter.`);
      return;
    }

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseId;
          try {
            const responseObj = JSON.parse(response);
            if (responseObj && responseObj.id) {
              responseId = responseObj.id;
              storeId(responseId, storageConfig);
            } else {
              logError(`${MODULE_NAME}: Server response missing 'id' field`);
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
      ajax(configParams.endpoint, callbacks, undefined, { method: 'GET' });
    };
    return { callback: resp };
  },

  eids: {
    'startioId': {
      source: 'start.io',
      atype: 3
    },
  }
};

submodule('userId', startioIdSubmodule);
