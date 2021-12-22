/**
 * This module adds PubMatic to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/pubmaticIdSystem
 * @requires module:modules/userId
 */

import { deepAccess, logInfo, deepSetValue, logError, isEmpty, isNumber, isStr, isEmptyStr, logWarn } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getStorageManager } from '../src/storageManager.js';
import { uspDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = 'pubmaticId';
const GVLID = 76;
export const STORAGE_NAME = 'pubmaticId';
const STORAGE_TYPE_COOKIE = 'cookie';
const STORAGE_TYPE_HTML5 = 'html5';
const STORAGE_EXPIRES = 30; // days
const STORAGE_REFRESH_IN_SECONDS = 24*3600; // 24 Hours
const LOG_PREFIX = 'User ID - PubMatic submodule: ';
const VERSION = '1';

const storage = getStorageManager(GVLID, MODULE_NAME);

function generateEncodedId(responseObj){
  let jsonData = {"pmid": responseObj.id};
  return (VERSION + '||' + btoa(JSON.stringify(jsonData)));
}

/** @type {Submodule} */
export const pubmaticIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * Vendor id of PubMatic
   * @type {Number}
   */
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    if(isStr(value) && !isEmptyStr(value) ){
    	return {pubmaticId: value};
    }
    return undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    if (!hasRequiredConfig(config)) {
      return undefined;
    }    

    const resp = function (callback) {      
      const callbacks = {
        success: response => {
          let responseObj;
          if (response) {
            try {
              responseObj = JSON.parse(response);
              logInfo(LOG_PREFIX + 'response received from the server', responseObj);              
            } catch (error) {
              logError(LOG_PREFIX + error);
            }
          }
          if(isStr(responseObj.id) && !isEmptyStr(responseObj.id)){
          	callback(generateEncodedId(responseObj));
          } else {
          	callback()
          }                    
        },
        error: error => {
          logError(LOG_PREFIX + 'getId fetch encountered an error', error);
          callback();
        }
      };

      logInfo(LOG_PREFIX + 'requesting an ID from the server');

      ajax(generateURL(config, consentData), callbacks, null, { method: 'POST', withCredentials: true });
    };
    return { callback: resp };
  }
};

function generateURL(config, consentData){
	let endpoint = 'https://image6.pubmatic.com/AdServer/UCookieSetPug?oid=5&p='+config.params.publisherId;
  const hasGdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
  const usp = uspDataHandler.getConsentData();
  const referer = getRefererInfo();

  // Attaching GDPR Consent Params in UserSync url
  if (hasGdpr) {
    endpoint += '&gdpr=1';
    let gdprConsentstring = (typeof consentData.consentString !== 'undefined' && !isEmpty(consentData.consentString) && !isEmptyStr(consentData.consentString)) ? encodeURIComponent(consentData.consentString) : '';
    endpoint += '&gdpr_consent=' + gdprConsentstring;
  }

  // CCPA
  if (usp) {
    endpoint += '&us_privacy=' + encodeURIComponent(usp);
  }

  return endpoint;
}

function hasRequiredConfig(config) {
  if (config.storage.name !== STORAGE_NAME) {
    logError(LOG_PREFIX + `storage name should be '${STORAGE_NAME}'.`);
    return false;
  }

  if(config.storage.expires !== STORAGE_EXPIRES) {
  	logError(LOG_PREFIX + `storage expires should be ${STORAGE_EXPIRES}.`);
  	return false;
  }

  if(config.storage.refreshInSeconds !== STORAGE_REFRESH_IN_SECONDS) {
  	logError(LOG_PREFIX + `storage refreshInSeconds should be ${STORAGE_REFRESH_IN_SECONDS}.`);
  	return false;
  }

  if(!config.params || !isNumber(config.params.publisherId)){
  	logError(LOG_PREFIX + `config.params.publisherId (int) should be provided.`);
  	return false;	
  }

  return true;
}

submodule('userId', pubmaticIdSubmodule);
