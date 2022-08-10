/**
 * This module adds merkleId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/merkleIdSystem
 * @requires module:modules/userId
 */

import { logInfo, logError, logWarn } from '../src/utils.js';
import * as ajaxLib from '../src/ajax.js';
import {submodule} from '../src/hook.js'
import {getStorageManager} from '../src/storageManager.js';

const MODULE_NAME = 'merkleId';
const ID_URL = 'https://prebid.sv.rkdms.com/identity/';
const DEFAULT_REFRESH = 7 * 3600;
const SESSION_COOKIE_NAME = '_svsid';

export const storage = getStorageManager();

function getSession(configParams) {
  let session = null;
  if (typeof configParams.sv_session === 'string') {
    session = configParams.sv_session;
  } else {
    session = storage.getCookie(SESSION_COOKIE_NAME);
  }
  return session;
}

function setCookie(name, value, expires) {
  let expTime = new Date();
  expTime.setTime(expTime.getTime() + expires * 1000 * 60);
  storage.setCookie(name, value, expTime.toUTCString(), 'Lax');
}

function setSession(storage, response) {
  logInfo('Merkle setting ' + `${SESSION_COOKIE_NAME}`);
  if (response && response[SESSION_COOKIE_NAME] && typeof response[SESSION_COOKIE_NAME] === 'string') {
    setCookie(SESSION_COOKIE_NAME, response[SESSION_COOKIE_NAME], storage.expires);
  }
}

function constructUrl(configParams) {
  const session = getSession(configParams);
  let url = configParams.endpoint + `?sv_domain=${configParams.sv_domain}&sv_pubid=${configParams.sv_pubid}&ssp_ids=${configParams.ssp_ids.join()}`;
  if (session) {
    url = `${url}&sv_session=${session}`;
  }
  logInfo('Merkle url :' + url);
  return url;
}

function generateId(configParams, configStorage) {
  const url = constructUrl(configParams);

  const resp = function (callback) {
    ajaxLib.ajaxBuilder()(
      url,
      response => {
        let responseObj;
        if (response) {
          try {
            responseObj = JSON.parse(response);
            setSession(configStorage, responseObj)
            logInfo('Merkle responseObj ' + JSON.stringify(responseObj));
          } catch (error) {
            logError(error);
          }
        }

        const date = new Date().toUTCString();
        responseObj.date = date;
        logInfo('Merkle responseObj with date ' + JSON.stringify(responseObj));
        callback(responseObj);
      },
      error => {
        logError(`${MODULE_NAME}: merkleId fetch encountered an error`, error);
        callback();
      },
      {method: 'GET', withCredentials: true}
    );
  };
  return resp;
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
     * @returns {{eids:arrayofields}}
     */
  decode(value) {
    // Legacy support for a single id
    const id = (value && value.pam_id && typeof value.pam_id.id === 'string') ? value.pam_id : undefined;
    logInfo('Merkle id ' + JSON.stringify(id));

    if (id) {
      return {'merkleId': id}
    }

    // Supports multiple IDs for different SSPs
    const merkleIds = (value && value?.merkleId && Array.isArray(value.merkleId)) ? value.merkleId : undefined;
    logInfo('merkleIds: ' + JSON.stringify(merkleIds));

    return merkleIds ? {'merkleId': merkleIds} : undefined;
  },

  /**
     * performs action to obtain id and return a value in the callback's response argument
     * @function
     * @param {SubmoduleConfig} [config]
     * @param {ConsentData} [consentData]
     * @returns {IdResponse|undefined}
     */
  getId(config, consentData) {
    logInfo('User ID - merkleId generating id');

    const configParams = (config && config.params) || {};

    if (typeof configParams.sv_pubid !== 'string') {
      logError('User ID - merkleId submodule requires a valid sv_pubid string to be defined');
      return;
    }

    if (!Array.isArray(configParams.ssp_ids)) {
      logError('User ID - merkleId submodule requires a valid ssp_ids array to be defined');
      return;
    }

    if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
      logError('User ID - merkleId submodule does not currently handle consent strings');
      return;
    }

    if (typeof configParams.endpoint !== 'string') {
      logWarn('User ID - merkleId submodule endpoint string is not defined');
      configParams.endpoint = ID_URL
    }

    if (typeof configParams.sv_domain !== 'string') {
      configParams.sv_domain = merkleIdSubmodule.findRootDomain();
    }

    const configStorage = (config && config.storage) || {};
    const resp = generateId(configParams, configStorage)
    return {callback: resp};
  },
  extendId: function (config = {}, consentData, storedId) {
    logInfo('User ID - stored id ' + storedId);
    const configParams = (config && config.params) || {};

    if (typeof configParams.endpoint !== 'string') {
      logWarn('User ID - merkleId submodule endpoint string is not defined');
      configParams.endpoint = ID_URL
    }

    if (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) {
      logError('User ID - merkleId submodule does not currently handle consent strings');
      return;
    }

    if (typeof configParams.sv_domain !== 'string') {
      configParams.sv_domain = merkleIdSubmodule.findRootDomain();
    }

    const configStorage = (config && config.storage) || {};
    if (configStorage && configStorage.refreshInSeconds && typeof configParams.refreshInSeconds === 'number') {
      return {id: storedId};
    }

    let refreshInSeconds = DEFAULT_REFRESH;
    if (configParams && configParams.refreshInSeconds && typeof configParams.refreshInSeconds === 'number') {
      refreshInSeconds = configParams.refreshInSeconds;
      logInfo('User ID - merkleId param refreshInSeconds' + refreshInSeconds);
    }

    const storedDate = new Date(storedId.date);
    let refreshNeeded = false;
    if (storedDate) {
      refreshNeeded = storedDate && (Date.now() - storedDate.getTime() > refreshInSeconds * 1000);
      if (refreshNeeded) {
        logInfo('User ID - merkleId needs refreshing id');
        const resp = generateId(configParams, configStorage)
        return {callback: resp};
      }
    }

    logInfo('User ID - merkleId not refreshed');
    return {id: storedId};
  }

};

submodule('userId', merkleIdSubmodule);
