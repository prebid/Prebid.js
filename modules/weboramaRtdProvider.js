/**
 * This module adds Weborama provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch contextual data (page-centric) from Weborama server
 * and may access user-centric data from local storage
 * @module modules/weboramaRtdProvider
 * @requires module:modules/realTimeData
 */

/**
 * @typedef dataCallbackMetadata
 * @property {Boolean} user if true it is user-centric data
 * @property {String} source describe the source of data, if "contextual" or "wam"
*/

/** onData callback type
 * @callback dataCallback
 * @param {Object} data profile data
 * @param {dataCallbackMetadata} meta metadata
 * @returns {void}
 */

/** setPrebidTargeting callback type
 * @callback sendToBiddersCallback
 * @param {String} adUnitCode
 * @param {Object} data
 * @param {dataCallbackMetadata} metadata
 * @returns {Boolean}
 */

/** sendToBidders callback type
 * @callback sendToBiddersCallback
 * @param {String} bidder
 * @param {String} adUnitCode
 * @param {Object} data
 * @param {dataCallbackMetadata} metadata
 * @returns {Boolean}
 */

/** we can define some elements from a given list, true for all, false for none
 * @typedef {Boolean|String|Array<String>} boolOrStringOrArray
 */

/**
 * @typedef {Object} ModuleParams
 * @property {?boolOrStringOrArray|sendToBiddersCallback} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?boolOrStringOrArray|?Map<String,boolOrStringOrArray>|sendToBiddersCallback} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?WeboCtxConf} weboCtxConf
 * @property {?WeboUserDataConf} weboUserDataConf
 */

/**
 * @typedef {Object} WeboCtxConf
 * @property {string} token required token to be used on bigsea contextual API requests
 * @property {?string} targetURL specify the target url instead use the referer
 * @property {?boolOrStringOrArray|sendToBiddersCallback} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?boolOrStringOrArray|?Map<String,boolOrStringOrArray>|sendToBiddersCallback} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?object} defaultProfile to be used if the profile is not found
 * @property {?Boolean} enabled if false, will ignore this configuration
 */

/**
 * @typedef {Object} WeboUserDataConf
 * @property {?number} accountId wam account id
 * @property {?boolOrStringOrArray|sendToBiddersCallback} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?boolOrStringOrArray|?Map<String,boolOrStringOrArray>|sendToBiddersCallback} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
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
  isFn,
  isArray,
  isStr,
  isBoolean,
  isPlainObject,
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

  try {
    normalizeConf(moduleParams, weboCtxConf);
  } catch (e) {
    logError(`unable to initialize: error on site-centric (contextual) configuration: ${e}`);
    return false
  }

  _weboCtxInitialized = false;
  _weboContextualProfile = null;

  if (!weboCtxConf.token) {
    logError('missing param "token" for weborama contextual sub module initialization');
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

  try {
    normalizeConf(moduleParams, weboUserDataConf);
  } catch (e) {
    logError(`unable to initialize: error on user-centric (wam) configuration: ${e}`);
    return false
  }

  _weboUserDataInitialized = false;
  _weboUserDataUserProfile = null;

  let message = 'weborama user-centric intialized with success';
  if (weboUserDataConf.hasOwnProperty('accountId')) {
    message = `weborama user-centric intialized with success for account: ${weboUserDataConf.accountId}`;
  } else {
    logWarn('weborama wam account id not found on user-centric configuration');
  }

  logMessage(message);

  return true;
}

/** @type {Object} */
const globalDefaults = {
  setPrebidTargeting: true,
  sendToBidders: true,
  onData: (data, meta) => logMessage('onData(data, meta)', data, meta),
}

/** normalize submodule configuration
 * @param {ModuleParams} moduleParams
 * @param {WeboCtxConf|WeboUserDataConf} submoduleParams
 * @return {void}
 */
function normalizeConf(moduleParams, submoduleParams) {
  // handle defaults
  Object.entries(globalDefaults).forEach(([propertyName, globalDefaultValue]) => {
    if (!submoduleParams.hasOwnProperty(propertyName)) {
      const hasModuleParam = moduleParams.hasOwnProperty(propertyName);
      submoduleParams[propertyName] = (hasModuleParam) ? moduleParams[propertyName] : globalDefaultValue;
    }
  })

  // handle setPrebidTargeting
  coerceSetPrebidTargeting(submoduleParams)

  // handle sendToBidders
  coerceSendToBidders(submoduleParams)

  if (!isFn(submoduleParams.onData)) {
    throw 'onData parameter should be a callback';
  }
}

/** coerce set prebid targeting to function
 * @param {WeboCtxConf|WeboUserDataConf} submoduleParams
 * @return {void}
 */
function coerceSetPrebidTargeting(submoduleParams) {
  const setPrebidTargeting = submoduleParams.setPrebidTargeting;

  if (isFn(setPrebidTargeting)) {
    return
  }

  if (isBoolean(setPrebidTargeting)) {
    const shouldSetPrebidTargeting = setPrebidTargeting;

    submoduleParams.setPrebidTargeting = function () {
      return shouldSetPrebidTargeting;
    };

    return
  }

  if (isStr(setPrebidTargeting)) {
    const allowedAdUnitCode = setPrebidTargeting;
    submoduleParams.setPrebidTargeting = function (adUnitCode) {
      return allowedAdUnitCode == adUnitCode;
    };

    return
  }

  if (isArray(setPrebidTargeting)) {
    const allowedAdUnitCodes = setPrebidTargeting;
    submoduleParams.setPrebidTargeting = function (adUnitCode) {
      return allowedAdUnitCodes.includes(adUnitCode);
    };

    return
  }

  throw `unexpected format for setPrebidTargeting: ${typeof setPrebidTargeting}`;
}

/** coerce send to bidders to function
 * @param {WeboCtxConf|WeboUserDataConf} submoduleParams
 * @return {void}
 */
function coerceSendToBidders(submoduleParams) {
  const sendToBidders = submoduleParams.sendToBidders;

  if (isFn(sendToBidders)) {
    return
  }

  if (isBoolean(sendToBidders)) {
    const shouldSendToBidders = sendToBidders;

    submoduleParams.sendToBidders = function () {
      return shouldSendToBidders;
    };

    return
  }

  if (isStr(sendToBidders)) {
    const allowedBidder = sendToBidders;
    submoduleParams.sendToBidders = function (bidder) {
      return allowedBidder == bidder;
    };

    return
  }

  if (isArray(sendToBidders)) {
    const allowedBidders = sendToBidders;
    submoduleParams.sendToBidders = function (bidder) {
      return allowedBidders.includes(bidder);
    };

    return
  }

  if (isPlainObject(sendToBidders)) {
    const sendToBiddersMap = sendToBidders;
    submoduleParams.sendToBidders = function (bidder, adUnitCode) {
      if (!sendToBiddersMap.hasOwnProperty(bidder)) {
        return false
      }

      const value = sendToBiddersMap[bidder];

      if (isBoolean(value)) { return value }

      if (isStr(value)) { return value == adUnitCode }

      if (isArray(value)) { return value.includes(adUnitCode) }

      throw `unexpected format for sendToBidders[${bidder}]: ${typeof value}`;
    };

    return
  }

  throw `unexpected format for sendToBidders: ${typeof sendToBidders}`;
}

/** function that provides ad server targeting data to RTD-core
 * @param {Array} adUnitsCodes
 * @param {Object} moduleConfig
 * @returns {Object} target data
 */
function getTargetingData(adUnitsCodes, moduleConfig) {
  moduleConfig = moduleConfig || {};

  const moduleParams = moduleConfig.params || {};

  const profileHandlers = [];
  // TODO consider call submethods instead push to array and iterate

  if (_weboCtxInitialized) {
    const weboCtxConf = moduleParams.weboCtxConf || {};
    const weboCtxConfTargeting = weboCtxConf.setPrebidTargeting;
    const data = getContextualProfile(weboCtxConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: { user: false, source: 'contextual' },
        setTargeting: weboCtxConfTargeting,
      })
    }
  }

  if (_weboUserDataInitialized) {
    const weboUserDataConf = moduleParams.weboUserDataConf || {};
    const weboUserDataConfTargeting = weboUserDataConf.setPrebidTargeting;
    const data = getWeboUserDataProfile(weboUserDataConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: { user: true, source: 'wam' },
        setTargeting: weboUserDataConfTargeting,
      })
    }
  }

  if (isEmpty(profileHandlers)) {
    logMessage('no data to set targeting');
    return {};
  }

  try {
    const td = adUnitsCodes.reduce((data, adUnitCode) => {
      data[adUnitCode] = profileHandlers.reduce((targeting, handler) => {
        logMessage(`check if should set targeting for adunit '${adUnitCode}'`);
        // if(! isFn(handler.setTargeting)){
        //   throw `set targeting is not a function for ${handler.metadata.source}`;
        // }
        if (handler.setTargeting(adUnitCode, handler.data, handler.metadata)) {
          logMessage(`set targeting for adunit '${adUnitCode}', source ' '`);

          mergeDeep(targeting, handler.data);
        }
        return targeting;
      }, {});
      return data;
    }, {});

    return td;
  } catch (e) {
    logError('unable to format weborama rtd targeting data', e);
    return {};
  }
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
  const profileHandlers = [];

  // TODO consider call submethods instead push to array and iterate

  if (_weboCtxInitialized) {
    const weboCtxConf = moduleParams.weboCtxConf || {};
    const weboCtxConfSendToBidders = weboCtxConf.sendToBidders;
    const data = getContextualProfile(weboCtxConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: { user: false, source: 'contextual' },
        sendToBidders: weboCtxConfSendToBidders,
        onData: weboCtxConf.onData,
      });
    }
  }

  if (_weboUserDataInitialized) {
    const weboUserDataConf = moduleParams.weboUserDataConf || {};
    const weboUserDataSendToBidders = weboUserDataConf.sendToBidders;
    const data = getWeboUserDataProfile(weboUserDataConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: { user: true, source: 'wam' },
        sendToBidders: weboUserDataSendToBidders,
        onData: weboUserDataConf.onData,
      });
    }
  }

  if (isEmpty(profileHandlers)) {
    logMessage('no data to send to bidders');
    return;
  }

  try {
    adUnits.filter(
      adUnit => adUnit.hasOwnProperty('bids')
    ).forEach(
      adUnit => adUnit.bids.forEach(
        bid => profileHandlers.forEach(ph => {
          logMessage(`check if bidder '${bid.bidder}' and adunit '${adUnit.code} are share ${ph.metadata.source} data`);

          if (ph.sendToBidders(bid.bidder, adUnit.code, ph.data, ph.metadata)) {
            logMessage(`handling bidder '${bid.bidder}' with ${ph.metadata.source} data`);

            handleBid(bid, ph.data, ph.metadata.user);
          }
        })
      )
    );
  } catch (e) {
    logError('unable to send data to bidders:', e);
  }

  profileHandlers.forEach(ph => {
    try {
      ph.onData(ph.data, ph.metadata);
    } catch (e) {
      logError(`error while executure onData callback with ${ph.metadata.source}-based data:`, e);
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
 * @param {Object} bid
 * @param {Object} profile
 * @param {Boolean} user true if user-centric, else it is site centric data
 * @returns {void}
 */
function handleBid(bid, profile, user) {
  const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

  switch (bidder) {
    case APPNEXUS:
      handleAppnexusBid(bid, profile);

      break;

    case PUBMATIC:
      handlePubmaticBid(bid, profile);

      break;

    case SMARTADSERVER:
      handleSmartadserverBid(bid, profile);

      break;
    case RUBICON:
      handleRubiconBid(bid, profile, user);

      break;
    default:
      logMessage(`unsupported bidder '${bidder}', trying via bidder ortb2 fpd`);
      const section = ((user) ? 'user' : 'site');
      const base = `ortb2.${section}.ext.data`;

      assignProfileToObject(bid, base, profile);
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
 * @param {Object} bid
 * @param {Object} profile
 * @param {Boolean} user
 * @returns {void}
 */
function handleRubiconBid(bid, profile, user) {
  const section = (user) ? 'visitor' : 'inventory';
  const base = `params.${section}`;
  assignProfileToObject(bid, base, profile);
}

/** handle appnexus/xandr bid
 * @param {Object} bid
 * @param {Object} profile
 * @returns {void}
 */
function handleAppnexusBid(bid, profile) {
  const base = 'params.keywords';
  assignProfileToObject(bid, base, profile);
}

/** handle pubmatic bid
 * @param {Object} bid
 * @param {Object} profile
 * @returns {void}
 */
function handlePubmaticBid(bid, profile) {
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
 * @param {Object} bid
 * @param {Object} profile
 * @returns {void}
 */
function handleSmartadserverBid(bid, profile) {
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
