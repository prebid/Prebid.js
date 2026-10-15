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
const MAX_QID_LENGTH = 40;

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'qid' });

function getStoredQid() {
  const qid = storage.getDataFromLocalStorage('qid');

  if (qid && qid.length > MAX_QID_LENGTH) {
    logInfo('adqueryIdSubmodule ID QID invalid length, removing:', qid.length);
    storage.removeDataFromLocalStorage('qid');
    return null;
  }

  return qid;
}

function generateQid() {
  let qid;
  if (window.crypto && window.crypto.getRandomValues) {
    const randomValues = Array.from(window.crypto.getRandomValues(new Uint32Array(4)));
    qid = randomValues.map(val => val.toString(36)).join('').substring(0, 20);
  } else {
    qid = generateUUID();
  }
  storage.setDataInLocalStorage('qid', qid);

  logInfo('adqueryIdSubmodule ID QID GENERATED:', qid);

  return qid;
}

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
    logInfo('[GETID]');
    logMessage('adqueryIdSubmodule getId');

    const qid = getStoredQid() || generateQid();

    logInfo('adqueryIdSubmodule ID QID:', qid);

    return { id: qid };
  },
  /**
   * called by the userId module instead of getId when a stored id already exists,
   * replaces a stored qid longer than 40 characters
   * @function
   * @param {SubmoduleConfig} config
   * @param {Object} consentData
   * @param {string} storedId
   * @returns {IdResponse|undefined}
   */
  extendId(config, consentData, storedId) {
    logInfo('[EXTENDID]');
    if (!storedId || (typeof storedId === 'string' && storedId.length <= MAX_QID_LENGTH)) {
      return;
    }

    logInfo('adqueryIdSubmodule stored QID invalid, replacing:', typeof storedId === 'string' ? storedId.length : typeof storedId);

    return { id: getStoredQid() || generateQid() };
  },
  eids: {
    'qid': {
      source: 'adquery.io',
      atype: 1
    },
  }
};

submodule('userId', adqueryIdSubmodule);
