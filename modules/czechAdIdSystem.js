/**
 * This module adds 'caid' to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/czechAdIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js'
import {getStorageManager} from '../src/storageManager.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

// Returns StorageManager
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: 'czechAdId' })

// Returns the id string from either cookie or localstorage
const readId = () => { return storage.getCookie('czaid') || storage.getDataFromLocalStorage('czaid') }

/** @type {Submodule} */
export const czechAdIdSubmodule = {
  version: '0.1.0',
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'czechAdId',
  /**
   * Vendor ID of Czech Publisher Exchange
   * @type {Number}
   */
  gvlid: 570,
  /**
   * decode the stored id value for passing to bid requests
   * @function decode
   * @returns {(Object|undefined)}
   */
  decode () { return { czechAdId: readId() } },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @returns {IdResponse|undefined}
   */
  getId () {
    const id = readId()
    return id ? { id: id } : undefined
  },
  eids: {
    'czechAdId': {
      source: 'czechadid.cz',
      atype: 1
    },
  }
}

submodule('userId', czechAdIdSubmodule)
