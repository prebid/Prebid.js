/**
 * This module adds ftrack to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/ftrack
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {getStorageManager} from '../src/storageManager.js';
import {loadExternalScript} from '../src/adloader.js';
import {MODULE_TYPE_UID} from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'ftrackId';
const LOG_PREFIX = 'FTRACK - ';
const LOCAL_STORAGE_EXP_DAYS = 30;
const LOCAL_STORAGE = 'html5';
const FTRACK_STORAGE_NAME = 'ftrackId';
const FTRACK_PRIVACY_STORAGE_NAME = `${FTRACK_STORAGE_NAME}_privacy`;
const storage = getStorageManager({moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME});

const consentInfo = {
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
    if (!value) {
      return;
    };

    const DECODE_RESPONSE = {
      ftrackId: {
        uid: '',
        ext: {}
      }
    }

    // Loop over the value's properties:
    // -- if string, assign value as is.
    // -- if array, convert to string then assign value.
    // -- If neither type, assign value as empty string
    for (var key in value) {
      let keyValue = value[key];
      if (Array.isArray(keyValue)) {
        keyValue = keyValue.join('|');
      } else if (typeof value[key] !== 'string') {
        // Unexpected value type, should be string or array
        keyValue = '';
      }

      DECODE_RESPONSE.ftrackId.ext[key] = keyValue;
    }

    // If we have DeviceId value, assign it to the uid property
    if (DECODE_RESPONSE.ftrackId.ext.hasOwnProperty('DeviceID')) {
      DECODE_RESPONSE.ftrackId.uid = DECODE_RESPONSE.ftrackId.ext.DeviceID;
    }

    return DECODE_RESPONSE;
  },

  /**
   * performs action(s) to obtain ids from D9 and return the Device IDs
   * should be the only method that gets a new ID (from ajax calls or a cookie/local storage)
   * @function getId (required method)
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined} A response object that contains id and/or callback.
   */
  getId (config, consentData, cacheIdObj) {
    if (this.isConfigOk(config) === false || this.isThereConsent(consentData) === false) return undefined;

    return {
      callback: function (cb) {
        window.D9v = {
          UserID: '99999999999999',
          CampID: '3175',
          CCampID: '148556'
        };
        window.D9r = {
          callback: function(response) {
            if (response) {
              storage.setDataInLocalStorage(`${FTRACK_STORAGE_NAME}_exp`, (new Date(Date.now() + (1000 * 60 * 60 * 24 * LOCAL_STORAGE_EXP_DAYS))).toUTCString());
              storage.setDataInLocalStorage(`${FTRACK_STORAGE_NAME}`, JSON.stringify(response));

              storage.setDataInLocalStorage(`${FTRACK_PRIVACY_STORAGE_NAME}_exp`, (new Date(Date.now() + (1000 * 60 * 60 * 24 * LOCAL_STORAGE_EXP_DAYS))).toUTCString());
              storage.setDataInLocalStorage(`${FTRACK_PRIVACY_STORAGE_NAME}`, JSON.stringify(consentInfo));
            };

            if (typeof cb === 'function') cb(response);

            return response;
          }
        };

        // If config.params.ids does not exist, set defaults
        if (!config.params.hasOwnProperty('ids')) {
          window.D9r.DeviceID = true;
          window.D9r.SingleDeviceID = true;
        } else {
          if (config.params.ids.hasOwnProperty('device id') && config.params.ids['device id'] === true) {
            window.D9r.DeviceID = true;
          }
          if (config.params.ids.hasOwnProperty('single device id') && config.params.ids['single device id'] === true) {
            window.D9r.SingleDeviceID = true;
          }
          if (config.params.ids.hasOwnProperty('household id') && config.params.ids['household id'] === true) {
            window.D9r.HHID = true;
          }
        }

        // Creates an async script element and appends it to the document
        loadExternalScript(config.params.url, MODULE_TYPE_UID, MODULE_NAME);
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

    if (!config.hasOwnProperty('params') || !config.params.hasOwnProperty('url')) {
      utils.logWarn(LOG_PREFIX + 'config.params.url is required for ftrack to run.');
      return false;
    }

    return true;
  },

  isThereConsent: function(consentData) {
    let consentValue = true;
    const {gdpr, usp} = consentData ?? {};
    /*
     * Scenario 1: GDPR
     *   if GDPR Applies is true|1, we do not have consent
     *   if GDPR Applies does not exist or is false|0, we do not NOT have consent
     */
    if (gdpr?.gdprApplies === true || gdpr?.gdprApplies === 1) {
      consentInfo.gdpr.applies = 1;
      consentValue = false;
    }
    // If consentString exists, then we store it even though we are not using it
    if (typeof gdpr?.consentString !== 'undefined' && !utils.isEmpty(gdpr.consentString) && !utils.isEmptyStr(gdpr.consentString)) {
      consentInfo.gdpr.consentString = consentData.consentString;
    }

    /*
     * Scenario 2: CCPA/us_privacy
     *   if usp exists (assuming this check determines the location of the device to be within the California)
     *     parse the us_privacy string to see if we have consent
     *     for version 1 of us_privacy strings, if 'Opt-Out Sale' is 'Y' we do not track
     */
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
    if (usPrivacyVersion === '1' && usPrivacyOptOutSale === 'Y') consentValue = false;

    return consentValue;
  },
  eids: {
    'ftrackId': {
      source: 'flashtalking.com',
      atype: 1,
      getValue: function(data) {
        let value = '';
        if (data && data.ext && data.ext.DeviceID) {
          value = data.ext.DeviceID;
        }
        return value;
      },
      getUidExt: function(data) {
        return data && data.ext;
      }
    },
  }
};

submodule('userId', ftrackIdSubmodule);
