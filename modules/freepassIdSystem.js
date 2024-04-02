import { submodule } from '../src/hook.js';
import { logMessage } from '../src/utils.js';
import { getCoreStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'freepassId';

export const FREEPASS_COOKIE_KEY = '_f_UF8cCRlr';
export const storage = getCoreStorageManager(MODULE_NAME);

export const freepassIdSubmodule = {
  name: MODULE_NAME,
  decode: function (value, config) {
    logMessage('Decoding FreePass ID: ', value);

    return { [MODULE_NAME]: value };
  },

  getId: function (config, consent, cachedIdObject) {
    logMessage('Getting FreePass ID using config: ' + JSON.stringify(config));

    const freepassData = config.params !== undefined ? (config.params.freepassData || {}) : {}
    const idObject = {};

    const userId = storage.getCookie(FREEPASS_COOKIE_KEY);
    if (userId !== null) {
      idObject.userId = userId;
    }

    if (freepassData.commonId !== undefined) {
      idObject.commonId = config.params.freepassData.commonId;
    }

    if (freepassData.userIp !== undefined) {
      idObject.userIp = config.params.freepassData.userIp;
    }

    return {id: idObject};
  },

  extendId: function (config, consent, cachedIdObject) {
    const freepassData = config.params.freepassData;
    const hasFreepassData = freepassData !== undefined;
    if (!hasFreepassData) {
      logMessage('No Freepass Data. CachedIdObject will not be extended: ' + JSON.stringify(cachedIdObject));
      return {
        id: cachedIdObject
      };
    }

    const currentCookieId = storage.getCookie(FREEPASS_COOKIE_KEY);

    logMessage('Extending FreePass ID object: ' + JSON.stringify(cachedIdObject));
    logMessage('Extending FreePass ID using config: ' + JSON.stringify(config));

    return {
      id: {
        commonId: freepassData.commonId,
        userIp: freepassData.userIp,
        userId: currentCookieId
      }
    };
  }
};

submodule('userId', freepassIdSubmodule);
