/**
 * This module adds naveggId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/naveggId
 * @requires module:modules/userId
 */
import { isStr, isPlainObject, logError } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import {getStorageManager, STORAGE_TYPE_COOKIES, STORAGE_TYPE_LOCALSTORAGE} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 */

const MODULE_NAME = 'naveggId';
const OLD_NAVEGG_ID = 'nid';
const NAVEGG_ID = 'nvggid';
const BASE_URL = 'https://id.navegg.com/uid/';
const DEFAULT_EXPIRE = 8 * 24 * 3600 * 1000;
const INVALID_EXPIRE = 3600 * 1000;

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/* eslint-disable no-console */
function getIdFromAPI(toStore, storedName) {
  const resp = function (callback) {
    ajax(BASE_URL, {
      success: response => {
        if (response) {
          try {
            const responseObj = {'nvggid': 'bmF2ZWdnaWQK'} // JSON.parse(response);
            console.log('responseObj: ' + responseObj)
            callback(responseObj[NAVEGG_ID])
          } catch (error) {
            logError(error);
            callback()
          }
        }
      },
      error: error => {
        logError('Navegg ID fetch encountered an error', error);
      }
    },
    undefined, { method: 'GET', withCredentials: false });
  }
  return resp
}

/**
 * @returns {string | null}
 */
function readNaveggIdFromLocalStorage() {
  return storage.localStorageIsEnabled ? storage.getDataFromLocalStorage(NAVEGG_ID) : null;
}
/**
 * @returns {string | null}
 */
function readNaveggIdFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(NAVEGG_ID) : null;
}
/**
 * @returns {string | null}
 */
function readOldNaveggIdFromCookie() {
  return storage.cookiesAreEnabled ? storage.getCookie(OLD_NAVEGG_ID) : null;
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
    console.log('decode value: ' + value)
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
  getId({ name, enabledStorageTypes = [], storage: storageConfig = {} }) {
    const resp = getIdFromAPI(enabledStorageTypes, storageConfig.name)

    // const naveggIdOldString = readOldNaveggIdFromCookie() || readNvgIdFromCookie() || readNavIdFromCookie()
    // const naveggIdLocalStorage = readNaveggIdFromLocalStorage()
    // const naveggIdCookie = readNaveggIdFromCookie()
    // let toStore = []

    // if (!naveggIdLocalStorage && enabledStorageTypes.indexOf(STORAGE_TYPE_LOCALSTORAGE) > -1) { toStore.push(STORAGE_TYPE_LOCALSTORAGE) }
    // if (!naveggIdCookie && enabledStorageTypes.indexOf(STORAGE_TYPE_COOKIES) > -1) { toStore.push(STORAGE_TYPE_COOKIES) }
    // saveNaveggIdFromApi(toStore, storageConfig.name)

    // const naveggIdString = readNaveggIdFromCookie() || readNaveggIdFromLocalStorage();

    // console.log('naveggIdString: ' + naveggIdString)
    // console.log('----------------------------')

    // if (typeof naveggIdString == 'string' && naveggIdString) {
    //   try {
    //     return { id: naveggIdString };
    //   } catch (error) {
    //     logError(error);
    //   }
    // }
    // return undefined;
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
