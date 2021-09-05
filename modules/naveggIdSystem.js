/**
 * This module adds naveggId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/naveggId
 * @requires module:modules/userId
 */
import * as utils from '../src/utils.js'
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'naveggId';
const OLD_NAVEGG_ID = 'nid';
const NAVEGG_ID = 'nvggid'

export const storage = getStorageManager();

function readnaveggIdFromLocalStorage() {
  return storage.getDataFromLocalStorage(NAVEGG_ID);
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

function readnvgnavFromLocalStorage() {
  var i;
  const query = '^nvg|^nav';
  for (i in window.localStorage) {
    if (i.match(query) || (!query && typeof i === 'string')) {
      return storage.getDataFromLocalStorage(i.match(query).input);
    }
  }
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
    const naveggIdVal = value ? utils.isStr(value) ? value : utils.isPlainObject(value) ? value.id : undefined : undefined;
    return naveggIdVal ? {
      'naveggId': naveggIdVal
    } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @return {{id: string | undefined } | undefined}
   */
  getId() {
    let naveggIdStringFromLocalStorage = null;
    if (storage.localStorageIsEnabled) {
      naveggIdStringFromLocalStorage = readnaveggIdFromLocalStorage() || readnvgnavFromLocalStorage();
    }

    const naveggIdString = naveggIdStringFromLocalStorage || readnaveggIDFromCookie() || readoldnaveggIDFromCookie() || readnvgIDFromCookie() || readnavIDFromCookie();

    if (typeof naveggIdString == 'string' && naveggIdString) {
      try {
        return { id: naveggIdString };
      } catch (error) {
        utils.logError(error);
      }
    }
    return undefined;
  }
};
submodule('userId', naveggIdSubmodule);
