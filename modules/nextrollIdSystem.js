/**
 * This module adds Nextroll ID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/nextrollIdSystem
 * @requires module:modules/userId
 */

import { deepAccess } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const NEXTROLL_ID_LS_KEY = 'dca0.com';
const KEY_PREFIX = 'AdID:'

export const storage = getStorageManager();

/** @type {Submodule} */
export const nextrollIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'nextroll',

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @return {{nextroll: string} | undefined}
   */
  decode(value) {
    return value;
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {{id: {nextroll: string} | undefined}}
   */
  getId(config) {
    const key = KEY_PREFIX + deepAccess(config, 'params.sellerId', 'undefined');
    const dataString = storage.getDataFromLocalStorage(NEXTROLL_ID_LS_KEY) || '{}';
    const data = JSON.parse(dataString);
    const nextrollId = deepAccess(data, `${key}.value`);

    return { id: nextrollId ? {nextroll: nextrollId} : undefined };
  }
};

submodule('userId', nextrollIdSubmodule);
