/**
 * This module adds Weborama provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch contextual data (page-centric) from Weborama server
 * and may access user-centric data from local storage
 * @module modules/weboramaRtdProvider
 * @requires module:modules/realTimeData
 */

/** onData callback type
 * @callback dataCallback
 * @param {Object} data profile data
 * @param {Boolean} site true if site, else it is user
 * @returns {void}
 */

/**
 * @typedef {Object} ModuleParams
 * @property {?Boolean} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?Boolean} sendToBidders if true, will send the contextual profile to all bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?WeboCtxConf} weboCtxConf
 * @property {?WeboUserDataConf} weboUserDataConf
 */

/**
 * @typedef {Object} WeboCtxConf
 * @property {string} token required token to be used on bigsea contextual API requests
 * @property {?string} targetURL specify the target url instead use the referer
 * @property {?Boolean} setPrebidTargeting if true, will set the GAM targeting (default params.setPrebidTargeting or true)
 * @property {?Boolean} sendToBidders if true, will send the contextual profile to all bidders (default params.sendToBidders or true)
 * @property {?dataCallback} onData callback
 * @property {?object} defaultProfile to be used if the profile is not found
 * @property {?Boolean} enabled if false, will ignore this configuration
 */

/**
 * @typedef {Object} WeboUserDataConf
 * @property {?number} accountId wam account id
 * @property {?Boolean} setPrebidTargeting if true, will set the GAM targeting (default params.setPrebidTargeting or true)
 * @property {?Boolean} sendToBidders if true, will send the user-centric profile to all bidders (default params.sendToBidders or true)
 * @property {?object} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
 * @property {?Boolean} enabled if false, will ignore this configuration
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
  logWarn,
  tryAppendQueryString,
  logMessage,
  isFn
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
export const storage = getStorageManager({gvlid: GVLID, moduleName: SUBMODULE_NAME});

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
  const weboCtxConf = moduleParams.weboCtxConf;
  const weboUserDataConf = moduleParams.weboUserDataConf;

  _weboCtxInitialized = initWeboCtx(moduleParams, weboCtxConf);
  _weboUserDataInitialized = initWeboUserData(moduleParams, weboUserDataConf);

  return _weboCtxInitialized || _weboUserDataInitialized;
}

/** Initialize contextual sub module
 * @param {ModuleParams} moduleParams
 * @param {WeboCtxConf} weboCtxConf
 * @return {Boolean} true if sub module was initialized with success
 */
function initWeboCtx(moduleParams, weboCtxConf) {
  if (!weboCtxConf || weboCtxConf.enabled === false) {
    moduleParams.weboCtxConf = null;

    return false
  }

  normalizeConf(moduleParams, weboCtxConf);

  _weboCtxInitialized = false;
  _weboContextualProfile = null;

  if (!weboCtxConf.token) {
    logWarn('missing param "token" for weborama contextual sub module initialization');
    return false;
  }

  logMessage('weborama contextual intialized with success');

  return true;
}

/** Initialize weboUserData sub module
 * @param {ModuleParams} moduleParams
 * @param {WeboUserDataConf} weboUserDataConf
 * @return {Boolean} true if sub module was initialized with success
 */
function initWeboUserData(moduleParams, weboUserDataConf) {
  if (!weboUserDataConf || weboUserDataConf.enabled === false) {
    moduleParams.weboUserDataConf = null;

    return false;
  }

  normalizeConf(moduleParams, weboUserDataConf);

  _weboUserDataInitialized = false;
  _weboUserDataUserProfile = null;

  let message = 'weborama user-centric intialized with success';
  if (weboUserDataConf.hasOwnProperty('accountId')) {
    message = `weborama user-centric intialized with success for account: ${weboUserDataConf.accountId}`;
  }

  logMessage(message);

  return true;
}

/** @type {Object} */
const globalDefaults = {
  setPrebidTargeting: true,
  sendToBidders: true,
  onData: (data, kind, def) => logMessage('onData(data,kind,default)', data, kind, def),
}

/** normalize submodule configuration
 * @param {ModuleParams} moduleParams
 * @param {WeboCtxConf|WeboUserDataConf} submoduleParams
 * @return {void}
 */
function normalizeConf(moduleParams, submoduleParams) {
  Object.entries(globalDefaults).forEach(([propertyName, globalDefaultValue]) => {
    if (!submoduleParams.hasOwnProperty(propertyName)) {
      const hasModuleParam = moduleParams.hasOwnProperty(propertyName);
      submoduleParams[propertyName] = (hasModuleParam) ? moduleParams[propertyName] : globalDefaultValue;
    }
  })
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
  const weboCtxConfTargeting = weboCtxConf.setPrebidTargeting;
  const weboUserDataConfTargeting = weboUserDataConf.setPrebidTargeting;

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
  const weboCtxConfTargeting = weboCtxConf.sendToBidders;
  const weboUserDataConfTargeting = weboUserDataConf.sendToBidders;

  if (weboCtxConfTargeting) {
    const contextualProfile = getContextualProfile(weboCtxConf);
    if (!isEmpty(contextualProfile)) {
      setBidRequestProfile(adUnits, contextualProfile, true);
    }
  }

  if (weboUserDataConfTargeting) {
    const weboUserDataProfile = getWeboUserDataProfile(weboUserDataConf);
    if (!isEmpty(weboUserDataProfile)) {
      setBidRequestProfile(adUnits, weboUserDataProfile, false);
    }
  }

  handleOnData(weboCtxConf, weboUserDataConf);
}

/** function that handle with onData callbacks
 * @param {WeboCtxConf} weboCtxConf
 * @param {WeboUserDataConf} weboUserDataConf
 */

function handleOnData(weboCtxConf, weboUserDataConf) {
  const callbacks = [{
    onData: weboCtxConf.onData,
    fetchData: () => getContextualProfile(weboCtxConf),
    site: true,
  }, {
    onData: weboUserDataConf.onData,
    fetchData: () => getWeboUserDataProfile(weboUserDataConf),
    site: false,
  }];

  callbacks.filter(obj => isFn(obj.onData)).forEach(obj => {
    try {
      const data = obj.fetchData();
      obj.onData(data, obj.site);
    } catch (e) {
      const kind = (obj.site) ? 'site' : 'user';
      logError(`error while executure onData callback with ${kind}-based data:`, e);
    }
  });
}

/** function that set bid request data on each segment (site or user centric)
 * @param {Object[]} adUnits
 * @param {Object} profile
 * @param {Boolean} site true if site centric, else it is user centric
 * @returns {void}
 */
function setBidRequestProfile(adUnits, profile, site) {
  setGlobalOrtb2(profile, site);

  adUnits.forEach(adUnit => {
    if (adUnit.hasOwnProperty('bids')) {
      const adUnitCode = adUnit.code || 'no code';
      adUnit.bids.forEach(bid => handleBid(adUnitCode, profile, site, bid));
    }
  });
}

/** @type {string} */
const APPNEXUS = 'appnexus';

/** @type {string} */
const PUBMATIC = 'pubmatic';

/** @type {string} */
const RUBICON = 'rubicon';

/** @type {string} */
const SMARTADSERVER = 'smartadserver';

/** @type {Object} */
const bidderAliasRegistry = adapterManager.aliasRegistry || {};

/** handle individual bid
 * @param {string} adUnitCode
 * @param {Object} profile
 * @param {Boolean} site true if site centric, else it is user centric
 * @param {Object} bid
 * @returns {void}
 */
function handleBid(adUnitCode, profile, site, bid) {
  const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

  logMessage(`handling on adunit '${adUnitCode}', bidder '${bidder}' and bid`, bid);

  switch (bidder) {
    case APPNEXUS:
      handleAppnexusBid(profile, bid);

      break;

    case PUBMATIC:
      handlePubmaticBid(profile, bid);

      break;

    case SMARTADSERVER:
      handleSmartadserverBid(profile, bid);

      break;
    case RUBICON:
      handleRubiconBid(profile, site, bid);

      break;
    default:
      logMessage(`unsupported bidder '${bidder}', trying via bidder ortb2 fpd`);
      const section = ((site) ? 'site' : 'user');
      const base = `ortb2.${section}.ext.data`;

      assignProfileToObject(bid, base, profile);
  }
}

/**
 * set ortb2 global data
 * @param {Object} profile
 * @param {Boolean} site
 * @returns {void}
 */
function setGlobalOrtb2(profile, site) {
  const section = ((site) ? 'site' : 'user');
  const base = `${section}.ext.data`;
  const addOrtb2 = {};

  assignProfileToObject(addOrtb2, base, profile);

  if (!isEmpty(addOrtb2)) {
    const testGlobal = getGlobal().getConfig('ortb2') || {};
    const ortb2 = {
      ortb2: mergeDeep({}, testGlobal, addOrtb2)
    };
    getGlobal().setConfig(ortb2);
  }
}

/**
 * assign profile to object
 * @param {Object} destination
 * @param {string} base
 * @param {Object} profile
 * @returns {void}
 */
function assignProfileToObject(destination, base, profile) {
  Object.keys(profile).forEach(key => {
    const path = `${base}.${key}`;
    deepSetValue(destination, path, profile[key])
  })
}

/** handle rubicon bid
 * @param {Object} profile
 * @param {Boolean} site
 * @param {Object} bid
 * @returns {void}
 */
function handleRubiconBid(profile, site, bid) {
  const section = (site) ? 'inventory' : 'visitor';
  const base = `params.${section}`;
  assignProfileToObject(bid, base, profile);
}

/** handle appnexus/xandr bid
 * @param {Object} profile
 * @param {Object} bid
 * @returns {void}
 */
function handleAppnexusBid(profile, bid) {
  const base = 'params.keywords';
  assignProfileToObject(bid, base, profile);
}

/** handle pubmatic bid
 * @param {Object} profile
 * @param {Object} bid
 * @returns {void}
 */
function handlePubmaticBid(profile, bid) {
  const sep = '|';
  const subsep = ',';
  const bidKey = 'params.dctr';
  const target = [];

  const data = deepAccess(bid, bidKey);
  if (data) {
    data.split(sep).forEach(t => target.push(t));
  }

  Object.keys(profile).forEach(key => {
    const value = profile[key].join(subsep);
    const keyword = `${key}=${value}`;
    if (target.indexOf(keyword) === -1) {
      target.push(keyword);
    }
  });

  deepSetValue(bid, bidKey, target.join(sep));
}

/** handle smartadserver bid
 * @param {Object} profile
 * @param {Object} bid
 * @returns {void}
 */
function handleSmartadserverBid(profile, bid) {
  const sep = ';';
  const bidKey = 'params.target';
  const target = [];

  const data = deepAccess(bid, bidKey);
  if (data) {
    data.split(sep).forEach(t => target.push(t));
  }

  Object.keys(profile).forEach(key => {
    profile[key].forEach(value => {
      const keyword = `${key}=${value}`;
      if (target.indexOf(keyword) === -1) {
        target.push(keyword);
      }
    });
  });
  deepSetValue(bid, bidKey, target.join(sep));
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

  const url = `https://ctx.weborama.com/api/profile?${queryString}`;

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
