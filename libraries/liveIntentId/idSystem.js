/**
 * This module adds LiveIntentId to the User ID module.
 * The {@link module:modules/userId} module is required.
 * @module modules/idSystem
 * @requires module:modules/userId
 */
import { triggerPixel, logError } from '../../src/utils.js';
import { ajaxBuilder } from '../../src/ajax.js';
import { gdprDataHandler, uspDataHandler, gppDataHandler } from '../../src/adapterManager.js';
import { submodule } from '../../src/hook.js';
import { LiveConnect } from 'live-connect-js'; // eslint-disable-line prebid/validate-imports
import { getStorageManager } from '../../src/storageManager.js';
import { MODULE_TYPE_UID } from '../../src/activities/modules.js';
import { DEFAULT_AJAX_TIMEOUT, MODULE_NAME, composeIdObject, eids, GVLID, DEFAULT_DELAY, PRIMARY_IDS, parseRequestedAttributes, makeSourceEventToSend } from './shared.js'

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const EVENTS_TOPIC = 'pre_lips';

export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});
const calls = {
  ajaxGet: (url, onSuccess, onError, timeout, headers) => {
    ajaxBuilder(timeout)(
      url,
      {
        success: onSuccess,
        error: onError
      },
      undefined,
      {
        method: 'GET',
        withCredentials: true,
        customHeaders: headers
      }
    )
  },
  pixelGet: (url, onload) => triggerPixel(url, onload)
}

let eventFired = false;
let liveConnect = null;

/**
 * This function is used in tests.
 */
export function reset() {
  if (window && window.liQ_instances) {
    window.liQ_instances.forEach(i => i.eventBus.off(EVENTS_TOPIC, setEventFiredFlag));
    window.liQ_instances = [];
  }
  liveIntentIdSubmodule.setModuleMode(null);
  eventFired = false;
  liveConnect = null;
}

/**
 * This function is used in tests.
 */
export function setEventFiredFlag() {
  eventFired = true;
}

function parseLiveIntentCollectorConfig(collectConfig) {
  const config = {};
  collectConfig = collectConfig || {};
  collectConfig.appId && (config.appId = collectConfig.appId);
  collectConfig.fpiStorageStrategy && (config.storageStrategy = collectConfig.fpiStorageStrategy);
  collectConfig.fpiExpirationDays && (config.expirationDays = collectConfig.fpiExpirationDays);
  collectConfig.collectorUrl && (config.collectorUrl = collectConfig.collectorUrl);
  config.ajaxTimeout = collectConfig.ajaxTimeout || DEFAULT_AJAX_TIMEOUT;
  return config;
}

/**
 * Create requestedAttributes array to pass to LiveConnect.
 * @function
 * @param {Object} overrides - object with boolean values that will override defaults { 'foo': true, 'bar': false }
 * @returns {Array}
 */

function initializeLiveConnect(configParams) {
  if (liveConnect) {
    return liveConnect;
  }

  configParams = configParams || {};
  const fpidConfig = configParams.fpid || {};

  const publisherId = configParams.publisherId || 'any';
  const identityResolutionConfig = {
    publisherId: publisherId,
    requestedAttributes: parseRequestedAttributes(configParams.requestedAttributesOverrides),
    extraAttributes: {
      ipv4: configParams.ipv4,
      ipv6: configParams.ipv6
    }
  };
  if (configParams.url) {
    identityResolutionConfig.url = configParams.url;
  };

  identityResolutionConfig.ajaxTimeout = configParams.ajaxTimeout || DEFAULT_AJAX_TIMEOUT;

  const liveConnectConfig = parseLiveIntentCollectorConfig(configParams.liCollectConfig);

  if (!liveConnectConfig.appId && configParams.distributorId) {
    liveConnectConfig.distributorId = configParams.distributorId;
    identityResolutionConfig.source = configParams.distributorId;
  } else {
    identityResolutionConfig.source = configParams.partner || 'prebid';
  }

  liveConnectConfig.wrapperName = 'prebid';
  liveConnectConfig.trackerVersion = '$prebid.version$';
  liveConnectConfig.identityResolutionConfig = identityResolutionConfig;
  liveConnectConfig.identifiersToResolve = configParams.identifiersToResolve || [];
  liveConnectConfig.fireEventDelay = configParams.fireEventDelay;

  liveConnectConfig.idCookie = {};
  liveConnectConfig.idCookie.name = fpidConfig.name;
  liveConnectConfig.idCookie.strategy = fpidConfig.strategy == 'html5' ? 'localStorage' : fpidConfig.strategy;

  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString) {
    liveConnectConfig.usPrivacyString = usPrivacyString;
  }
  const gdprConsent = gdprDataHandler.getConsentData();
  if (gdprConsent) {
    liveConnectConfig.gdprApplies = gdprConsent.gdprApplies;
    liveConnectConfig.gdprConsent = gdprConsent.consentString;
  }
  const gppConsent = gppDataHandler.getConsentData();
  if (gppConsent) {
    liveConnectConfig.gppString = gppConsent.gppString;
    liveConnectConfig.gppApplicableSections = gppConsent.applicableSections;
  }
  // The second param is the storage object, LS & Cookie manipulation uses PBJS.
  // The third param is the ajax and pixel object, the AJAX and pixel use PBJS.
  liveConnect = liveIntentIdSubmodule.getInitializer()(liveConnectConfig, storage, calls);

  const sourceEvent = makeSourceEventToSend(configParams)
  if (sourceEvent != null) {
    liveConnect.push(sourceEvent);
  }
  return liveConnect;
}

function tryFireEvent() {
  if (!eventFired && liveConnect) {
    const eventDelay = liveConnect.config.fireEventDelay || DEFAULT_DELAY;
    setTimeout(() => {
      const instances = window.liQ_instances;
      instances.forEach(i => i.eventBus.once(EVENTS_TOPIC, setEventFiredFlag));
      if (!eventFired && liveConnect) {
        liveConnect.fire();
      }
    }, eventDelay);
  }
}

/** @type {Submodule} */
export const liveIntentIdSubmodule = {
  moduleMode: '$$LIVE_INTENT_MODULE_MODE$$',
  /**
   * Used to link submodule with config.
   * @type {string}
   */
  name: MODULE_NAME,
  gvlid: GVLID,
  setModuleMode(mode) {
    this.moduleMode = mode;
  },
  getInitializer() {
    return (liveConnectConfig, storage, calls) => LiveConnect(liveConnectConfig, storage, calls, this.moduleMode);
  },

  /**
   * Decode the stored id value for passing to bid requests.
   * Note that lipb object is a wrapper for everything, and
   * internally it could contain more data other than `lipbid`
   * (e.g. `segments`) depending on the `partner` and `publisherId`
   * params.
   * @function
   * @param {{unifiedId:string}} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {{lipb:Object}}
   */
  decode(value, config) {
    const configParams = (config && config.params) || {};

    if (!liveConnect) {
      initializeLiveConnect(configParams);
    }
    tryFireEvent();

    return composeIdObject(value);
  },

  /**
   * Performs action to obtain id and return a value in the callback's response argument.
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
  },
  primaryIds: PRIMARY_IDS,
  eids
};

submodule('userId', liveIntentIdSubmodule);
