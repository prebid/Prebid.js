/**
 * This module adds LiveIntentId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/liveIntentIdSystem
 * @requires module:modules/userId
 */
import { triggerPixel, logError } from '../src/utils.js';
import { ajaxBuilder } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { LiveConnect } from 'live-connect-js/esm/initializer.js';
import { gdprDataHandler, uspDataHandler } from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';
import { MinimalLiveConnect } from 'live-connect-js/esm/minimal-live-connect.js';

const MODULE_NAME = 'liveIntentId';
export const storage = getStorageManager({gvlid: null, moduleName: MODULE_NAME});
const defaultRequestedAttributes = {'nonId': true}
const calls = {
  ajaxGet: (url, onSuccess, onError, timeout) => {
    ajaxBuilder(timeout)(
      url,
      {
        success: onSuccess,
        error: onError
      },
      undefined,
      {
        method: 'GET',
        withCredentials: true
      }
    )
  },
  pixelGet: (url, onload) => triggerPixel(url, onload)
}

let eventFired = false;
let liveConnect = null;

/**
 * This function is used in tests
 */
export function reset() {
  if (window && window.liQ) {
    window.liQ = [];
  }
  liveIntentIdSubmodule.setModuleMode(null)
  eventFired = false;
  liveConnect = null;
}

function parseLiveIntentCollectorConfig(collectConfig) {
  const config = {};
  collectConfig = collectConfig || {}
  collectConfig.appId && (config.appId = collectConfig.appId);
  collectConfig.fpiStorageStrategy && (config.storageStrategy = collectConfig.fpiStorageStrategy);
  collectConfig.fpiExpirationDays && (config.expirationDays = collectConfig.fpiExpirationDays);
  collectConfig.collectorUrl && (config.collectorUrl = collectConfig.collectorUrl);
  return config;
}

/**
 * Create requestedAttributes array to pass to liveconnect
 * @function
 * @param {Object} overrides - object with boolean values that will override defaults { 'foo': true, 'bar': false }
 * @returns {Array}
 */
function parseRequestedAttributes(overrides) {
  function createParameterArray(config) {
    return Object.entries(config).flatMap(([k, v]) => (typeof v === 'boolean' && v) ? [k] : []);
  }
  if (typeof overrides === 'object') {
    return createParameterArray({...defaultRequestedAttributes, ...overrides})
  } else {
    return createParameterArray(defaultRequestedAttributes);
  }
}

function initializeLiveConnect(configParams) {
  configParams = configParams || {};
  if (liveConnect) {
    return liveConnect;
  }

  const publisherId = configParams.publisherId || 'any';
  const identityResolutionConfig = {
    source: 'prebid',
    publisherId: publisherId,
    requestedAttributes: parseRequestedAttributes(configParams.requestedAttributesOverrides)
  };
  if (configParams.url) {
    identityResolutionConfig.url = configParams.url
  }
  if (configParams.partner) {
    identityResolutionConfig.source = configParams.partner
  }
  if (configParams.ajaxTimeout) {
    identityResolutionConfig.ajaxTimeout = configParams.ajaxTimeout;
  }

  const liveConnectConfig = parseLiveIntentCollectorConfig(configParams.liCollectConfig);
  liveConnectConfig.wrapperName = 'prebid';
  liveConnectConfig.identityResolutionConfig = identityResolutionConfig;
  liveConnectConfig.identifiersToResolve = configParams.identifiersToResolve || [];
  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString) {
    liveConnectConfig.usPrivacyString = usPrivacyString;
  }
  const gdprConsent = gdprDataHandler.getConsentData()
  if (gdprConsent) {
    liveConnectConfig.gdprApplies = gdprConsent.gdprApplies;
    liveConnectConfig.gdprConsent = gdprConsent.consentString;
  }

  // The second param is the storage object, LS & Cookie manipulation uses PBJS
  // The third param is the ajax and pixel object, the ajax and pixel use PBJS
  liveConnect = liveIntentIdSubmodule.getInitializer()(liveConnectConfig, storage, calls);
  if (configParams.emailHash) {
    liveConnect.push({ hash: configParams.emailHash })
  }
  return liveConnect;
}

function tryFireEvent() {
  if (!eventFired && liveConnect) {
    liveConnect.fire();
    eventFired = true;
  }
}

/** @type {Submodule} */
export const liveIntentIdSubmodule = {
  moduleMode: process.env.LiveConnectMode,
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  setModuleMode(mode) {
    this.moduleMode = mode
  },
  getInitializer() {
    return this.moduleMode === 'minimal' ? MinimalLiveConnect : LiveConnect
  },

  /**
   * decode the stored id value for passing to bid requests. Note that lipb object is a wrapper for everything, and
   * internally it could contain more data other than `lipbid`(e.g. `segments`) depending on the `partner` and
   * `publisherId` params.
   * @function
   * @param {{unifiedId:string}} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {{lipb:Object}}
   */
  decode(value, config) {
    const configParams = (config && config.params) || {};
    function composeIdObject(value) {
      const result = {};

      // old versions stored lipbid in unifiedId. Ensure that we can still read the data.
      const lipbid = value.nonId || value.unifiedId
      if (lipbid) {
        value.lipbid = lipbid
        delete value.unifiedId
        result.lipb = value
      }

      // Lift usage of uid2 by exposing uid2 if we were asked to resolve it.
      // As adapters are applied in lexicographical order, we will always
      // be overwritten by the 'proper' uid2 module if it is present.
      if (value.uid2) {
        result.uid2 = { 'id': value.uid2 }
      }

      return result
    }

    if (!liveConnect) {
      initializeLiveConnect(configParams);
    }
    tryFireEvent();

    return composeIdObject(value);
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};
    const liveConnect = initializeLiveConnect(configParams);
    if (!liveConnect) {
      return;
    }
    tryFireEvent();
    const result = function(callback) {
      liveConnect.resolve(
        response => {
          callback(response);
        },
        error => {
          logError(`${MODULE_NAME}: ID fetch encountered an error: `, error);
          callback();
        }
      )
    }

    return { callback: result };
  }
};

submodule('userId', liveIntentIdSubmodule);
