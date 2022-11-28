/**
 * This module adds ID5 to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/id5IdSystem
 * @requires module:modules/userId
 */

import {
  deepAccess,
  deepSetValue,
  isEmpty,
  isEmptyStr,
  logError,
  logInfo,
  logWarn,
  safeJSONParse
} from '../src/utils.js';
import {ajax} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {getStorageManager} from '../src/storageManager.js';
import {uspDataHandler} from '../src/adapterManager.js';

const MODULE_NAME = 'id5Id';
const GVLID = 131;
const NB_EXP_DAYS = 30;
export const ID5_STORAGE_NAME = 'id5id';
export const ID5_PRIVACY_STORAGE_NAME = `${ID5_STORAGE_NAME}_privacy`;
const LOCAL_STORAGE = 'html5';
const LOG_PREFIX = 'User ID - ID5 submodule: ';
const ID5_API_CONFIG_URL = 'https://id5-sync.com/api/config/prebid';

// order the legacy cookie names in reverse priority order so the last
// cookie in the array is the most preferred to use
const LEGACY_COOKIE_NAMES = ['pbjs-id5id', 'id5id.1st', 'id5id'];

export const storage = getStorageManager({gvlid: GVLID, moduleName: MODULE_NAME});

/** @type {Submodule} */
export const id5IdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'id5Id',

  /**
   * Vendor id of ID5
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
    let universalUid;
    let linkType = 0;

    if (value && typeof value.universal_uid === 'string') {
      universalUid = value.universal_uid;
      linkType = value.link_type || linkType;
    } else {
      return undefined;
    }

    let responseObj = {
      id5id: {
        uid: universalUid,
        ext: {
          linkType: linkType
        }
      }
    };

    const abTestingResult = deepAccess(value, 'ab_testing.result');
    switch (abTestingResult) {
      case 'control':
        // A/B Testing is enabled and user is in the Control Group
        logInfo(LOG_PREFIX + 'A/B Testing - user is in the Control Group: ID5 ID is NOT exposed');
        deepSetValue(responseObj, 'id5id.ext.abTestingControlGroup', true);
        break;
      case 'error':
        // A/B Testing is enabled, but configured improperly, so skip A/B testing
        logError(LOG_PREFIX + 'A/B Testing ERROR! controlGroupPct must be a number >= 0 and <= 1');
        break;
      case 'normal':
        // A/B Testing is enabled but user is not in the Control Group, so ID5 ID is shared
        logInfo(LOG_PREFIX + 'A/B Testing - user is NOT in the Control Group');
        deepSetValue(responseObj, 'id5id.ext.abTestingControlGroup', false);
        break;
    }

    logInfo(LOG_PREFIX + 'Decoded ID', responseObj);

    return responseObj;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {SubmoduleConfig} submoduleConfig
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(submoduleConfig, consentData, cacheIdObj) {
    if (!hasRequiredConfig(submoduleConfig)) {
      return undefined;
    }

    const resp = function (cbFunction) {
      new IdFetchFlow(submoduleConfig, consentData, cacheIdObj, uspDataHandler.getConsentData()).execute()
        .then(response => {
          cbFunction(response)
        })
        .catch(error => {
          logError(LOG_PREFIX + 'getId fetch encountered an error', error);
          cbFunction();
        });
    };
    return {callback: resp};
  },

  /**
   * Similar to Submodule#getId, this optional method returns response to for id that exists already.
   *  If IdResponse#id is defined, then it will be written to the current active storage even if it exists already.
   *  If IdResponse#callback is defined, then it'll called at the end of auction.
   *  It's permissible to return neither, one, or both fields.
   * @function extendId
   * @param {SubmoduleConfig} config
   * @param {ConsentData|undefined} consentData
   * @param {Object} cacheIdObj - existing id, if any
   * @return {(IdResponse|function(callback:function))} A response object that contains id and/or callback.
   */
  extendId(config, consentData, cacheIdObj) {
    hasRequiredConfig(config);

    const partnerId = (config && config.params && config.params.partner) || 0;
    incrementNb(partnerId);

    logInfo(LOG_PREFIX + 'using cached ID', cacheIdObj);
    return cacheIdObj;
  }
};

class IdFetchFlow {
  constructor(submoduleConfig, gdprConsentData, cacheIdObj, usPrivacyData) {
    this.submoduleConfig = submoduleConfig
    this.gdprConsentData = gdprConsentData
    this.cacheIdObj = cacheIdObj
    this.usPrivacyData = usPrivacyData
  }

  execute() {
    return this.#callForConfig(this.submoduleConfig)
      .then(fetchFlowConfig => {
        return this.#callForExtensions(fetchFlowConfig.extensionsCall)
          .then(extensionsData => {
            return this.#callId5Fetch(fetchFlowConfig.fetchCall, extensionsData)
          })
      })
      .then(fetchCallResponse => {
        try {
          resetNb(this.submoduleConfig.params.partner);
          if (fetchCallResponse.privacy) {
            storeInLocalStorage(ID5_PRIVACY_STORAGE_NAME, JSON.stringify(fetchCallResponse.privacy), NB_EXP_DAYS);
          }
        } catch (error) {
          logError(LOG_PREFIX + error);
        }
        return fetchCallResponse;
      })
  }

  #ajaxPromise(url, data, options) {
    return new Promise((resolve, reject) => {
      ajax(url,
        {
          success: function (res) {
            resolve(res)
          },
          error: function (err) {
            reject(err)
          }
        }, data, options)
    })
  }

  // eslint-disable-next-line no-dupe-class-members
  #callForConfig(submoduleConfig) {
    let url = submoduleConfig.params.configUrl || ID5_API_CONFIG_URL; // override for debug/test purposes only
    return this.#ajaxPromise(url, JSON.stringify(submoduleConfig), {method: 'POST'})
      .then(response => {
        let responseObj = JSON.parse(response);
        logInfo(LOG_PREFIX + 'config response received from the server', responseObj);
        return responseObj;
      });
  }

  // eslint-disable-next-line no-dupe-class-members
  #callForExtensions(extensionsCallConfig) {
    if (extensionsCallConfig === undefined) {
      return Promise.resolve(undefined)
    }
    let extensionsUrl = extensionsCallConfig.url
    let method = extensionsCallConfig.method || 'GET'
    let data = method === 'GET' ? undefined : JSON.stringify(extensionsCallConfig.body || {})
    return this.#ajaxPromise(extensionsUrl, data, {'method': method})
      .then(response => {
        let responseObj = JSON.parse(response);
        logInfo(LOG_PREFIX + 'extensions response received from the server', responseObj);
        return responseObj;
      })
  }

  // eslint-disable-next-line no-dupe-class-members
  #callId5Fetch(fetchCallConfig, extensionsData) {
    let url = fetchCallConfig.url;
    let additionalData = fetchCallConfig.overrides || {};
    let data = {
      ...this.#createFetchRequestData(),
      ...additionalData,
      extensions: extensionsData
    };
    return this.#ajaxPromise(url, JSON.stringify(data), {method: 'POST', withCredentials: true})
      .then(response => {
        let responseObj = JSON.parse(response);
        logInfo(LOG_PREFIX + 'fetch response received from the server', responseObj);
        return responseObj;
      });
  }

  // eslint-disable-next-line no-dupe-class-members
  #createFetchRequestData() {
    const params = this.submoduleConfig.params;
    const hasGdpr = (this.gdprConsentData && typeof this.gdprConsentData.gdprApplies === 'boolean' && this.gdprConsentData.gdprApplies) ? 1 : 0;
    const referer = getRefererInfo();
    const signature = (this.cacheIdObj && this.cacheIdObj.signature) ? this.cacheIdObj.signature : getLegacyCookieSignature();
    const nbPage = incrementNb(params.partner);
    const data = {
      'partner': params.partner,
      'gdpr': hasGdpr,
      'nbPage': nbPage,
      'o': 'pbjs',
      'rf': referer.topmostLocation,
      'top': referer.reachedTop ? 1 : 0,
      'u': referer.stack[0] || window.location.href,
      'v': '$prebid.version$',
      'storage': this.submoduleConfig.storage
    };

    // pass in optional data, but only if populated
    if (hasGdpr && this.gdprConsentData.consentString !== undefined && !isEmpty(this.gdprConsentData.consentString) && !isEmptyStr(this.gdprConsentData.consentString)) {
      data.gdpr_consent = this.gdprConsentData.consentString;
    }
    if (this.usPrivacyData !== undefined && !isEmpty(this.usPrivacyData) && !isEmptyStr(this.usPrivacyData)) {
      data.us_privacy = this.usPrivacyData;
    }
    if (signature !== undefined && !isEmptyStr(signature)) {
      data.s = signature;
    }
    if (params.pd !== undefined && !isEmptyStr(params.pd)) {
      data.pd = params.pd;
    }
    if (params.provider !== undefined && !isEmptyStr(params.provider)) {
      data.provider = params.provider;
    }
    const abTestingConfig = params.abTesting || {enabled: false};

    if (abTestingConfig.enabled) {
      data.ab_testing = {
        enabled: true, control_group_pct: abTestingConfig.controlGroupPct // The server validates
      };
    }
    return data;
  }
}

function hasRequiredConfig(config) {
  if (!config || !config.params || !config.params.partner || typeof config.params.partner !== 'number') {
    logError(LOG_PREFIX + 'partner required to be defined as a number');
    return false;
  }

  if (!config.storage || !config.storage.type || !config.storage.name) {
    logError(LOG_PREFIX + 'storage required to be set');
    return false;
  }

  // in a future release, we may return false if storage type or name are not set as required
  if (config.storage.type !== LOCAL_STORAGE) {
    logWarn(LOG_PREFIX + `storage type recommended to be '${LOCAL_STORAGE}'. In a future release this may become a strict requirement`);
  }
  // in a future release, we may return false if storage type or name are not set as required
  if (config.storage.name !== ID5_STORAGE_NAME) {
    logWarn(LOG_PREFIX + `storage name recommended to be '${ID5_STORAGE_NAME}'. In a future release this may become a strict requirement`);
  }

  return true;
}

export function expDaysStr(expDays) {
  return (new Date(Date.now() + (1000 * 60 * 60 * 24 * expDays))).toUTCString();
}

export function nbCacheName(partnerId) {
  return `${ID5_STORAGE_NAME}_${partnerId}_nb`;
}

export function storeNbInCache(partnerId, nb) {
  storeInLocalStorage(nbCacheName(partnerId), nb, NB_EXP_DAYS);
}

export function getNbFromCache(partnerId) {
  let cacheNb = getFromLocalStorage(nbCacheName(partnerId));
  return (cacheNb) ? parseInt(cacheNb) : 0;
}

function incrementNb(partnerId) {
  const nb = (getNbFromCache(partnerId) + 1);
  storeNbInCache(partnerId, nb);
  return nb;
}

function resetNb(partnerId) {
  storeNbInCache(partnerId, 0);
}

function getLegacyCookieSignature() {
  let legacyStoredValue;
  LEGACY_COOKIE_NAMES.forEach(function (cookie) {
    if (storage.getCookie(cookie)) {
      legacyStoredValue = safeJSONParse(storage.getCookie(cookie)) || legacyStoredValue;
    }
  });
  return (legacyStoredValue && legacyStoredValue.signature) || '';
}

/**
 * This will make sure we check for expiration before accessing local storage
 * @param {string} key
 */
export function getFromLocalStorage(key) {
  const storedValueExp = storage.getDataFromLocalStorage(`${key}_exp`);
  // empty string means no expiration set
  if (storedValueExp === '') {
    return storage.getDataFromLocalStorage(key);
  } else if (storedValueExp) {
    if ((new Date(storedValueExp)).getTime() - Date.now() > 0) {
      return storage.getDataFromLocalStorage(key);
    }
  }
  // if we got here, then we have an expired item or we didn't set an
  // expiration initially somehow, so we need to remove the item from the
  // local storage
  storage.removeDataFromLocalStorage(key);
  return null;
}

/**
 * Ensure that we always set an expiration in local storage since
 * by default it's not required
 * @param {string} key
 * @param {any} value
 * @param {integer} expDays
 */
export function storeInLocalStorage(key, value, expDays) {
  storage.setDataInLocalStorage(`${key}_exp`, expDaysStr(expDays));
  storage.setDataInLocalStorage(`${key}`, value);
}

submodule('userId', id5IdSubmodule);
