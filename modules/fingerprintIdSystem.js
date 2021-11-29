/**
 * This module adds Fingerprint to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/fingerprintIdSystem
 * @requires module:modules/userId
 */
import { load as loadFingerprint } from '@fingerprintjs/fingerprintjs';
import { logError, logInfo } from '../src/utils.js'
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const STORAGE_KEY = '__fp'
export const storage = getStorageManager();

/** @type {Submodule} */
export const fingerprintIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: 'fingerprintId',
  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {string} value
   * @returns {{fingerprintId:string}}
   */
  decode(value) {
    return { 'fingerprintId': value }
  },
  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData} [consentData]
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData) {
    const gdpr = (consentData && typeof consentData.gdprApplies === 'boolean' && consentData.gdprApplies) ? 1 : 0;
    const consentString = gdpr ? consentData.consentString : '';
    if (gdpr && !consentString) {
      logInfo('Consent string is required to load fingerprint.');
      return;
    }
    const fingerprint = storage.getDataFromLocalStorage(STORAGE_KEY);
    if (fingerprint) {
      return { id: fingerprint }
    }

    const resp = function(callback) {
      loadFingerprint().then(result => result.get()).then(({ visitorId }) => {
        storage.setDataInLocalStorage(STORAGE_KEY, visitorId)
        callback(visitorId)
      }).catch(err => {
        logError(err.message);
        callback();
      })
    };

    return { callback: resp };
  }
}

submodule('userId', fingerprintIdSubmodule);
