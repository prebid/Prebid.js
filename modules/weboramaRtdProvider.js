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
* @property {?Boolean} setGAMTargeting if true will set the GAM targeting (default true)
* @property {?Boolean} sendToBidders if true, will send the contextual profile to all bidders (default true)
* @property {?object} defaultProfile to be used if the profile is not found
*/

/**
* @typedef {Object} Wam2gamConf
* @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
* @property {?Boolean} setGAMTargeting if true will set the GAM targeting (default true)
* @property {?Boolean} sendToBidders if true, will send the contextual profile to all bidders (default true)
* @property {?object} defaultProfile to be used if the profile is not found
*/

import {getGlobal} from '../src/prebidGlobal.js';
import { deepSetValue, deepAccess, isEmpty, mergeDeep, logError, tryAppendQueryString, logMessage } from '../src/utils.js';
import {submodule} from '../src/hook.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';

const adapterManager = require('../src/adapterManager.js').default;

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {string} */
const SUBMODULE_NAME = 'weborama';
/** @type {string} */
export const DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY = 'webo_wam2gam_entry';
/** @type {string} */
const LOCAL_STORAGE_USER_TARGETING_SECTION = 'targeting';
/** @type {number} */
const GVLID = 284;
/** @type {object} */
export const storage = getStorageManager(GVLID, SUBMODULE_NAME);

/** @type {null|Object} */
let _bigseaContextualProfile = null;

/** @type {Boolean} */
let _weboCtxInitialized = false;

/** @type {null|Object} */
let _wam2gamUserProfile = null;

/** @type {Boolean} */
let _wam2gamInitialized = false;

/** Initialize module
 * @param {object} moduleConfig
 * @return {Boolean} true if module was initialized with success
 */
function init(moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const wam2gamConf = moduleParams.wam2gamConf;

  _weboCtxInitialized = initWeboCtx(weboCtxConf);
  _wam2gamInitialized = initWam2gam(wam2gamConf);

  return _weboCtxInitialized || _wam2gamInitialized;
}

/** Initialize contextual sub module
 * @param {WeboCtxConf} weboCtxConf
 * @return {Boolean} true if sub module was initialized with success
 */
function initWeboCtx(weboCtxConf) {
  _weboCtxInitialized = false;
  _bigseaContextualProfile = null;

  if (!weboCtxConf.token) {
    logError('missing param "token" for weborama contextual sub module initialization');
    return false;
  }

  return true;
}

/** Initialize wam2gam sub module
 * @param {?Wam2gamConf} wam2gamConf
 * @return {Boolean} true if sub module was initialized with success
 */
function initWam2gam(wam2gamConf) {
  _wam2gamInitialized = false;
  _wam2gamUserProfile = null;

  return !!wam2gamConf;
}

/** function that provides ad server targeting data to RTD-core
* @param {Array} adUnitsCodes
* @param {Object} moduleConfig
* @returns {Object} target data
 */
function getTargetingData(adUnitsCodes, moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const wam2gamConf = moduleParams.wam2gamConf || {};
  const weboCtxConfTargeting = weboCtxConf.setGAMTargeting !== false;
  const wam2gamConfTargeting = wam2gamConf.setGAMTargeting !== false;

  try {
    const profile = getCompleteProfile(moduleParams, weboCtxConfTargeting, wam2gamConfTargeting);

    if (isEmpty(profile)) {
      return {};
    }

    const td = adUnitsCodes.reduce((data, adUnitCode) => {
      if (adUnitCode) {
        data[adUnitCode] = profile;
      }
      return data;
    }, {});

    return td;
  } catch (e) {
    logError('unable to format weborama rtd targeting data', e);
    return {};
  }
}

/** function that provides complete profile formatted to be used
* @param {ModuleParams} moduleParams
* @param {Boolean} weboCtxConfTargeting
* @param {Boolean} wam2gamConfTargeting
* @returns {Object} complete profile
*/
function getCompleteProfile(moduleParams, weboCtxConfTargeting, wam2gamConfTargeting) {
  const profile = {};

  if (weboCtxConfTargeting) {
    const contextualProfile = getContextualProfile(moduleParams.weboCtxConf || {});
    mergeDeep(profile, contextualProfile);
  }

  if (wam2gamConfTargeting) {
    const wam2gamProfile = getWam2gamProfile(moduleParams.wam2gamConf || {});
    mergeDeep(profile, wam2gamProfile);
  }

  return profile;
}

/** return contextual profile
 * @param {WeboCtxConf} weboCtxConf
 * @returns {Object} contextual profile
 */
function getContextualProfile(weboCtxConf) {
  const defaultContextualProfile = weboCtxConf.defaultProfile || {};
  return _bigseaContextualProfile || defaultContextualProfile;
}

/** return wam2gam profile
 * @param {Wam2gamConf} wam2gamConf
 * @returns {Object} wam2gam profile
 */
function getWam2gamProfile(wam2gamConf) {
  const wam2gamDefaultUserProfile = wam2gamConf.defaultProfile || {};

  if (storage.localStorageIsEnabled() && !_wam2gamUserProfile) {
    const localStorageProfileKey = wam2gamConf.localStorageProfileKey || DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY;

    const entry = storage.getDataFromLocalStorage(localStorageProfileKey);
    if (entry) {
      const data = JSON.parse(entry);
      if (data && Object.keys(data).length > 0) {
        _wam2gamUserProfile = data[LOCAL_STORAGE_USER_TARGETING_SECTION];
      }
    }
  }

  return _wam2gamUserProfile || wam2gamDefaultUserProfile;
}

/** function that will allow RTD sub-modules to modify the AdUnit object for each auction
* @param {Object} reqBidsConfigObj
* @param {doneCallback} onDone
* @param {Object} moduleConfig
* @returns {void}
*/
export function getBidRequestData(reqBidsConfigObj, onDone, moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};

  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;

  if (!_weboCtxInitialized) {
    handleBidRequestData(adUnits, moduleParams);

    onDone();

    return;
  }

  fetchContextualProfile(weboCtxConf, (data) => {
    logMessage('fetchContextualProfile on getBidRequestData is done');

    setBigseaContextualProfile(data);
  }, () => {
    handleBidRequestData(adUnits, moduleParams);

    onDone();
  });
}

function handleBidRequestData(adUnits, moduleParams) {
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const wam2gamConf = moduleParams.wam2gamConf || {};
  const weboCtxConfTargeting = weboCtxConf.sendToBidders !== false;
  const wam2gamConfTargeting = wam2gamConf.sendToBidders !== false;
  const profile = getCompleteProfile(moduleParams, weboCtxConfTargeting, wam2gamConfTargeting);

  if (isEmpty(profile)) {
    return;
  }

  adUnits.forEach(adUnit => {
    if (adUnit.hasOwnProperty('bids')) {
      adUnit.bids.forEach(bid => handleBid(adUnit, profile, bid));
    }
  });
}

/** @type {string} */
const SMARTADSERVER = 'smartadserver';

/** @type {Object} */
const bidderAliasRegistry = adapterManager.aliasRegistry || {};

function handleBid(adUnit, profile, bid) {
  const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

  logMessage('handle bidder', bidder, bid);

  switch (bidder) {
    case SMARTADSERVER:
      handleSmartadserverBid(adUnit, profile, bid);

      break;
  }
}

function handleSmartadserverBid(adUnit, completeProfile, bid) {
  const target = [];

  if (deepAccess(bid, 'params.target')) {
    target.push(bid.params.target.split(';'));
  }

  Object.keys(completeProfile).forEach(key => {
    completeProfile[key].forEach(value => {
      const keyword = `${key}=${value}`;
      if (target.indexOf(keyword) === -1) {
        target.push(keyword);
      }
    });
  });

  deepSetValue(bid, 'params.target', target.join(';'));
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
          throw e;
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

export const weboramaSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getTargetingData: getTargetingData,
  getBidRequestData: getBidRequestData,
};

submodule(MODULE_NAME, weboramaSubmodule);
