/**
 * This module adds JustId to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/justIdSystem
 * @requires module:modules/userId
 */

import * as utils from '../src/utils.js'
import { submodule } from '../src/hook.js'
import { loadExternalScript } from '../src/adloader.js'
import {includes} from '../src/polyfill.js';

/**
 * @typedef {import('../modules/userId/index.js').Submodule} Submodule
 * @typedef {import('../modules/userId/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/userId/index.js').ConsentData} ConsentData
 * @typedef {import('../modules/userId/index.js').IdResponse} IdResponse
 */

const MODULE_NAME = 'justId';
const EXTERNAL_SCRIPT_MODULE_CODE = 'justtag';
const LOG_PREFIX = 'User ID - JustId submodule: ';
const GVLID = 160;
const DEFAULT_PARTNER = 'pbjs-just-id-module';
const DEFAULT_ATM_VAR_NAME = '__atm';

const MODE_BASIC = 'BASIC';
const MODE_COMBINED = 'COMBINED';
const DEFAULT_MODE = MODE_BASIC;

export const EX_URL_REQUIRED = new Error(`params.url is required in ${MODE_COMBINED} mode`);
export const EX_INVALID_MODE = new Error(`Invalid params.mode. Allowed values: ${MODE_BASIC}, ${MODE_COMBINED}`);

/** @type {Submodule} */
export const justIdSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * required for the gdpr enforcement module
   */
  gvlid: GVLID,

  /**
   * decode the stored id value for passing to bid requests
   * @function
   * @param {{uid:string}} value
   * @returns {{justId:string}}
   */
  decode(value) {
    utils.logInfo(LOG_PREFIX, 'decode', value);
    const justId = value && value.uid;
    return justId && {justId: justId};
  },

  /**
   * performs action to obtain id and return a value in the callback's response argument
   * @function
   * @param {SubmoduleConfig} config
   * @param {ConsentData} consentData
   * @param {(Object|undefined)} cacheIdObj
   * @returns {IdResponse|undefined}
   */
  getId(config, consentData, cacheIdObj) {
    utils.logInfo(LOG_PREFIX, 'getId', config, consentData, cacheIdObj);

    var configWrapper
    try {
      configWrapper = new ConfigWrapper(config);
    } catch (e) {
      utils.logError(LOG_PREFIX, e);
    }

    return configWrapper && {
      callback: function(cbFun) {
        try {
          utils.logInfo(LOG_PREFIX, 'fetching uid...');

          var uidProvider = configWrapper.isCombinedMode()
            ? new CombinedUidProvider(configWrapper, consentData, cacheIdObj)
            : new BasicUidProvider(configWrapper);

          uidProvider.getUid(justId => {
            if (utils.isEmptyStr(justId)) {
              utils.logError(LOG_PREFIX, 'empty uid!');
              cbFun();
              return;
            }
            cbFun({uid: justId});
          }, err => {
            utils.logError(LOG_PREFIX, 'error during fetching', err);
            cbFun();
          });
        } catch (e) {
          utils.logError(LOG_PREFIX, 'Error during fetching...', e);
        }
      }
    };
  },
  eids: {
    'justId': {
      source: 'justtag.com',
      atype: 1
    },
  }
};

export const ConfigWrapper = function(config) {
  this.getConfig = function() {
    return config;
  }

  this.getMode = function() {
    return (params().mode || DEFAULT_MODE).toUpperCase();
  }

  this.getPartner = function() {
    return params().partner || DEFAULT_PARTNER;
  }

  this.isCombinedMode = function() {
    return this.getMode() === MODE_COMBINED;
  }

  this.getAtmVarName = function() {
    return params().atmVarName || DEFAULT_ATM_VAR_NAME;
  }

  this.getUrl = function() {
    const u = params().url;
    const url = new URL(u);
    url.searchParams.append('sourceId', this.getPartner());
    return url.toString();
  }

  function params() {
    return config.params || {};
  }

  // validation
  if (!includes([MODE_BASIC, MODE_COMBINED], this.getMode())) {
    throw EX_INVALID_MODE;
  }

  var url = params().url;
  if (this.isCombinedMode() && (utils.isEmptyStr(url) || !utils.isStr(url))) {
    throw EX_URL_REQUIRED;
  }
}

const CombinedUidProvider = function(configWrapper, consentData, cacheIdObj) {
  const url = configWrapper.getUrl();

  this.getUid = function(idCallback, errCallback) {
    const scriptTag = loadExternalScript(url, EXTERNAL_SCRIPT_MODULE_CODE, () => {
      utils.logInfo(LOG_PREFIX, 'script loaded', url);

      const eventDetails = {
        detail: {
          config: configWrapper.getConfig(),
          consentData: consentData,
          cacheIdObj: cacheIdObj
        }
      }

      scriptTag.dispatchEvent(new CustomEvent('prebidGetId', eventDetails));
    })

    scriptTag.addEventListener('justIdReady', event => {
      utils.logInfo(LOG_PREFIX, 'received justId', event);
      idCallback(event.detail && event.detail.justId);
    });

    scriptTag.onerror = errCallback;
  }
}

const BasicUidProvider = function(configWrapper) {
  const atmVarName = configWrapper.getAtmVarName();

  this.getUid = function(idCallback, errCallback) {
    var atm = getAtm();
    if (typeof atm !== 'function') { // it may be AsyncFunction, so we can't use utils.isFn
      utils.logInfo(LOG_PREFIX, 'ATM function not found!', atmVarName, atm);
      errCallback('ATM not found');
      return
    }

    atm = function() { // stub is replaced after ATM is loaded so we must refer them directly by global variable
      return getAtm().apply(this, arguments);
    }

    atm('getReadyState', () => {
      Promise.resolve(atm('getVersion')) // atm('getVersion') returns string || Promise<string>
        .then(atmVersion => {
          utils.logInfo(LOG_PREFIX, 'ATM Version', atmVersion);
          if (utils.isStr(atmVersion)) { // getVersion command was introduced in same ATM version as getUid command
            atm('getUid', idCallback);
          } else {
            errCallback('ATM getUid not supported');
          }
        })
    });
  }

  function getAtm() {
    return jtUtils.getAtm(atmVarName);
  }
}

export const jtUtils = {
  getAtm(atmVarName) {
    return window[atmVarName];
  }
}

submodule('userId', justIdSubmodule);
