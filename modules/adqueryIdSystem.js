/**
 * This module adds Adquery QID to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/adqueryIdSystem
 * @requires module:modules/userId
 */

import { getStorageManager } from '../src/storageManager.js';
import { submodule } from '../src/hook.js';
import { generateUUID, logInfo, logMessage } from '../src/utils.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'qid';
const AU_GVLID = 902;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'qid' });

/** @type {Submodule} */
export const adqueryIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  /**
   * IAB TCF Vendor ID
   * @type {string}
   */
  gvlid: AU_GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{value:string}} value
   * @returns {{qid:Object}}
   */
  decode(value) {
    return { qid: value };
  },
  /**
   * performs action to obtain id and return a value synchronously
   * @function
   * @returns {IdResponse|undefined}
   */
  getId() {
    logMessage('adqueryIdSubmodule getId');

    let qid = storage.getDataFromLocalStorage('qid');

    if (qid && qid.length > 36) {
      logInfo('adqueryIdSubmodule ID QID invalid length, removing:', qid.length);
      storage.removeDataFromLocalStorage('qid');
      qid = null;
    }

    if (!qid) {
      if (window.crypto && window.crypto.getRandomValues) {
        const randomValues = Array.from(window.crypto.getRandomValues(new Uint32Array(4)));
        qid = randomValues.map(val => val.toString(36)).join('').substring(0, 20);
      } else {
        qid = generateUUID();
      }
      storage.setDataInLocalStorage('qid', qid);

      logInfo('adqueryIdSubmodule ID QID GENERATED:', qid);
    }

    logInfo('adqueryIdSubmodule ID QID:', qid);

    return { id: qid };
  },
  eids: {
    'qid': {
      source: 'adquery.io',
      atype: 1
    },
  }
};

submodule('userId', adqueryIdSubmodule);
