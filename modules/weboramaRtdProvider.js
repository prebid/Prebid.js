/**
 * This module adds Weborama provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch contextual data (page-centric) from Weborama server
 * @module modules/weboramaRtdProvider
 * @requires module:modules/realTimeData
 */

/**
* @typedef {Object} ModuleParams
* @property {WeboCtxConf} weboCtxConf
* @property {Wam2gamConf} wam2gamConf
*/

/**
* @typedef {Object} WeboCtxConf
* @property {string} token required token to be used on bigsea contextual API requests
* @property {?string} targetURL specify the target url instead use the referer
* @property {?boolean} setTargeting if true will set the GAM targeting (default true)
* @property {?object} defaultProfile to be used if the profile is not found
* @property {?object} setOrtb2 if true will set the global ortb2 configuration (default false)
*/

/**
* @typedef {Object} Wam2gamConf
* @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
* @property {?boolean} setTargeting if true will set the GAM targeting (default true)
* @property {?object} defaultProfile to be used if the profile is not found
* @property {?object} setOrtb2 if true will set the global ortb2 configuration (default false)
*/

import { deepSetValue, mergeDeep, logError, tryAppendQueryString, logMessage } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {config} from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {string} */
const SUBMODULE_NAME = 'weborama';
/** @type {string} */
const WEBO_CTX = 'webo_ctx';
/** @type {string} */
const WEBO_DS = 'webo_ds';
/** @type {string} */
const WEBO_CS = 'webo_cs';
/** @type {string} */
const WEBO_AUDIENCES = 'webo_audiences';
/** @type {string} */
const DefaultLocalStorageUserProfileKey = 'webo_wam2gam_entry';
/** @type {string} */
const LOCAL_STORAGE_USER_TARGETING_SECTION = 'targeting';
/** @type {number} */
const GVLID = 284;
/** @type {object} */
const storage = getStorageManager(GVLID, SUBMODULE_NAME);

/** @type {null|Object} */
let _bigseaContextualProfile = null;

/** @type {null|Object} */
let _wam2gamUserProfile = null;

/** function that provides ad server targeting data to RTD-core
* @param {Array} adUnitsCodes
* @param {Object} moduleConfig
* @returns {Object} target data
 */
function getTargetingData(adUnitsCodes, moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const defaultContextualProfile = weboCtxConf.defaultProfile || {};
  const contextualProfile = _bigseaContextualProfile || defaultContextualProfile;
  const wam2gamConf = moduleParams.wam2gamConf || {};
  const wam2gamDefaultUserProfile = wam2gamConf.defaultProfile || {};
  const wam2gamProfile = _wam2gamUserProfile || wam2gamDefaultUserProfile;

  if (weboCtxConf.setOrtb2) {
    const ortb2 = config.getConfig('ortb2') || {};
    if (contextualProfile[WEBO_CTX]) {
      deepSetValue(ortb2, 'site.ext.data.webo_ctx', contextualProfile[WEBO_CTX]);
    }
    if (contextualProfile[WEBO_DS]) {
      deepSetValue(ortb2, 'site.ext.data.webo_ds', contextualProfile[WEBO_DS]);
    }
    config.setConfig({ortb2: ortb2});
  }

  if (wam2gamConf.setOrtb2) {
    const ortb2 = config.getConfig('ortb2') || {};
    if (wam2gamProfile[WEBO_CS]) {
      deepSetValue(ortb2, 'user.ext.data.webo_cs', wam2gamProfile[WEBO_CS]);
    }
    if (wam2gamProfile[WEBO_AUDIENCES]) {
      deepSetValue(ortb2, 'user.ext.data.webo_audiences', wam2gamProfile[WEBO_AUDIENCES]);
    }
    config.setConfig({ortb2: ortb2});
  }

  let profile = {};

  if (weboCtxConf.setTargeting !== false) {
    mergeDeep(profile, contextualProfile);
  }

  if (wam2gamConf.setTargeting !== false) {
    mergeDeep(profile, wam2gamProfile);
  }

  if (!profile || Object.keys(profile).length == 0) {
    return {};
  }

  try {
    const formattedProfile = profile;
    const r = adUnitsCodes.reduce((rp, adUnitCode) => {
      if (adUnitCode) {
        rp[adUnitCode] = formattedProfile;
      }
      return rp;
    }, {});
    return r;
  } catch (e) {
    logError('unable to format weborama rtd targeting data', e);
    return {};
  }
}

/** set bigsea contextual profile on module state
 * @param {null|Object} data
 * @returns {void}
 */
export function setBigseaContextualProfile(data) {
  if (data && Object.keys(data).length > 0) {
    _bigseaContextualProfile = data;
  }
}

/** set wam2gam user profile on module state
 * @param {null|Object} data
 * @returns {void}
 */
export function setWam2gamUserProfile(data) {
  if (data && Object.keys(data).length > 0) {
    _wam2gamUserProfile = data;
  }
}

/** onSuccess callback type
 * @callback successCallback
 * @param {null|Object} data
 * @returns {void}
 */

/** onDone callback type
  * @callback doneCallback
  * @returns {void}
  */

/** Fetch Bigsea Contextual Profile
 * @param {WeboCtxConf} weboCtxConf
 * @param {successCallback} onSuccess callback
 * @param {doneCallback} onDone callback
 * @returns {void}
 */
function fetchContextualProfile(weboCtxConf, onSuccess, onDone) {
  const targetURL = weboCtxConf.targetURL || document.URL;
  const token = weboCtxConf.token;

  let queryString = '';
  queryString = tryAppendQueryString(queryString, 'token', token);
  queryString = tryAppendQueryString(queryString, 'url', targetURL);

  const url = 'https://ctx.weborama.com/api/profile?' + queryString;

  ajax(url, {
    success: function (response, req) {
      if (req.status === 200) {
        try {
          const data = JSON.parse(response);
          onSuccess(data);
          onDone();
        } catch (e) {
          onDone();
          logError('unable to parse weborama data', e);
        }
      } else if (req.status === 204) {
        onDone();
      }
    },
    error: function () {
      onDone();
      logError('unable to get weborama data');
    }
  },
  null,
  {
    method: 'GET',
    withCredentials: false,
  });
}

/** Initialize module
 * @param {object} moduleConfig
 * @return {boolean} true if module was initialized with success
 */
function init(moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const wam2gamConf = moduleParams.wam2gamConf;

  const weboCtxInitialized = initWeboCtx(weboCtxConf);
  const wam2gamInitialized = initWam2gam(wam2gamConf);

  return weboCtxInitialized || wam2gamInitialized;
}

/** Initialize contextual sub module
 * @param {WeboCtxConf} weboCtxConf
 * @return {boolean} true if sub module was initi  _bigseaContextualProfile = null;
alized with success
 */
function initWeboCtx(weboCtxConf) {
  _bigseaContextualProfile = null;

  if (weboCtxConf.token) {
    fetchContextualProfile(weboCtxConf, setBigseaContextualProfile,
      () => logMessage('fetchContextualProfile on init is done'));
  } else {
    logError('missing param "token" for weborama contextual sub module initialization');
    return false;
  }

  return true;
}

/** Initialize wam2gam sub module
 * @param {?Wam2gamConf} wam2gamConf
 * @return {boolean} true if sub module was initialized with success
 */
function initWam2gam(wam2gamConf) {
  _wam2gamUserProfile = null;

  if (!wam2gamConf) {
    return false;
  }

  if (!storage.localStorageIsEnabled()) {
    return false;
  }

  const localStorageProfileKey = wam2gamConf.localStorageProfileKey || DefaultLocalStorageUserProfileKey;

  const data = JSON.parse(storage.getDataFromLocalStorage(localStorageProfileKey)) || {};

  setWam2gamUserProfile(data[LOCAL_STORAGE_USER_TARGETING_SECTION]);

  return true;
}

export const weboramaSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getTargetingData: getTargetingData,
};

submodule(MODULE_NAME, weboramaSubmodule);
