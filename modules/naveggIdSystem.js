/**
 * This module adds naveggId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/naveggId
 * @requires module:modules/userId
 */
import { isStr, isPlainObject, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'naveggId';
const OLD_NAVEGG_ID = 'nid';
const NAVEGG_ID = 'nvggid';
const BASE_URL = 'https://id.navegg.com/uid/';
const DEFAULT_EXPIRE = 8 * 24 * 3600 * 1000;
const INVALID_EXPIRE = 3600 * 1000;

export const storage = getStorageManager();

function getNaveggIdFromApi() {
  const callbacks = {
    success: response => {
      if (response) {
        try {
          const responseObj = JSON.parse(response);
          writeCookie(NAVEGG_ID, responseObj[NAVEGG_ID]);
        } catch (error) {
          logError(error);
        }
      }
    },
    error: error => {
      logError('Navegg ID fetch encountered an error', error);
    }
  };
  ajax(BASE_URL, callbacks, undefined, { method: 'GET', withCredentials: false });
}

function writeCookie(key, value) {
  try {
    if (storage.cookiesAreEnabled) {
      let expTime = new Date();
      const expires = value ? DEFAULT_EXPIRE : INVALID_EXPIRE;
      expTime.setTime(expTime.getTime() + expires);
      storage.setCookie(key, value, expTime.toUTCString(), 'none');
    }
  } catch (e) {
    logError(e);
  }
}

function readnaveggIdFromLocalStorage() {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(NAVEGG_ID) : null;
}

function readnaveggIDFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(NAVEGG_ID) : null;
}

function readoldnaveggIDFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(OLD_NAVEGG_ID) : null;
}

function readnvgIDFromCookie() {
  return storage.cookiesAreEnabled ? (storage.findSimilarCookies('nvg') ? storage.findSimilarCookies('nvg')[0] : null) : null;
}

function readnavIDFromCookie() {
  return storage.cookiesAreEnabled ? (storage.findSimilarCookies('nav') ? storage.findSimilarCookies('nav')[0] : null) : null;
}

/** @type {Submodule} */
export const naveggIdSubmodule = {
  /**
  * used to link submodule with config
  * @type {string}
  */
  name: MODULE_NAME,
  /**
  * decode the stored id value for passing to bid requests
  * @function
  * @param { Object | string | undefined } value
  * @return { Object | string | undefined }
  */
  decode(value) {
    const naveggIdVal = value ? isStr(value) ? value : isPlainObject(value) ? value.id : undefined : undefined;
    return naveggIdVal ? {
      'naveggId': naveggIdVal.split('|')[0]
    } : undefined;
  },
  /**
  * performs action to obtain id and return a value in the callback's response argument
  * @function
  * @param {SubmoduleConfig} config
  * @return {{id: string | undefined } | undefined}
  */
  getId() {
    const naveggIdString = readnaveggIdFromLocalStorage() || readnaveggIDFromCookie() || getNaveggIdFromApi() || readoldnaveggIDFromCookie() || readnvgIDFromCookie() || readnavIDFromCookie();

    if (typeof naveggIdString == 'string' && naveggIdString) {
      try {
        return { id: naveggIdString };
      } catch (error) {
        logError(error);
      }
    }
    return undefined;
  }
};
submodule('userId', naveggIdSubmodule);
