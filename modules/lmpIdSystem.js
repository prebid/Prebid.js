/**
 * This module adds lmpId support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/lmpIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'lmpid';
const STORAGE_KEY = '__lmpid';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

function readFromLocalStorage() {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(STORAGE_KEY) : null;
}

function getLmpid() {
  return window[STORAGE_KEY] || readFromLocalStorage();
}

/** @type {Submodule} */
export const lmpIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { string | undefined } value
   * @return { {lmpid: string} | undefined }
   */
  decode(value) {
    return value ? { lmpid: value } : undefined;
  },

  /**
   * Retrieve the LMPID
   * @function
   * @param {SubmoduleConfig} config
   * @return {{id: string | undefined} | undefined}
   */
  getId(config) {
    const id = getLmpid();
    return id ? { id } : undefined;
  },

  eids: {
    'lmpid': {
      source: 'loblawmedia.ca',
      atype: 3
    },
  }
};

submodule('userId', lmpIdSubmodule);
