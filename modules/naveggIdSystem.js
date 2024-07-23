/**
 * This module adds naveggId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/naveggId
 * @requires module:modules/userId
 */
import { isStr, isPlainObject, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import * as ajaxLib from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 */

const MODULE_NAME = 'naveggId';
const OLD_NAVEGG_ID = 'nid';
const NAVEGG_ID = 'nvggid';
const BASE_URL = 'https://id.navegg.com/uid/';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/* eslint-disable no-console */
function getIdFromAPI(toStore, storedName) {
  const resp = function (callback) {
    ajaxLib.ajaxBuilder()(
      BASE_URL,
      response => {
        if (response) {
          let responseObj;

          try {
            responseObj = JSON.parse(response);
            console.log(JSON.stringify(responseObj))
          } catch (error) {
            logError(error);
            const fallbackValue = getOldCookie();
            callback(fallbackValue)
          }

          if (responseObj && responseObj[NAVEGG_ID]) {
            callback(responseObj[NAVEGG_ID]);
          } else {
            const fallbackValue = getOldCookie();
            console.log('fallbackValue ' + fallbackValue)
            callback(fallbackValue);
          }
        }
      },
      error => {
        logError('Navegg ID fetch encountered an error', error);
        const fallbackValue = getOldCookie();
        callback(fallbackValue)
      },
      {method: 'GET', withCredentials: false});
  };
  return resp
}

/**
 * @returns {string | null}
 */
function readNvgIdFromCookie() {
  return storage.cookiesAreEnabled ? (storage.findSimilarCookies('nvg') ? storage.findSimilarCookies('nvg')[0] : null) : null;
}
/**
 * @returns {string | null}
 */
function readNavIdFromCookie() {
  return storage.cookiesAreEnabled ? (storage.findSimilarCookies('nav') ? storage.findSimilarCookies('nav')[0] : null) : null;
}
/**
 * @returns {string | null}
 */
function readOldNaveggIdFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(OLD_NAVEGG_ID) : null;
}

function getOldCookie() {
  const oldCookie = readOldNaveggIdFromCookie() || readNvgIdFromCookie() || readNavIdFromCookie();
  return oldCookie;
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
  getId({ name, enabledStorageTypes = [], storage: storageConfig = {} }, gdprConsent, storedId) {
    const resp = getIdFromAPI(enabledStorageTypes, storageConfig.name)
    return {callback: resp}
  },
  eids: {
    'naveggId': {
      source: 'navegg.com',
      atype: 1
    },
  }
};
submodule('userId', naveggIdSubmodule);
