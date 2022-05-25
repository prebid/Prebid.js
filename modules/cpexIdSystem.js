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
const getId = () => { return storage.getCookie('caid') || storage.getDataFromLocalStorage('caid') }

/** @type {Submodule} */
export const cpexIdSubmodule = {
  version: '0.0.4',
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
   * @param {(Object|string)} value
   * @returns {(Object|undefined)}
   */
  decode (value) { return { cpexId: getId() } },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId (config, consentData) { return { cpexId: getId() } }
}

submodule('userId', cpexIdSubmodule)
