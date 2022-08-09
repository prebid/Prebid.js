/**
 * This module adds gravitompId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/gravitoIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

export const storage = getStorageManager();

export const cookieKey = 'gravitompId';

export const gravitoIdSystemSubmodule = {
  /**
  * used to link submodule with config
  * @type {string}
  */
  name: 'gravitompId',

  /**
  * performs action to obtain id
  * @function
  * @returns { {id: {gravitompId: string}} | undefined }
  */
  getId: function() {
    const newId = storage.getCookie(cookieKey);
    if (!newId) {
      return undefined;
    }
    const result = {
      gravitompId: newId
    }
    return {id: result};
  },

  /**
  * decode the stored id value for passing to bid requests
  * @function
  * @param { {gravitompId: string} } value
  * @returns { {gravitompId: {id: string} } | undefined }
  */
  decode: function(value) {
    if (value && typeof value === 'object') {
      const result = {};
      if (value.gravitompId) {
        result.id = value.gravitompId
      }
      return {gravitompId: result};
    }
    return undefined;
  },

}

submodule('userId', gravitoIdSystemSubmodule);
