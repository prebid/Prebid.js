/**
 * This module adds AdmixerId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/admixerIdSubmodule
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import {hook, submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';

export const storage = getStorageManager();

/** @type {Submodule} */
export const admixerIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'admixerId',
  /**
   * used to specify vendor id
   * @type {number}
   */
  gvlid: 511,
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{admixerId:string}}
   */
  decode(value) {
    return { 'admixerId': value }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @param {string} [storedId]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, storedId) {
    const {e, p, pid} = (config && config.params) || {};
    if (!pid || typeof pid !== 'string') {
      utils.logError('admixerId submodule requires partner id to be defined');
      return;
    }
    const gdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const consentString = gdpr ? consentData.consentString : '';
    if (gdpr && !consentString) {
      utils.logInfo('Consent string is required to call admixer id.');
      return;
    }
    const resp = function(callback) {
      const search = {
        ssp: pid
      };
      if (e) search.e = e;
      if (p) search.p = p;
      if (consentString) search.cs = consentString;
      if (storedId) search.sid = storedId;
      retrieveVisitorId({
        protocol: 'https',
        host: 'inv-nets.admixer.net',
        pathname: '/cntcm.aspx',
        search: search
      }, callback);
    };

    return { callback: resp };
  }
};

const retrieveVisitorId = hook('sync', function (urlObj, callback) {
  const url = utils.buildUrl(urlObj);
  ajax(url, {
    success: response => {
      const {setData: {visitorid} = {}} = JSON.parse(response || '{}');
      if (visitorid) {
        callback(visitorid);
      } else {
        callback();
      }
    },
    error: error => {
      utils.logInfo(`admixerId: fetch encountered an error`, error);
      callback();
    }
  }, undefined, { method: 'GET', withCredentials: true });
}, 'admixerIdSystem.retrieveVisitorId');


submodule('userId', admixerIdSubmodule);
