/**
 * This module adds Audigent HaloId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/haloIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const storage = getStorageManager();

/** @type {Submodule} */
export const haloIdSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: 'haloId',
  /**
   * Decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{haloid:string}}
   */
  getHaloId(callback) {
    if (storage.getDataFromLocalStorage('haloId')) {
      let haloId = storage.getDataFromLocalStorage('haloId');
      callback(haloId);
    } else if (storage.getDataFromLocalStorage('auHaloId')) {
      let haloId = {haloId: storage.getDataFromLocalStorage('auHaloId')};
      callback(haloId);
    } else {
      var script = document.createElement('script')
      script.type = 'text/javascript';

      script.onload = function() {
        let haloId = {haloId: storage.getDataFromLocalStorage('auHaloId')};
        callback(haloId);
      }

      script.src = 'https://id.halo.dev.ad.gt/api/v1/haloid';
      document.getElementsByTagName('head')[0].appendChild(script);
    }
  },
  decode(value) {
    return (value && typeof value['haloId'] === 'string') ? { 'haloId': value['haloId'] } : undefined;
  },
  /**
   * Performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {function(callback:function)}
   */
  getId(submoduleConfigParams, consentData) {
    if (submoduleConfigParams &&
        typeof submoduleConfigParams['getter'] == 'function') {
      let haloId = submoduleConfigParams.getter()
      return {haloId: haloId}
    }

    return {callback: haloIdSubmodule.getHaloId};
  }
};

submodule('userId', haloIdSubmodule);
