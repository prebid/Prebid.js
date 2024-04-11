/**
 * This module adds lockr AIM ID support to the User ID module
 * The {@link module:modules/userId} module is required.
 * @module modules/lockrAIMIdSystem
 * @requires module:modules/userId
 */

import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logInfo, logWarn } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { gppDataHandler } from '../src/adapterManager.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').lockrAIMId} lockrAIMId
 */

const MODULE_NAME = 'lockrAIMId'
const LOG_PRE_FIX = 'lockr-AIM: ';

const AIM_PROD_URL = 'https://identity.loc.kr';

export const lockrAIMCodeVersion = '1.0';

export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: MODULE_NAME })

function createLogger(logger, prefix) {
  return function (...strings) {
    logger(prefix + ' ', ...strings);
  }
}

const _logInfo = createLogger(logInfo, LOG_PRE_FIX);
const _logWarn = createLogger(logWarn, LOG_PRE_FIX);

/** @type {Submodule} */
export const lockrAIMSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,

  init() {
    _logInfo('lockrAIM Initialization complete');
  },

  /**
   * performs action to obtain id and return a value.
   * @function
   * @param {SubmoduleConfig} [config]
   * @param {ConsentData|undefined} consentData
   * @returns {lockrAIMId}
   */
  getId(config, consentData) {
    if (consentData?.gdprApplies === true) {
      _logWarn('lockrAIM is not intended for use where GDPR applies. The lockrAIM module will not run');
      return undefined;
    }

    const gppConsent = gppDataHandler.getConsentData();
    let gppString = '';
    if (gppConsent) {
      gppString = gppConsent.gppString;
    }
    const mappedConfig = {
      appID: config?.params?.appID,
      email: config?.params?.email,
      baseUrl: AIM_PROD_URL,
    };

    _logInfo('lockr AIM configurations loaded and mapped.', mappedConfig);
    if (!mappedConfig.appID || !mappedConfig.email) {
      return undefined;
    }
    const tokenGenerator = new LockrAIMApiClient(mappedConfig, _logInfo, _logWarn, storage, gppString);
    const result = tokenGenerator.generateToken();
    _logInfo('lockr AIM results generated');
    return result;
  }
}

class LockrAIMApiClient {
  static expiryDateKeys = [];
  static canRefreshToken = false;

  constructor(opts, logInfo, logWarn, prebidStorageManager, gppString) {
    this._baseUrl = opts.baseUrl;
    this._appID = opts.appID;
    this._email = opts.email;
    this._logInfo = logInfo;
    this._logWarn = logWarn;
    this._gppString = gppString;
    this.prebidStorageManager = prebidStorageManager;
    LockrAIMApiClient.expiryDateKeys = this.prebidStorageManager.getDataFromLocalStorage('lockr_expiry_keys') ? JSON.parse(this.prebidStorageManager.getDataFromLocalStorage('lockr_expiry_keys')) : []
    this.initializeRefresher();
  }

  async generateToken(type = 'email', value) {
    const url = this._baseUrl + '/publisher/app/v1/identityLockr/generate-tokens';
    let rejectPromise;
    const promise = new Promise((resolve, reject) => {
      rejectPromise = reject;
    });
    const requestBody = {
      appID: this._appID,
      data: {
        type: type,
        value: value ?? this._email,
        gppString: this._gppString,
      }
    }
    this._logInfo('Sending the token generation request')
    ajax(url, {
      success: (responseText) => {
        try {
          const response = JSON.parse(responseText);
          LockrAIMApiClient.canRefreshToken = false;
          const token = response.lockrMappingToken;
          this.prebidStorageManager.setDataInLocalStorage('ilui', token);
          response.data.forEach(cookieitem => {
            const settings = cookieitem?.settings;
            this.prebidStorageManager.setDataInLocalStorage(`${cookieitem.key_name}_expiry`, cookieitem.identity_expires);
            if (!LockrAIMApiClient.expiryDateKeys.includes(`${cookieitem.key_name}_expiry`)) {
              LockrAIMApiClient.expiryDateKeys.push(`${cookieitem.key_name}_expiry`);
            }
            this.prebidStorageManager.setDataInLocalStorage('lockr_expiry_keys', JSON.stringify(LockrAIMApiClient.expiryDateKeys));
            if (!settings?.dropLocalStorage) {
              this.prebidStorageManager.setDataInLocalStorage(cookieitem.key_name, cookieitem.advertising_token);
            }
            if (!settings?.dropCookie) {
              this.prebidStorageManager.setCookie(cookieitem.key_name, cookieitem.advertising_token);
            }
          });
          LockrAIMApiClient.canRefreshToken = true;
          return;
        } catch (_err) {
          this._logWarn(_err);
          rejectPromise(responseText);
          LockrAIMApiClient.canRefreshToken = true;
        }
      }
    }, JSON.stringify(requestBody), { method: 'POST', contentType: 'application/json;charset=UTF-8' });
    return promise;
  }

  async initializeRefresher() {
    setInterval(() => {
      LockrAIMApiClient.expiryDateKeys.forEach(expiryItem => {
        const currentMillis = new Date().getTime();
        const dateMillis = this.prebidStorageManager.getDataFromLocalStorage(expiryItem);
        if (currentMillis > dateMillis && dateMillis !== null && this.prebidStorageManager.getDataFromLocalStorage('ilui') && LockrAIMApiClient.canRefreshToken) {
          this.generateToken('refresh', this.prebidStorageManager.getDataFromLocalStorage('ilui'));
        }
      })
    }, 1000);
  }
}

// Register submodule for userId
submodule('userId', lockrAIMSubmodule);
