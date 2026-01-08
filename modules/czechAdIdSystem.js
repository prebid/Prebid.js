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
const readId = () => {
  const id = storage.getCookie('czaid') || storage.getDataFromLocalStorage('czaid')
  return id && isValidUUID(id) ? id : null
}
const isValidUUID = (str) => {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  return uuidRegex.test(str)
}

/** @type {Submodule} */
export const czechAdIdSubmodule = {
  version: '0.1.1',
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
  decode () {
    const id = readId()
    return id ? { czechAdId: readId() } : undefined
  },
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
