/**
 * This module adds 'caid' to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/cpexIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js'
import { getStorageManager } from '../src/storageManager.js'

// Returns StorageManager
export const storage = getStorageManager({ gvlid: 570, moduleName: 'cpexId' })

// Returns the id string from either cookie or localstorage
const readId = () => { return storage.getCookie('czaid') || storage.getDataFromLocalStorage('czaid') }

/** @type {Submodule} */
export const cpexIdSubmodule = {
  version: '0.0.5',
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'cpexId',
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
  decode () { return { cpexId: readId() } },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @returns {IdResponse|undefined}
   */
  getId () {
    const id = readId()
    return id ? { id: id } : undefined
  }
}

submodule('userId', cpexIdSubmodule)
