/**
 * This module adds LiveIntentId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/liveIntentIdSystem
 * @requires module:modules/userId
 */
import * as utils from '../src/utils';
import { submodule } from '../src/hook';
import { LiveConnect } from 'live-connect-js/cjs/live-connect';
import { uspDataHandler } from '../src/adapterManager';

const MODULE_NAME = 'liveIntentId';

let eventFired = false;
let liveConnect = null;

/**
 * This function is used in tests
 */
export function reset() {
  eventFired = false;
  liveConnect = null;
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

  const liveConnectConfig = {
    identifiersToResolve: configParams.identifiersToResolve || [],
    wrapperName: 'prebid',
    identityResolutionConfig: identityResolutionConfig
  };
  const usPrivacyString = uspDataHandler.getConsentData();
  if (usPrivacyString) {
    liveConnectConfig.usPrivacyString = usPrivacyString;
  }
  if (configParams.appId) {
    liveConnectConfig.appId = configParams.appId;
  }

  liveConnect = LiveConnect(liveConnectConfig);
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
    return { callback: liveConnect.resolve };
  }
};

submodule('userId', liveIntentIdSubmodule);
