/**
 * This module adds GrowthCodeId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/growthCodeIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js'
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'growthCodeId';
const GCID_KEY = 'gcid';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME });

/** @type {Submodule} */
export const growthCodeIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{string}} value
   * @returns {{growthCodeId: {string}}|undefined}
   */
  decode(value) {
    return value && value !== '' ? { 'growthCodeId': value } : undefined;
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @returns {IdResponse|undefined}
   */
  getId(config) {
    const configParams = (config && config.params) || {};

    let ids = [];
    let gcid = storage.getDataFromLocalStorage(GCID_KEY, null)

    if (gcid !== null) {
      const gcEid = {
        source: 'growthcode.io',
        uids: [{
          id: gcid,
          atype: 3,
        }]
      }

      ids = ids.concat(gcEid)
    }

    let additionalEids = storage.getDataFromLocalStorage(configParams.customerEids, null)
    if (additionalEids !== null) {
      let data = JSON.parse(additionalEids)
      ids = ids.concat(data)
    }

    return {id: ids}
  },

};

submodule('userId', growthCodeIdSubmodule);
