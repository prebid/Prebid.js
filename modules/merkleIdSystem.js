/**
 * This module adds merkleId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/merkleIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'merkleId';
const SESSION_COOKIE_NAME = '_svsid';
const ID_URL = 'https://id2.sv.rkdms.com/identity/';

export const storage = getStorageManager();

function getSession(configParams) {
  let session = null;
  if (typeof configParams.sv_session !== 'string') {
    session = configParams.sv_session;
  } else {
    session = readCookie() || readFromLocalStorage();
  }
  return session;
}

function readCookie() {
  return storage.cookiesAreEnabled() ? storage.getCookie(SESSION_COOKIE_NAME) : null;
}

function readFromLocalStorage() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(SESSION_COOKIE_NAME) : null;
}

function constructUrl(configParams) {
  const session = getSession(configParams);
  let url = ID_URL + `?vendor=${configParams.vendor}&sv_cid=${configParams.sv_cid}&sv_domain=${configParams.sv_domain}&sv_pubid=${configParams.sv_pubid}`;
  if (session) {
    url.append(`&sv_session=${session}`);
  }
  utils.logInfo('Merkle url :' + url);
  return url;
}

/** @type {Submodule} */
export const merkleIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{merkleId:string}}
   */
  decode(value) {
    const id = (value && value.pam_id && typeof value.pam_id.id === 'string') ? value.pam_id : undefined;
    utils.logInfo('Merkle id ' + JSON.stringify(id));
    return id ? { 'merkleId': id } : undefined;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const configParams = (config && config.params) || {};
    if (!configParams || typeof configParams.vendor !== 'string') {
      utils.logError('User ID - merkleId submodule requires a valid vendor to be defined');
      return;
    }

    if (typeof configParams.sv_cid !== 'string') {
      utils.logError('User ID - merkleId submodule requires a valid sv_cid string to be defined');
      return;
    }

    if (typeof configParams.sv_pubid !== 'string') {
      utils.logError('User ID - merkleId submodule requires a valid sv_pubid string to be defined');
      return;
    }

    if (typeof configParams.sv_domain !== 'string') {
      utils.logError('User ID - merkleId submodule requires a valid sv_domain string to be defined');
      return;
    }

    if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
      utils.logError('User ID - merkleId submodule does not currently handle consent strings');
      return;
    }
    const url = constructUrl(configParams);

    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              utils.logInfo('Merkle responseObj ' + JSON.stringify(responseObj));
            } catch (error) {
              utils.logError(error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          utils.logError(`${MODULE_NAME}: merkleId fetch encountered an error`, error);
          callback();
        }
      };
      ajax(url, callbacks, undefined, {method: 'GET', withCredentials: true});
    };
    return {callback: resp};
  }
};

submodule('userId', merkleIdSubmodule);
