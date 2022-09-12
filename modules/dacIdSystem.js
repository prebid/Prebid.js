/**
 * This module adds dacId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/dacIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();

export const cookieKey = '_a1_f';

export const dacIdSystemSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'dacId',

  /**
   * performs action to obtain id
   * @function
   * @returns { {id: {dacId: string}} | undefined }
   */
  getId: function() {
    const newId = storage.getCookie(cookieKey);
    if (!newId) {
      return undefined;
    }
    const result = {
      dacId: newId
    }
    return {id: result};
  },

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param { {dacId: string} } value
   * @returns { {dacId: {id: string} } | undefined }
   */
  decode: function(value) {
    if (value && typeof value === 'object') {
      const result = {};
      if (value.dacId) {
        result.id = value.dacId
      }
      return {dacId: result};
    }
    return undefined;
  },

}

submodule('userId', dacIdSystemSubmodule);
