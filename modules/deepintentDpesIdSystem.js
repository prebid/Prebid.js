/**
 * This module adds DPES to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/deepintentDpesSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';
import {isPlainObject} from '../src/utils.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 */

const MODULE_NAME = 'deepintentId';
export const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

/** @type {Submodule} */
export const deepintentDpesSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{value:string}} value
   * @returns {{deepintentId:Object}}
   */
  decode(value, config) {
    return value ? { 'deepintentId': value } : undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @param {ConsentData|undefined} consentData
   * @param {Object} cacheIdObj - existing id, if any
   * @return {{id: string | undefined} | undefined}
   */
  getId(config, consentData, cacheIdObj) {
    return cacheIdObj;
  },
  eids: {
    'deepintentId': {
      source: 'deepintent.com',
      atype: 3,
      getValue: (userIdData) => {
        if (isPlainObject(userIdData) && userIdData?.id) {
          return userIdData.id;
        }
        return userIdData;
      }
    },
  },
};

submodule('userId', deepintentDpesSubmodule);
