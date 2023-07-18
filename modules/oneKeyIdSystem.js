/**
 * This module adds Onekey data to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/oneKeyIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import { logError, logMessage } from '../src/utils.js';

// Pre-init OneKey if it has not load yet.
window.OneKey = window.OneKey || {};
window.OneKey.queue = window.OneKey.queue || [];

const logPrefix = 'OneKey.Id-Module';

/**
 * Generate callback that deserializes the result of getIdsAndPreferences.
 */
const onIdsAndPreferencesResult = (callback) => {
  return (result) => {
    logMessage(logPrefix, `Has got Ids and Prefs with status: `, result);
    callback(result.data);
  };
};

/**
 * Call OneKey once it is loaded for retrieving
 * the ids and the preferences.
 */
const getIdsAndPreferences = (callback) => {
  logMessage(logPrefix, 'Queue getIdsAndPreferences call');
  // Call OneKey in a queue so that we are sure
  // it will be called when fully load and configured
  // within the page.
  window.OneKey.queue.push(() => {
    logMessage(logPrefix, 'Get Ids and Prefs');
    window.OneKey.getIdsAndPreferences()
      .then(onIdsAndPreferencesResult(callback))
      .catch(() => {
        logError(logPrefix, 'Cannot retrieve the ids and preferences from OneKey.');
        callback(undefined);
      });
  });
};

/** @type {Submodule} */
export const oneKeyIdSubmodule = {
  /**
    * used to link submodule with config
    * @type {string}
    */
  name: 'oneKeyData',
  /**
    * decode the stored data value for passing to bid requests
    * @function decode
    * @param {(Object|string)} value
    * @returns {(Object|undefined)}
    */
  decode(data) {
    return { oneKeyData: data };
  },
  /**
    * performs action to obtain id and return a value in the callback's response argument
    * @function
    * @param {SubmoduleConfig} [config]
    * @param {ConsentData} [consentData]
    * @param {(Object|undefined)} cacheIdObj
    * @returns {IdResponse|undefined}
    */
  getId(config) {
    return {
      callback: getIdsAndPreferences
    };
  }
};

submodule('userId', oneKeyIdSubmodule);
