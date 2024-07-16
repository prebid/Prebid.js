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
  isPlainObject,
  logError,
  logInfo,
  logWarn,
  safeJSONParse
} from '../src/utils.js';
import {fetch} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {getStorageManager} from '../src/storageManager.js';
import {uspDataHandler, gppDataHandler} from '../src/adapterManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import {GreedyPromise} from '../src/utils/promise.js';
import {loadExternalScript} from '../src/adloader.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'id5Id';
const GVLID = 131;
const NB_EXP_DAYS = 30;
export const ID5_STORAGE_NAME = 'id5id';
export const ID5_PRIVACY_STORAGE_NAME = `${ID5_STORAGE_NAME}_privacy`;
const LOCAL_STORAGE = 'html5';
const LOG_PREFIX = 'User ID - ID5 submodule: ';
const ID5_API_CONFIG_URL = 'https://id5-sync.com/api/config/prebid';
const ID5_DOMAIN = 'id5-sync.com';

// order the legacy cookie names in reverse priority order so the last
// cookie in the array is the most preferred to use
const LEGACY_COOKIE_NAMES = ['pbjs-id5id', 'id5id.1st', 'id5id'];

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/**
 * @typedef {Object} IdResponse
 * @property {string} [universal_uid] - The encrypted ID5 ID to pass to bidders
 * @property {Object} [ext] - The extensions object to pass to bidders
 * @property {Object} [ab_testing] - A/B testing configuration
 */

/**
 * @typedef {Object} FetchCallConfig
 * @property {string} [url] - The URL for the fetch endpoint
 * @property {Object} [overrides] - Overrides to apply to fetch parameters
 */

/**
 * @typedef {Object} ExtensionsCallConfig
 * @property {string} [url] - The URL for the extensions endpoint
 * @property {string} [method] - Overrides the HTTP method to use to make the call
 * @property {Object} [body] - Specifies a body to pass to the extensions endpoint
 */

/**
 * @typedef {Object} DynamicConfig
 * @property {FetchCallConfig} [fetchCall] - The fetch call configuration
 * @property {ExtensionsCallConfig} [extensionsCall] - The extensions call configuration
 */

/**
 * @typedef {Object} ABTestingConfig
 * @property {boolean} enabled - Tells whether A/B testing is enabled for this instance
 * @property {number} controlGroupPct - A/B testing probability
 */

/**
 * @typedef {Object} Multiplexing
 * @property {boolean} [disabled] - Disable multiplexing (instance will work in single mode)
 */

/**
 * @typedef {Object} Diagnostics
 * @property {boolean} [publishingDisabled] - Disable diagnostics publishing
 * @property {number} [publishAfterLoadInMsec] - Delay in ms after script load after which collected diagnostics are published
 * @property {boolean} [publishBeforeWindowUnload] - When true, diagnostics publishing is triggered on Window 'beforeunload' event
 * @property {number} [publishingSampleRatio] - Diagnostics publishing sample ratio
 */

/**
 * @typedef {Object} Segment
 * @property {string} [destination] - GVL ID or ID5-XX Partner ID. Mandatory
 * @property {Array<string>} [ids] - The segment IDs to push. Must contain at least one segment ID.
 */

/**
 * @typedef {Object} Id5PrebidConfig
 * @property {number} partner - The ID5 partner ID
 * @property {string} pd - The ID5 partner data string
 * @property {ABTestingConfig} abTesting - The A/B testing configuration
 * @property {boolean} disableExtensions - Disabled extensions call
 * @property {string} [externalModuleUrl] - URL for the id5 prebid external module
 * @property {Multiplexing} [multiplexing] - Multiplexing options. Only supported when loading the external module.
 * @property {Diagnostics} [diagnostics] - Diagnostics options. Supported only in multiplexing
 * @property {Array<Segment>} [segments] - A list of segments to push to partners. Supported only in multiplexing.
 * @property {boolean} [disableUaHints] - When true, look up of high entropy values through user agent hints is disabled.
 */

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
    let ext = {};

    if (value && typeof value.universal_uid === 'string') {
      universalUid = value.universal_uid;
      ext = value.ext || ext;
    } else {
      return undefined;
    }

    let responseObj = {
      id5id: {
        uid: universalUid,
        ext: ext
      }
    };

    if (isPlainObject(ext.euid)) {
      responseObj.euid = {
        uid: ext.euid.uids[0].id,
        source: ext.euid.source,
        ext: {provider: ID5_DOMAIN}
      };
    }

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
    if (!validateConfig(submoduleConfig)) {
      return undefined;
    }

    if (!hasWriteConsentToLocalStorage(consentData)) {
      logInfo(LOG_PREFIX + 'Skipping ID5 local storage write because no consent given.');
      return undefined;
    }

    const resp = function (cbFunction) {
      const fetchFlow = new IdFetchFlow(submoduleConfig, consentData, cacheIdObj, uspDataHandler.getConsentData(), gppDataHandler.getConsentData());
      fetchFlow.execute()
        .then(response => {
          cbFunction(response);
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
    if (!hasWriteConsentToLocalStorage(consentData)) {
      logInfo(LOG_PREFIX + 'No consent given for ID5 local storage writing, skipping nb increment.');
      return cacheIdObj;
    }

    const partnerId = validateConfig(config) ? config.params.partner : 0;
    incrementNb(partnerId);

    logInfo(LOG_PREFIX + 'using cached ID', cacheIdObj);
    return cacheIdObj;
  },
  eids: {
    'id5id': {
      getValue: function (data) {
        return data.uid;
      },
      source: ID5_DOMAIN,
      atype: 1,
      getUidExt: function (data) {
        if (data.ext) {
          return data.ext;
        }
      }
    },
    'euid': {
      getValue: function (data) {
        return data.uid;
      },
      getSource: function (data) {
        return data.source;
      },
      atype: 3,
      getUidExt: function (data) {
        if (data.ext) {
          return data.ext;
        }
      }
    }
  }
};

export class IdFetchFlow {
  constructor(submoduleConfig, gdprConsentData, cacheIdObj, usPrivacyData, gppData) {
    this.submoduleConfig = submoduleConfig;
    this.gdprConsentData = gdprConsentData;
    this.cacheIdObj = cacheIdObj;
    this.usPrivacyData = usPrivacyData;
    this.gppData = gppData;
  }

  /**
   * Calls the ID5 Servers to fetch an ID5 ID
   * @returns {Promise<IdResponse>} The result of calling the server side
   */
  async execute() {
    const configCallPromise = this.#callForConfig();
    if (this.#isExternalModule()) {
      try {
        return await this.#externalModuleFlow(configCallPromise);
      } catch (error) {
        logError(LOG_PREFIX + 'Error while performing ID5 external module flow. Continuing with regular flow.', error);
        return this.#regularFlow(configCallPromise);
      }
    } else {
      return this.#regularFlow(configCallPromise);
    }
  }

  #isExternalModule() {
    return typeof this.submoduleConfig.params.externalModuleUrl === 'string';
  }

  // eslint-disable-next-line no-dupe-class-members
  async #externalModuleFlow(configCallPromise) {
    await loadExternalModule(this.submoduleConfig.params.externalModuleUrl);
    const fetchFlowConfig = await configCallPromise;

    return this.#getExternalIntegration().fetchId5Id(fetchFlowConfig, this.submoduleConfig.params, getRefererInfo(), this.gdprConsentData, this.usPrivacyData, this.gppData);
  }

  // eslint-disable-next-line no-dupe-class-members
  #getExternalIntegration() {
    return window.id5Prebid && window.id5Prebid.integration;
  }

  // eslint-disable-next-line no-dupe-class-members
  async #regularFlow(configCallPromise) {
    const fetchFlowConfig = await configCallPromise;
    const extensionsData = await this.#callForExtensions(fetchFlowConfig.extensionsCall);
    const fetchCallResponse = await this.#callId5Fetch(fetchFlowConfig.fetchCall, extensionsData);
    return this.#processFetchCallResponse(fetchCallResponse);
  }

  // eslint-disable-next-line no-dupe-class-members
  async #callForConfig() {
    let url = this.submoduleConfig.params.configUrl || ID5_API_CONFIG_URL; // override for debug/test purposes only
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        ...this.submoduleConfig,
        bounce: true
      }),
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Error while calling config endpoint: ', response);
    }
    const dynamicConfig = await response.json();
    logInfo(LOG_PREFIX + 'config response received from the server', dynamicConfig);
    return dynamicConfig;
  }

  // eslint-disable-next-line no-dupe-class-members
  async #callForExtensions(extensionsCallConfig) {
    if (extensionsCallConfig === undefined) {
      return undefined;
    }
    const extensionsUrl = extensionsCallConfig.url;
    const method = extensionsCallConfig.method || 'GET';
    const body = method === 'GET' ? undefined : JSON.stringify(extensionsCallConfig.body || {});
    const response = await fetch(extensionsUrl, {method, body});
    if (!response.ok) {
      throw new Error('Error while calling extensions endpoint: ', response);
    }
    const extensions = await response.json();
    logInfo(LOG_PREFIX + 'extensions response received from the server', extensions);
    return extensions;
  }

  // eslint-disable-next-line no-dupe-class-members
  async #callId5Fetch(fetchCallConfig, extensionsData) {
    const fetchUrl = fetchCallConfig.url;
    const additionalData = fetchCallConfig.overrides || {};
    const body = JSON.stringify({
      ...this.#createFetchRequestData(),
      ...additionalData,
      extensions: extensionsData
    });
    const response = await fetch(fetchUrl, {method: 'POST', body, credentials: 'include'});
    if (!response.ok) {
      throw new Error('Error while calling fetch endpoint: ', response);
    }
    const fetchResponse = await response.json();
    logInfo(LOG_PREFIX + 'fetch response received from the server', fetchResponse);
    return fetchResponse;
  }

  // eslint-disable-next-line no-dupe-class-members
  #createFetchRequestData() {
    const params = this.submoduleConfig.params;
    const hasGdpr = (this.gdprConsentData && typeof this.gdprConsentData.gdprApplies === 'boolean' && this.gdprConsentData.gdprApplies) ? 1 : 0;
    const referer = getRefererInfo();
    const signature = (this.cacheIdObj && this.cacheIdObj.signature) ? this.cacheIdObj.signature : getLegacyCookieSignature();
    const nbPage = incrementAndResetNb(params.partner);
    const data = {
      'partner': params.partner,
      'gdpr': hasGdpr,
      'nbPage': nbPage,
      'o': 'pbjs',
      'tml': referer.topmostLocation,
      'ref': referer.ref,
      'cu': referer.canonicalUrl,
      'top': referer.reachedTop ? 1 : 0,
      'u': referer.stack[0] || window.location.href,
      'v': '$prebid.version$',
      'storage': this.submoduleConfig.storage,
      'localStorage': storage.localStorageIsEnabled() ? 1 : 0
    };

    // pass in optional data, but only if populated
    if (hasGdpr && this.gdprConsentData.consentString !== undefined && !isEmpty(this.gdprConsentData.consentString) && !isEmptyStr(this.gdprConsentData.consentString)) {
      data.gdpr_consent = this.gdprConsentData.consentString;
    }
    if (this.usPrivacyData !== undefined && !isEmpty(this.usPrivacyData) && !isEmptyStr(this.usPrivacyData)) {
      data.us_privacy = this.usPrivacyData;
    }
    if (this.gppData) {
      data.gpp_string = this.gppData.gppString;
      data.gpp_sid = this.gppData.applicableSections;
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

  // eslint-disable-next-line no-dupe-class-members
  #processFetchCallResponse(fetchCallResponse) {
    try {
      if (fetchCallResponse.privacy) {
        storeInLocalStorage(ID5_PRIVACY_STORAGE_NAME, JSON.stringify(fetchCallResponse.privacy), NB_EXP_DAYS);
      }
    } catch (error) {
      logError(LOG_PREFIX + 'Error while writing privacy info into local storage.', error);
    }
    return fetchCallResponse;
  }
}

async function loadExternalModule(url) {
  return new GreedyPromise((resolve, reject) => {
    if (window.id5Prebid) {
      // Already loaded
      resolve();
    } else {
      try {
        loadExternalScript(url, 'id5', resolve);
      } catch (error) {
        reject(error);
      }
    }
  });
}

function validateConfig(config) {
  if (!config || !config.params || !config.params.partner) {
    logError(LOG_PREFIX + 'partner required to be defined');
    return false;
  }

  const partner = config.params.partner;
  if (typeof partner === 'string' || partner instanceof String) {
    let parsedPartnerId = parseInt(partner);
    if (isNaN(parsedPartnerId) || parsedPartnerId < 0) {
      logError(LOG_PREFIX + 'partner required to be a number or a String parsable to a positive integer');
      return false;
    } else {
      config.params.partner = parsedPartnerId;
    }
  } else if (typeof partner !== 'number') {
    logError(LOG_PREFIX + 'partner required to be a number or a String parsable to a positive integer');
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

function incrementAndResetNb(partnerId) {
  const result = incrementNb(partnerId);
  storeNbInCache(partnerId, 0);
  return result;
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
 * @param {number} expDays
 */
export function storeInLocalStorage(key, value, expDays) {
  storage.setDataInLocalStorage(`${key}_exp`, expDaysStr(expDays));
  storage.setDataInLocalStorage(`${key}`, value);
}

/**
 * Check to see if we can write to local storage based on purpose consent 1, and that we have vendor consent (ID5=131)
 * @param {ConsentData} consentData
 * @returns {boolean}
 */
function hasWriteConsentToLocalStorage(consentData) {
  const hasGdpr = consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies;
  const localstorageConsent = deepAccess(consentData, `vendorData.purpose.consents.1`);
  const id5VendorConsent = deepAccess(consentData, `vendorData.vendor.consents.${GVLID.toString()}`);
  if (hasGdpr && (!localstorageConsent || !id5VendorConsent)) {
    return false;
  }
  return true;
}

submodule('userId', id5IdSubmodule);
