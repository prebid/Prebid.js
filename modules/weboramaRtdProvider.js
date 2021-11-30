/**
 * This module adds Weborama provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch contextual data (page-centric) from Weborama server
 * and may access user-centric data from local storage
 * @module modules/weboramaRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef {Object} ModuleParams
 * @property {WeboCtxConf} weboCtxConf
 * @property {WeboUserDataConf} weboUserDataConf
 */

/**
 * @typedef {Object} WeboCtxConf
 * @property {string} token required token to be used on bigsea contextual API requests
 * @property {?string} targetURL specify the target url instead use the referer
 * @property {?Boolean} setPrebidTargeting if true will set the GAM targeting (default true)
 * @property {?Boolean} sendToBidders if true, will send the contextual profile to all bidders (default true)
 * @property {?object} defaultProfile to be used if the profile is not found
 */

/**
 * @typedef {Object} WeboUserDataConf
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
 * @property {?Boolean} setPrebidTargeting if true will set the GAM targeting (default true)
 * @property {?Boolean} sendToBidders if true, will send the contextual profile to all bidders (default true)
 * @property {?object} defaultProfile to be used if the profile is not found
 */

import {
  getGlobal
} from '../src/prebidGlobal.js';
import {
  deepSetValue,
  deepAccess,
  isEmpty,
  mergeDeep,
  logError,
  tryAppendQueryString,
  logMessage
} from '../src/utils.js';
import {
  submodule
} from '../src/hook.js';
import {
  ajax
} from '../src/ajax.js';
import {
  getStorageManager
} from '../src/storageManager.js';

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
let _weboContextualProfile = null;

/** @type {Boolean} */
let _weboCtxInitialized = false;

/** @type {null|Object} */
let _weboUserDataUserProfile = null;

/** @type {Boolean} */
let _weboUserDataInitialized = false;

/** Initialize module
 * @param {object} moduleConfig
 * @return {Boolean} true if module was initialized with success
 */
function init(moduleConfig) {
  moduleConfig = moduleConfig || {};
  const moduleParams = moduleConfig.params || {};
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const weboUserDataConf = moduleParams.weboUserDataConf;

  _weboCtxInitialized = initWeboCtx(weboCtxConf);
  _weboUserDataInitialized = initWeboUserData(weboUserDataConf);

  return _weboCtxInitialized || _weboUserDataInitialized;
}

/** Initialize contextual sub module
 * @param {WeboCtxConf} weboCtxConf
 * @return {Boolean} true if sub module was initialized with success
 */
function initWeboCtx(weboCtxConf) {
  _weboCtxInitialized = false;
  _weboContextualProfile = null;

  if (!weboCtxConf.token) {
    logError('missing param "token" for weborama contextual sub module initialization');
    return false;
  }

  return true;
}

/** Initialize weboUserData sub module
 * @param {WeboUserDataConf} weboUserDataConf
 * @return {Boolean} true if sub module was initialized with success
 */
function initWeboUserData(weboUserDataConf) {
  _weboUserDataInitialized = false;
  _weboUserDataUserProfile = null;

  return !!weboUserDataConf;
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
  const weboUserDataConf = moduleParams.weboUserDataConf || {};
  const weboCtxConfTargeting = weboCtxConf.setPrebidTargeting !== false;
  const weboUserDataConfTargeting = weboUserDataConf.setPrebidTargeting !== false;

  try {
    const profile = getCompleteProfile(moduleParams, weboCtxConfTargeting, weboUserDataConfTargeting);

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
 * @param {Boolean} weboUserDataConfTargeting
 * @returns {Object} complete profile
 */
function getCompleteProfile(moduleParams, weboCtxConfTargeting, weboUserDataConfTargeting) {
  const profile = {};

  if (weboCtxConfTargeting) {
    const contextualProfile = getContextualProfile(moduleParams.weboCtxConf || {});
    mergeDeep(profile, contextualProfile);
  }

  if (weboUserDataConfTargeting) {
    const weboUserDataProfile = getWeboUserDataProfile(moduleParams.weboUserDataConf || {});
    mergeDeep(profile, weboUserDataProfile);
  }

  return profile;
}

/** return contextual profile
 * @param {WeboCtxConf} weboCtxConf
 * @returns {Object} contextual profile
 */
function getContextualProfile(weboCtxConf) {
  const defaultContextualProfile = weboCtxConf.defaultProfile || {};
  return _weboContextualProfile || defaultContextualProfile;
}

/** return weboUserData profile
 * @param {WeboUserDataConf} weboUserDataConf
 * @returns {Object} weboUserData profile
 */
function getWeboUserDataProfile(weboUserDataConf) {
  const weboUserDataDefaultUserProfile = weboUserDataConf.defaultProfile || {};

  if (storage.localStorageIsEnabled() && !_weboUserDataUserProfile) {
    const localStorageProfileKey = weboUserDataConf.localStorageProfileKey || DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY;

    const entry = storage.getDataFromLocalStorage(localStorageProfileKey);
    if (entry) {
      const data = JSON.parse(entry);
      if (data && Object.keys(data).length > 0) {
        _weboUserDataUserProfile = data[LOCAL_STORAGE_USER_TARGETING_SECTION];
      }
    }
  }

  return _weboUserDataUserProfile || weboUserDataDefaultUserProfile;
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

    setWeboContextualProfile(data);
  }, () => {
    handleBidRequestData(adUnits, moduleParams);

    onDone();
  });
}

/** function that handles bid request data
 * @param {Object[]} adUnits
 * @param {ModuleParams} moduleParams
 * @returns {void}
 */

function handleBidRequestData(adUnits, moduleParams) {
  const weboCtxConf = moduleParams.weboCtxConf || {};
  const weboUserDataConf = moduleParams.weboUserDataConf || {};
  const weboCtxConfTargeting = weboCtxConf.sendToBidders !== false;
  const weboUserDataConfTargeting = weboUserDataConf.sendToBidders !== false;
  const profile = getCompleteProfile(moduleParams, weboCtxConfTargeting, weboUserDataConfTargeting);

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

/** handle individual bid
 * @param {Object} adUnit
 * @param {Object} profile
 * @param {Object} bid
 * @returns {void}
 */
function handleBid(adUnit, profile, bid) {
  const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

  logMessage('handle bidder', bidder, bid);

  switch (bidder) {
    case SMARTADSERVER:
      handleSmartadserverBid(adUnit, profile, bid);

      break;
  }
}

/** handle smartadserver bid
 * @param {Object} adUnit
 * @param {Object} profile
 * @param {Object} bid
 * @returns {void}
 */
function handleSmartadserverBid(adUnit, profile, bid) {
  const target = [];

  if (deepAccess(bid, 'params.target')) {
    target.push(bid.params.target.split(';'));
  }

  Object.keys(profile).forEach(key => {
    profile[key].forEach(value => {
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
export function setWeboContextualProfile(data) {
  if (data && Object.keys(data).length > 0) {
    _weboContextualProfile = data;
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
    success: function(response, req) {
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
    error: function() {
      onDone();
      logError('unable to get weborama data');
    }
  },
  null, {
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
