/**
 * This module adds HadronID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/hadronIdSystem
 * @requires module:modules/userId
 */

import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {submodule} from '../src/hook.js';
import {isFn, isStr, isPlainObject, logError, logInfo} from '../src/utils.js';
import { config } from '../src/config.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../src/adapterManager.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

export const MODULE_NAME = 'hadronId';
const LOG_PREFIX = `[${MODULE_NAME}System]`;
export const LS_TAM_KEY = 'auHadronId';
const AU_GVLID = 561;
const DEFAULT_HADRON_URL_ENDPOINT = 'https://id.hadron.ad.gt/api/v1/pbhid';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/**
 * Param or default.
 * @param {String|function} param
 * @param {String} defaultVal
 * @param arg
 */
function paramOrDefault(param, defaultVal, arg) {
  if (isFn(param)) {
    return param(arg);
  } else if (isStr(param)) {
    return param;
  }
  return defaultVal;
}

/**
 * @param {string} url
 * @param {string} params
 * @returns {string}
 */
const urlAddParams = (url, params) => {
  return url + (url.indexOf('?') > -1 ? '&' : '?') + params
}

const isDebug = config.getConfig('debug') || false;

/** @type {Submodule} */
export const hadronIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: AU_GVLID,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {Object}
   */
  decode(value) {
    return {
      hadronId: isStr(value) ? value : value.hasOwnProperty('id') ? value.id[MODULE_NAME] : value[MODULE_NAME]
    }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    logInfo(LOG_PREFIX, `getId is called`, config);
    if (!isPlainObject(config.params)) {
      config.params = {};
    }
    let hadronId = '';
    // at this point hadronId was not found by prebid, let check if it is in the webpage by other ways
    hadronId = storage.getDataFromLocalStorage(LS_TAM_KEY);
    if (isStr(hadronId) && hadronId.length > 0) {
      logInfo(LOG_PREFIX, `${LS_TAM_KEY} found in localStorage = ${hadronId}`)
      // return {callback: function(cb) { cb(hadronId) }};
      return {id: hadronId}
    }
    const partnerId = config.params.partnerId | 0;
    const resp = function (callback) {
      let responseObj = {};
      const callbacks = {
        success: response => {
          if (response) {
            try {
              responseObj = JSON.parse(response);
            } catch (error) {
              logError(error);
              callback();
            }
            logInfo(LOG_PREFIX, `Response from backend is ${response}`, responseObj);
            if (isPlainObject(responseObj) && responseObj.hasOwnProperty(MODULE_NAME)) {
              hadronId = responseObj[MODULE_NAME];
            }
            responseObj = hadronId; // {id: {hadronId: hadronId}};
          }
          callback(responseObj);
        },
        error: error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error`, error);
          callback();
        }
      };
      let url = urlAddParams(
        // config.params.url and config.params.urlArg are not documented
        // since their use is for debugging purposes only
        paramOrDefault(config.params.url, DEFAULT_HADRON_URL_ENDPOINT, config.params.urlArg),
        `partner_id=${partnerId}&_it=prebid&t=1&src=id&domain=${document.location.hostname}` // src=id => the backend was called from getId
      );
      if (isDebug) {
        url += '&debug=1'
      }
      const gdprConsent = gdprDataHandler.getConsentData()
      if (gdprConsent) {
        url += `${gdprConsent.consentString ? '&gdprString=' + encodeURIComponent(gdprConsent.consentString) : ''}`;
        url += `&gdpr=${gdprConsent.gdprApplies === true ? 1 : 0}`;
      }

      const usPrivacyString = uspDataHandler.getConsentData();
      if (usPrivacyString) {
        url += `&us_privacy=${encodeURIComponent(usPrivacyString)}`;
      }

      const gppConsent = gppDataHandler.getConsentData();
      if (gppConsent) {
        url += `${gppConsent.gppString ? '&gpp=' + encodeURIComponent(gppConsent.gppString) : ''}`;
        url += `${gppConsent.applicableSections ? '&gpp_sid=' + encodeURIComponent(gppConsent.applicableSections) : ''}`;
      }

      logInfo(LOG_PREFIX, `${MODULE_NAME} not found, calling home (${url})`);

      ajax(url, callbacks, undefined, {method: 'GET'});
    };
    return {callback: resp};
  },
  eids: {
    'hadronId': {
      source: 'audigent.com',
      atype: 1
    },
  }
};

submodule('userId', hadronIdSubmodule);
