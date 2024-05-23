/**
 * This module adds ceeId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/ceeId
 * @requires module:modules/userId
 */

import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { getStorageManager } from '../src/storageManager.js';
import { submodule } from '../src/hook.js';
import {domainOverrideToRootDomain} from '../libraries/domainOverrideToRootDomain/index.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'ceeId';
const ID_TOKEN = 'WPxid';
export const storage = getStorageManager({ moduleName: MODULE_NAME, moduleType: MODULE_TYPE_UID });

/**
 * Reads the ID token from local storage or cookies.
 * @returns {string|undefined} The ID token, or undefined if not found.
 */
export const readId = () => storage.getDataFromLocalStorage(ID_TOKEN) || storage.getCookie(ID_TOKEN);

/** @type {Submodule} */
export const ceeIdSubmodule = {
  name: MODULE_NAME,
  gvlid: 676,

  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @param {string} value
   * @returns {(Object|undefined)}
   */
  decode(value) {
    return typeof value === 'string' ? { 'ceeId': value } : undefined;
  },

  /**
   * performs action to obtain id and return a value
   * @function
   * @returns {(IdResponse|undefined)}
   */
  getId() {
    const ceeIdToken = readId();

    return ceeIdToken ? { id: ceeIdToken } : undefined;
  },
  domainOverride: domainOverrideToRootDomain(storage, MODULE_NAME),
  eids: {
    'ceeId': {
      source: 'ceeid.eu',
      atype: 1
    },
  },
};

submodule('userId', ceeIdSubmodule);
