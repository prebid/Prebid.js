/**
 * This module adds AdmixerId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/admixerIdSubmodule
 * @requires module:modules/userId
 */

import { logError, logInfo } from '../src/utils.js'
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
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
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const {e, p, pid} = (config && config.params) || {};
    if (!pid || typeof pid !== 'string') {
      logError('admixerId submodule requires partner id to be defined');
      return;
    }
    const gdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const consentString = gdpr ? consentData.consentString : '';
    if (gdpr && !consentString) {
      logInfo('Consent string is required to call admixer id.');
      return;
    }
    const url = `https://inv-nets.admixer.net/cntcm.aspx?ssp=${pid}${e ? `&e=${e}` : ''}${p ? `&p=${p}` : ''}${consentString ? `&cs=${consentString}` : ''}`;
    const resp = function(callback) {
      if (window.admixTMLoad && window.admixTMLoad.push) {
        window.admixTMLoad.push(function() {
          window.admixTM.retrieveVisitorId(function(visitorId) {
            if (visitorId) {
              callback(visitorId);
            } else {
              callback();
            }
          });
        });
      } else {
        retrieveVisitorId(url, callback);
      }
    };

    return { callback: resp };
  }
};
function retrieveVisitorId(url, callback) {
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
      logInfo(`admixerId: fetch encountered an error`, error);
      callback();
    }
  }, undefined, { method: 'GET', withCredentials: true });
}

submodule('userId', admixerIdSubmodule);
