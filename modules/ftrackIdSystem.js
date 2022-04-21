/**
 * This module adds ftrack to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/ftrack
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { uspDataHandler } from '../src/adapterManager.js';

const MODULE_NAME = 'ftrackId';
const LOG_PREFIX = 'FTRACK - ';
const LOCAL_STORAGE_EXP_DAYS = 30;
const VENDOR_ID = null;
const LOCAL_STORAGE = 'html5';
const FTRACK_STORAGE_NAME = 'ftrackId';
const FTRACK_PRIVACY_STORAGE_NAME = `${FTRACK_STORAGE_NAME}_privacy`;
const FTRACK_URL = 'https://d9.flashtalking.com/d9core';
const storage = getStorageManager({gvlid: VENDOR_ID, moduleName: MODULE_NAME});

let consentInfo = {
  gdpr: {
    applies: 0,
    consentString: null,
    pd: null
  },
  usPrivacy: {
    value: null
  }
};

/** @type {Submodule} */
export const ftrackIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: `ftrack`,

  /**
   * Decodes the 'value'
   * @function decode (required method)
   * @param {(Object|string)} value
   * @param {SubmoduleConfig|undefined} config
   * @returns {(Object|undefined)} an object with the key being ideally camel case
   *   similar to the module name and ending in id or Id
   */
  decode (value, config) {
    return {
      ftrackId: value
    };
  },

  /**
   * performs action(s) to obtain ids from D9 and return the Device IDs
   * should be the only method that gets a new ID (from ajax calls or a cookie/local storage)
   * @function getId (required method)
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId (config, consentData, cacheIdObj) {
    if (this.isConfigOk(config) === false || this.isThereConsent(consentData) === false) return undefined;

    return {
      callback: function () {
        window.D9v = {
          UserID: '99999999999999',
          CampID: '3175',
          CCampID: '148556'
        };
        window.D9r = {
          DeviceID: true,
          SingleDeviceID: true,
          callback: function(response) {
            if (response) {
              storage.setDataInLocalStorage(`${FTRACK_STORAGE_NAME}_exp`, (new Date(Date.now() + (1000 * 60 * 60 * 24 * LOCAL_STORAGE_EXP_DAYS))).toUTCString());
              storage.setDataInLocalStorage(`${FTRACK_STORAGE_NAME}`, JSON.stringify(response));

              storage.setDataInLocalStorage(`${FTRACK_PRIVACY_STORAGE_NAME}_exp`, (new Date(Date.now() + (1000 * 60 * 60 * 24 * LOCAL_STORAGE_EXP_DAYS))).toUTCString());
              storage.setDataInLocalStorage(`${FTRACK_PRIVACY_STORAGE_NAME}`, JSON.stringify(consentInfo));
            };

            return response;
          }
        };

        if (config.params && config.params.url && config.params.url === FTRACK_URL) {
          var ftrackScript = document.createElement('script');
          ftrackScript.setAttribute('src', config.params.url);
          window.document.body.appendChild(ftrackScript);
        }
      }
    };
  },

  /**
   * Called when IDs are already in localStorage
   * should just be adding additional data to the cacheIdObj object
   * @function extendId (optional method)
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  extendId (config, consentData, cacheIdObj) {
    this.isConfigOk(config);
    return cacheIdObj;
  },

  /*
   * Validates the config, if it is not correct, then info cannot be saved in localstorage
   * @function isConfigOk
   * @param {SubmoduleConfig} config from HTML
   * @returns {true|false}
   */
  isConfigOk: function(config) {
    if (!config.storage || !config.storage.type || !config.storage.name) {
      utils.logError(LOG_PREFIX + 'config.storage required to be set.');
      return false;
    }

    // in a future release, we may return false if storage type or name are not set as required
    if (config.storage.type !== LOCAL_STORAGE) {
      utils.logWarn(LOG_PREFIX + 'config.storage.type recommended to be "' + LOCAL_STORAGE + '".');
    }
    // in a future release, we may return false if storage type or name are not set as required
    if (config.storage.name !== FTRACK_STORAGE_NAME) {
      utils.logWarn(LOG_PREFIX + 'config.storage.name recommended to be "' + FTRACK_STORAGE_NAME + '".');
    }

    if (!config.hasOwnProperty('params') || !config.params.hasOwnProperty('url') || config.params.url !== FTRACK_URL) {
      utils.logWarn(LOG_PREFIX + 'config.params.url is required for ftrack to run. Url should be "' + FTRACK_URL + '".');
      return false;
    }

    return true;
  },

  isThereConsent: function(consentData) {
    let consentValue = true;

    /*
     * Scenario 1: GDPR
     *   if GDPR Applies is true|1, we do not have consent
     *   if GDPR Applies does not exist or is false|0, we do not NOT have consent
     */
    if (consentData && consentData.gdprApplies && (consentData.gdprApplies === true || consentData.gdprApplies === 1)) {
      consentInfo.gdpr.applies = 1;
      consentValue = false;
    }
    // If consentString exists, then we store it even though we are not using it
    if (consentData && consentData.consentString !== 'undefined' && !utils.isEmpty(consentData.consentString) && !utils.isEmptyStr(consentData.consentString)) {
      consentInfo.gdpr.consentString = consentData.consentString;
    }

    /*
     * Scenario 2: CCPA/us_privacy
     *   if usp exists (assuming this check determines the location of the device to be within the California)
     *     parse the us_privacy string to see if we have consent
     *     for version 1 of us_privacy strings, if 'Opt-Out Sale' is 'Y' we do not track
     */
    const usp = uspDataHandler.getConsentData();
    let usPrivacyVersion;
    // let usPrivacyOptOut;
    let usPrivacyOptOutSale;
    // let usPrivacyLSPA;
    if (typeof usp !== 'undefined' && !utils.isEmpty(usp) && !utils.isEmptyStr(usp)) {
      consentInfo.usPrivacy.value = usp;
      usPrivacyVersion = usp[0];
      // usPrivacyOptOut = usp[1];
      usPrivacyOptOutSale = usp[2];
      // usPrivacyLSPA = usp[3];
    }
    if (usPrivacyVersion == 1 && usPrivacyOptOutSale === 'Y') consentValue = false;

    return consentValue;
  }
};

submodule('userId', ftrackIdSubmodule);
