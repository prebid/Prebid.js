/**
 * This module adds Zeotap to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/zeotapId+
 * @requires module:modules/userId
 */
import * as utils from '../src/utils.js'
import {submodule} from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const ZEOTAP_COOKIE_NAME = 'IDP';
const storage = getStorageManager();

function isValidConfig(configParams) {
  if (!configParams) {
    utils.logError('User ID - zeotapId submodule requires configParams');
    return false;
  }
  if (!configParams.partner) {
    utils.logError('User ID - zeotapId submodule requires partner list');
    return false;
  }
  return true;
}

function readCookie() {
  return storage.cookiesAreEnabled ? storage.readCookie(ZEOTAP_COOKIE_NAME) : null;
}

function readFromLocalStorage() {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(ZEOTAP_COOKIE_NAME) : null;
}

function fetchId(configParams) {
  if (!isValidConfig(configParams)) return undefined;
  const id = readCookie() || readFromLocalStorage();
  return { id };
};

/** @type {Submodule} */
export const zeotapIdPlusSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'zeotapId+',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { Object | string | undefined } value
   * @return { Object | string | undefined }
   */
  decode(value) {
    return value ? {
      'IDP': utils.isStr(value) ? value : utils.isPlainObject(value) ? value.id : undefined
    } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} configParams
   * @return {{id: string | undefined} | undefined}
   */
  getId(configParams) {
    return fetchId(configParams);
  }
};
submodule('userId', zeotapIdPlusSubmodule);
