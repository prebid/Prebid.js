/**
 * This module adds pafId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/swanIdSystem
 * @requires module:modules/userId
 */

 import {submodule} from '../src/hook.js';

 /** @type {Submodule} */
 export const pafIdSubmodule = {
   /**
    * used to link submodule with config
    * @type {string}
    */
   name: 'pafData',
   /**
    * decode the stored data value for passing to bid requests
    * @function decode
    * @param {(Object|string)} value
    * @returns {(Object|undefined)}
    */
   decode(data) {
     return { pafData: data };
   },
   /**
    * performs action to obtain id and return a value in the callback's response argument
    * @function
    * @param {SubmoduleConfig} [config]
    * @param {ConsentData} [consentData]
    * @param {(Object|undefined)} cacheIdObj
    * @returns {IdResponse|undefined}
    */
   getId(config, consentData) {
     if (window.PAF) {
       return {id: window.PAF.getIdsAndPreferences()};
     } else {
       return undefined;
     }
   }
 };
 
 submodule('userId', pafIdSubmodule);