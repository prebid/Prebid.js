/**
 * This module adds LiveIntentId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/liveIntentIdSystem
 * @requires module:modules/userId
 */
import * as utils from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { LiveConnect } from 'live-connect-js/cjs/live-connect.js';
import { uspDataHandler } from '../src/adapterManager.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'liveIntentId';
export const storage = getStorageManager(null, MODULE_NAME);

let eventFired = false;
let liveConnect = null;

/**
 * This function is used in tests
 */
export function reset() {
  eventFired = false;
  liveConnect = null;
}

function parseLiveIntentCollectorConfig(collectConfig) {
  const config = {};
  if (collectConfig) {
    if (collectConfig.appId) {
      config.appId = collectConfig.appId;
    }
    if (collectConfig.fpiStorageStrategy) {
      config.storageStrategy = collectConfig.fpiStorageStrategy;
    }
    if (collectConfig.fpiExpirationDays) {
      config.expirationDays = collectConfig.fpiExpirationDays;
    }
    if (collectConfig.collectorUrl) {
      config.collectorUrl = collectConfig.collectorUrl;
    }
  }
  return config;
}

function initializeLiveConnect(configParams) {
  if (liveConnect) {
    return liveConnect;
  }

  const publisherId = configParams && configParams.publisherId;
  if (!publisherId && typeof publisherId !== 'string') {
    utils.logError(`${MODULE_NAME} - publisherId must be defined, not a '${publisherId}'`);
    return;
  }

  const identityResolutionConfig = {
    source: 'prebid',
    publisherId: publisherId
  };
  if (configParams.url) {
    identityResolutionConfig.url = configParams.url
  }
  if (configParams.partner) {
    identityResolutionConfig.source = configParams.partner
  }
  if (configParams.storage && configParams.storage.expires) {
    identityResolutionConfig.expirationDays = configParams.storage.expires;
  }
  if (configParams.ajaxTimeout) {
    identityResolutionConfig.ajaxTimeout = configParams.ajaxTimeout;
  }

  const liveConnectConfig = parseLiveIntentCollectorConfig(configParams.liCollectConfig);
  liveConnectConfig.wrapperName = 'prebid';
  liveConnectConfig.identityResolutionConfig = identityResolutionConfig;
  liveConnectConfig.identifiersToResolve = configParams.identifiersToResolve || [];
  if (configParams.providedIdentifierName) {
    liveConnectConfig.providedIdentifierName = configParams.providedIdentifierName;
  }
  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString) {
    liveConnectConfig.usPrivacyString = usPrivacyString;
  }

  // The second param is the storage object, which means that all LS & Cookie manipulation will go through PBJS utils.
  liveConnect = LiveConnect(liveConnectConfig, storage);
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
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests. Note that lipb object is a wrapper for everything, and
   * internally it could contain more data other than `lipbid`(e.g. `segments`) depending on the `partner` and
   * `publisherId` params.
   * @function
   * @param {{unifiedId:string}} value
   * @param {SubmoduleParams|undefined} [configParams]
   * @returns {{lipb:Object}}
   */
  decode(value, configParams) {
    function composeIdObject(value) {
      const base = { 'lipbid': value['unifiedId'] };
      delete value.unifiedId;
      return { 'lipb': { ...base, ...value } };
    }

    if (configParams) {
      initializeLiveConnect(configParams);
      tryFireEvent();
    }

    return (value && typeof value['unifiedId'] === 'string') ? composeIdObject(value) : undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {IdResponse|undefined}
   */
  getId(configParams) {
    const liveConnect = initializeLiveConnect(configParams);
    if (!liveConnect) {
      return;
    }
    tryFireEvent();
    // Don't do the internal ajax call, but use the composed url and fire it via PBJS ajax module
    const url = liveConnect.resolutionCallUrl();
    const result = function (callback) {
      ajax(url, response => {
        let responseObj = {};
        if (response) {
          try {
            responseObj = JSON.parse(response);
          } catch (error) {
            utils.logError(error);
          }
        }
        callback(responseObj);
      }, undefined, { method: 'GET', withCredentials: true });
    };
    return {callback: result};
  }
};

submodule('userId', liveIntentIdSubmodule);
