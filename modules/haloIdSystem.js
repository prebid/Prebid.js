/**
 * This module adds Audigent HaloId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/haloIdSystem
 * @requires module:modules/userId
 */

import {submodule} from '../src/hook.js';

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
    var script = document.createElement('script')
    script.type = 'text/javascript';

    script.onload = function() {
      callback(window.localStorage.getItem('auHalo'));
    }

    script.src = 'https://id.halo.dev.ad.gt/api/v1/haloid';
    document.getElementsByTagName('head')[0].appendChild(script);
  },
  decode(value) {
    return (value && typeof value['haloId'] === 'string') ? { 'haloId': value['haloId'] } : null;
  },
  /**
   * Performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleParams} [configParams]
   * @returns {function(callback:function)}
   */
  getId(submoduleConfigParams, consentData) {
    if (typeof submoduleConfigParams.getter == 'function') {
      let haloId = submoduleConfigParams.getter()
      return {id: haloId}
    }

    haloIdSubmodule.getHaloId(function(haloId) {
      return {id: haloId}
    });
  }
};

submodule('userId', haloIdSubmodule);
