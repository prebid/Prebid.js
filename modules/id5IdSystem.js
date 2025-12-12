/**
 * This module adds ID5 to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/id5IdSystem
 * @requires module:modules/userId
 */

import {
  deepAccess,
  deepClone,
  deepSetValue,
  isEmpty,
  isEmptyStr,
  isPlainObject,
  logError,
  logInfo,
  logWarn
} from '../src/utils.js';
import {fetch} from '../src/ajax.js';
import {submodule} from '../src/hook.js';
import {getRefererInfo} from '../src/refererDetection.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import {PbPromise} from '../src/utils/promise.js';
import {loadExternalScript} from '../src/adloader.js';

/**
 * @typedef {import('../modules/userId/spec.ts').IdProviderSpec} Submodule
 * @typedef {import('../modules/userId/spec.ts').UserIdConfig} SubmoduleConfig
 * @typedef {import('../src/consentHandler').AllConsentData} ConsentData
 * @typedef {import('../modules/userId/spec.ts').ProviderResponse} ProviderResponse
 */

const MODULE_NAME = 'id5Id';
const GVLID = 131;
export const ID5_STORAGE_NAME = 'id5id';
const LOG_PREFIX = 'User ID - ID5 submodule: ';
const ID5_API_CONFIG_URL = 'https://id5-sync.com/api/config/prebid';
const ID5_DOMAIN = 'id5-sync.com';
const TRUE_LINK_SOURCE = 'true-link-id5-sync.com';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/**
 * @typedef {Object} Id5Response
 * @property {string} [universal_uid] - The encrypted ID5 ID to pass to bidders
 * @property {Object} [ext] - The extensions object to pass to bidders
 * @property {Object} [ab_testing] - A/B testing configuration
 * @property {Object} [ids]
 * @property {string} signature
 * @property {number} [nbPage]
 * @property {string} [publisherTrueLinkId] - The publisher's TrueLink ID
 */

/**
 * @typedef {Object.<string, Id5Response>} PartnerId5Responses
 */

/**
 * @typedef {Id5Response} Id5PrebidResponse
 * @property {PartnerId5Responses} pbjs
 *
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
 * @property {string} [gamTargetingPrefix] - When set, the GAM targeting tags will be set and use the specified prefix, for example 'id5'.
 */

/**
 * @typedef {SubmoduleConfig} Id5SubmoduleConfig
 * @property {Id5PrebidConfig} params
 */

const DEFAULT_EIDS = {
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
  },
  'trueLinkId': {
    getValue: function (data) {
      return data.uid;
    },
    getSource: function () {
      return TRUE_LINK_SOURCE;
    },
    atype: 1,
    getUidExt: function (data) {
      if (data.ext) {
        return data.ext;
      }
    }
  }
};

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
   * @param {Id5PrebidResponse|Id5Response} value
   * @param {Id5SubmoduleConfig} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    const partnerResponse = getPartnerResponse(value, config.params)
    // get generic/legacy response in case no partner specific
    // it may happen in case old cached value found
    // or overwritten by other integration (older version)
    return this._decodeResponse(partnerResponse || value, config);
  },

  /**
   *
   * @param {Id5Response} value
   * @param {Id5SubmoduleConfig} config
   * @private
   */
  _decodeResponse(value, config) {
    if (value && value.ids !== undefined) {
      const responseObj = {};
      const eids = {};
      Object.entries(value.ids).forEach(([key, value]) => {
        const eid = value.eid;
        const uid = eid?.uids?.[0]
        responseObj[key] = {
          uid: uid?.id,
          ext: uid?.ext
        };
        eids[key] = function () {
          return eid;
        }; // register function to get eid for each id (key) decoded
      });
      this.eids = eids; // overwrite global eids
      updateTargeting(value, config);
      return responseObj;
    }

    let universalUid, publisherTrueLinkId;
    let ext = {};

    if (value && typeof value.universal_uid === 'string') {
      universalUid = value.universal_uid;
      ext = value.ext || ext;
      publisherTrueLinkId = value.publisherTrueLinkId;
    } else {
      return undefined;
    }
    this.eids = DEFAULT_EIDS;
    const responseObj = {
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

    if (publisherTrueLinkId) {
      responseObj.trueLinkId = {
        uid: publisherTrueLinkId
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
    updateTargeting(value, config);

    return responseObj;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function getId
   * @param {Id5SubmoduleConfig} submoduleConfig
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {ProviderResponse}
   */
  getId(submoduleConfig, consentData, cacheIdObj) {
    if (!validateConfig(submoduleConfig)) {
      return undefined;
    }

    if (!hasWriteConsentToLocalStorage(consentData?.gdpr)) {
      logInfo(LOG_PREFIX + 'Skipping ID5 local storage write because no consent given.');
      return undefined;
    }

    const resp = function (cbFunction) {
      const fetchFlow = new IdFetchFlow(submoduleConfig, consentData?.gdpr, cacheIdObj, consentData?.usp, consentData?.gpp);
      fetchFlow.execute()
        .then(response => {
          cbFunction(createResponse(response, submoduleConfig.params, cacheIdObj));
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
   * @param {Id5SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {Id5PrebidResponse} cacheIdObj - existing id, if any
   * @return {ProviderResponse} A response object that contains id.
   */
  extendId(config, consentData, cacheIdObj) {
    if (!hasWriteConsentToLocalStorage(consentData?.gdpr)) {
      logInfo(LOG_PREFIX + 'No consent given for ID5 local storage writing, skipping nb increment.');
      return {id: cacheIdObj};
    }
    if (getPartnerResponse(cacheIdObj, config.params)) { // response for partner is present
      logInfo(LOG_PREFIX + 'using cached ID', cacheIdObj);
      const updatedObject = deepClone(cacheIdObj);
      const responseToUpdate = getPartnerResponse(updatedObject, config.params);
      responseToUpdate.nbPage = incrementNb(responseToUpdate);
      return {id: updatedObject};
    } else {
      logInfo(LOG_PREFIX + ' refreshing ID.  Cached object does not have ID for partner', cacheIdObj);
      return this.getId(config, consentData, cacheIdObj);
    }
  },
  primaryIds: ['id5id', 'trueLinkId'],
  eids: DEFAULT_EIDS,
  _reset() {
    this.eids = DEFAULT_EIDS;
  }
};

export class IdFetchFlow {
  constructor(submoduleConfig, gdprConsentData, cacheIdObj, usPrivacyData, gppData) {
    this.submoduleConfig = submoduleConfig;
    this.gdprConsentData = gdprConsentData;
    this.cacheIdObj = isPlainObject(cacheIdObj?.pbjs) ? cacheIdObj.pbjs[submoduleConfig.params.partner] : cacheIdObj;
    this.usPrivacyData = usPrivacyData;
    this.gppData = gppData;
  }

  /**
   * Calls the ID5 Servers to fetch an ID5 ID
   * @returns {Promise<Id5Response>} The result of calling the server side
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

  async #externalModuleFlow(configCallPromise) {
    await loadExternalModule(this.submoduleConfig.params.externalModuleUrl);
    const fetchFlowConfig = await configCallPromise;

    return this.#getExternalIntegration().fetchId5Id(fetchFlowConfig, this.submoduleConfig.params, getRefererInfo(), this.gdprConsentData, this.usPrivacyData, this.gppData);
  }

  #getExternalIntegration() {
    return window.id5Prebid && window.id5Prebid.integration;
  }

  async #regularFlow(configCallPromise) {
    const fetchFlowConfig = await configCallPromise;
    const extensionsData = await this.#callForExtensions(fetchFlowConfig.extensionsCall);
    const fetchCallResponse = await this.#callId5Fetch(fetchFlowConfig.fetchCall, extensionsData);
    return this.#processFetchCallResponse(fetchCallResponse);
  }

  async #callForConfig() {
    const url = this.submoduleConfig.params.configUrl || ID5_API_CONFIG_URL; // override for debug/test purposes only
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

  #createFetchRequestData() {
    const params = this.submoduleConfig.params;
    const hasGdpr = (this.gdprConsentData && typeof this.gdprConsentData.gdprApplies === 'boolean' && this.gdprConsentData.gdprApplies) ? 1 : 0;
    const referer = getRefererInfo();
    const signature = this.cacheIdObj ? this.cacheIdObj.signature : undefined;
    const nbPage = incrementNb(this.cacheIdObj);
    const trueLinkInfo = window.id5Bootstrap ? window.id5Bootstrap.getTrueLinkInfo() : {booted: false};

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
      'localStorage': storage.localStorageIsEnabled() ? 1 : 0,
      'true_link': trueLinkInfo
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

  #processFetchCallResponse(fetchCallResponse) {
    try {
      if (fetchCallResponse.privacy) {
        if (window.id5Bootstrap && window.id5Bootstrap.setPrivacy) {
          window.id5Bootstrap.setPrivacy(fetchCallResponse.privacy);
        }
      }
    } catch (error) {
      logError(LOG_PREFIX + 'Error while writing privacy info into local storage.', error);
    }
    return fetchCallResponse;
  }
}

async function loadExternalModule(url) {
  return new PbPromise((resolve, reject) => {
    if (window.id5Prebid) {
      // Already loaded
      resolve();
    } else {
      try {
        loadExternalScript(url, MODULE_TYPE_UID, 'id5', resolve);
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
    const parsedPartnerId = parseInt(partner);
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
  if (config.storage.name !== ID5_STORAGE_NAME) {
    logWarn(LOG_PREFIX + `storage name recommended to be '${ID5_STORAGE_NAME}'.`);
  }

  return true;
}

function incrementNb(cachedObj) {
  if (cachedObj && cachedObj.nbPage !== undefined) {
    return cachedObj.nbPage + 1;
  } else {
    return 1;
  }
}

function updateTargeting(fetchResponse, config) {
  if (config.params.gamTargetingPrefix) {
    const tags = fetchResponse.tags;
    if (tags) {
      window.googletag = window.googletag || {cmd: []};
      window.googletag.cmd = window.googletag.cmd || [];
      window.googletag.cmd.push(() => {
        for (const tag in tags) {
          window.googletag.pubads().setTargeting(config.params.gamTargetingPrefix + '_' + tag, tags[tag]);
        }
      });
    }
  }
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
  return !(hasGdpr && (!localstorageConsent || !id5VendorConsent));
}

/**
 *
 * @param response {Id5Response|Id5PrebidResponse}
 * @param config {Id5PrebidConfig}
 */
function getPartnerResponse(response, config) {
  if (response?.pbjs && isPlainObject(response.pbjs)) {
    return response.pbjs[config.partner];
  }
  return undefined;
}

/**
 *
 *  @param {Id5Response} response
 *  @param {Id5PrebidConfig} config
 *  @param {Id5PrebidResponse} cacheIdObj
 *  @returns {Id5PrebidResponse}
 */
function createResponse(response, config, cacheIdObj) {
  let responseObj = {}
  if (isPlainObject(cacheIdObj) && (cacheIdObj.universal_uid !== undefined || isPlainObject(cacheIdObj.pbjs))) {
    Object.assign(responseObj, deepClone(cacheIdObj));
  }
  Object.assign(responseObj, deepClone(response)); // assign the whole response for old versions
  responseObj.signature = response.signature; // update signature in case it was erased in response
  if (!isPlainObject(responseObj.pbjs)) {
    responseObj.pbjs = {};
  }
  responseObj.pbjs[config.partner] = deepClone(response);
  return responseObj;
}

submodule('userId', id5IdSubmodule);
