/**
 * This module adds netId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/netIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';

const LOG_PREFIX = 'User ID - netID submodule: ';
const ABTEST_RESOLUTION = 10000;

/** @type {Submodule} */
export const netIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'netId',
  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)}
   */
  decode(value, config) {
    let netId;
    if (value && typeof value['netId'] === 'string') {
      netId = { 'netId': value['netId'] };
    } else {
      return undefined;
    }
    // check for A/B testing configuration and hide ID if in Control Group
    const abConfig = checkAbTestingConfig(config, netId);
    if (abConfig.enabled === true && abConfig.controlGroup === true) {
      utils.logInfo(LOG_PREFIX + 'A/B Testing Enabled - user == ControlGroup -> netId not available');
      netId = '';
    } else if (abConfig.enabled === true) {
      utils.logInfo(LOG_PREFIX + 'A/B Testing Enabled - user != ControlGroup -> netId is available');
    }
    return netId;
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} storedId
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, storedId) {
    if (!hasRequiredConfig(config)) {
      return undefined;
    }
    if (config && config.hasOwnProperty("value") && config.value.hasOwnProperty("netId")) {
      utils.logInfo(LOG_PREFIX + 'id already in config', config.value);
      return { id: config.value };
    }
    if (storedId) {
      utils.logInfo(LOG_PREFIX + 'id already in cache', storedId);
      return { id: storedId };
    }
    const url = `https://einwilligungsspeicher.netid.de/netid-subject-identifiers?q.tapp_id.eq=${config.params.tapp_id}`;
    const resp = function (callback) {
      const callbacks = {
        success: response => {
          let responseObj;
          let responseRaw;
          if (response) {
            try {
              responseRaw = JSON.parse(response);
              utils.logInfo(LOG_PREFIX + 'response received from the server', responseRaw);
              if(responseRaw.hasOwnProperty("tpid") && responseRaw.hasOwnProperty("status_code") && responseRaw.status_code == "OK"){
                responseObj = { 'netId': responseRaw.tpid };
                utils.logInfo(LOG_PREFIX + 'used tpid', responseObj);
              }
            } catch (error) {
              utils.logError(LOG_PREFIX + error);
            }
          }
          callback(responseObj);
        },
        error: error => {
          utils.logError(LOG_PREFIX + 'getId fetch encountered an error', error);
          callback({ 'netId': null });
        }
      };
      utils.logInfo(LOG_PREFIX + 'requesting an ID from the server');
      ajax(url, callbacks, undefined, { method: 'GET', withCredentials: true });
    };
    return { id: storedId, callback: resp };
  }
};
function hasRequiredConfig(config) {
  if (!config || !config.params || !config.params.tapp_id || utils.isEmptyStr(config.params.tapp_id)) {
    utils.logError(LOG_PREFIX + 'tapp_id is undefined or empty');
    return false;
  }

  if (!config.storage || !config.storage.type || !config.storage.name) {
    utils.logError(LOG_PREFIX + 'storage required to be set');
    return false;
  }

  return true;
};
function checkAbTestingConfig(config,userId) {
  if (config && config.params && config.params.abTesting && config.params.abTesting.enabled && config.params.abTesting.controlGroupPct) {
    if (!utils.isNumber(config.params.abTesting.controlGroupPct) || config.params.abTesting.controlGroupPct < 0 || config.params.abTesting.controlGroupPct > 1) {
      utils.logError(LOG_PREFIX + 'A/B Testing controlGroupPct must be a number >= 0 and <= 1! Skipping A/B Testing');
      return { enabled: false };
    } else {
      return { enabled: true, controlGroup: abTestBucket(userId) < config.params.abTesting.controlGroupPct * ABTEST_RESOLUTION }
    }
  }
  return { enabled: false };
};
function abTestBucket(userId) {
  if (userId) {
    return ((utils.cyrb53Hash(userId) % ABTEST_RESOLUTION) + ABTEST_RESOLUTION) % ABTEST_RESOLUTION;
  } else {
    return Math.floor(Math.random() * ABTEST_RESOLUTION);
  }
};

submodule('userId', netIdSubmodule);
