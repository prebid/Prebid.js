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
 * @property {Boolean} isDefault if true it the default profile defined in the configuration
 */

/** onData callback type
 * @callback dataCallback
 * @param {Object} data profile data
 * @param {dataCallbackMetadata} meta metadata
 * @returns {void}
 */

/** setPrebidTargeting callback type
 * @callback setPrebidTargetingCallback
 * @param {String} adUnitCode
 * @param {Object} data
 * @param {dataCallbackMetadata} metadata
 * @returns {Boolean}
 */

/** sendToBidders callback type
 * @callback sendToBiddersCallback
 * @param {Object} bid
 * @param {String} adUnitCode
 * @param {Object} data
 * @param {dataCallbackMetadata} metadata
 * @returns {Boolean}
 */

/**
 * @typedef {Object} ModuleParams
 * @property {?setPrebidTargetingCallback|?Boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?Boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?WeboCtxConf} weboCtxConf site-centric contextual configuration
 * @property {?WeboUserDataConf} weboUserDataConf user-centric wam configuration
 * @property {?SfbxLiteDataConf} sfbxLiteDataConf site-centric lite configuration
 */

/**
 * @typedef {Object} WeboCtxConf
 * @property {string} token required token to be used on bigsea contextual API requests
 * @property {?string} targetURL specify the target url instead use the referer
 * @property {?setPrebidTargetingCallback|?Boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?Boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?object} defaultProfile to be used if the profile is not found
 * @property {?Boolean} enabled if false, will ignore this configuration
 * @property {?string} baseURLProfileAPI to be used to point to a different domain than ctx.weborama.com
 */

/**
 * @typedef {Object} WeboUserDataConf
 * @property {?number} accountId wam account id
 * @property {?setPrebidTargetingCallback|?Boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?Boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?object} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
 * @property {?Boolean} enabled if false, will ignore this configuration
 */

/**
 * @typedef {Object} SfbxLiteDataConf
 * @property {?setPrebidTargetingCallback|?Boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?Boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?object} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is '_lite')
 * @property {?Boolean} enabled if false, will ignore this configuration
 */
import {
  getGlobal
} from '../src/prebidGlobal.js';
import {
  deepSetValue,
  isEmpty,
  isFn,
  logError,
  logMessage,
  isArray,
  isStr,
  isBoolean,
  isPlainObject,
  deepClone,
  tryAppendQueryString, mergeDeep, logWarn
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
import adapterManager from '../src/adapterManager.js';

/** @type {string} */
const MODULE_NAME = 'realTimeData';
/** @type {string} */
const SUBMODULE_NAME = 'weborama';
/** @type {string} */
const BASE_URL_CONTEXTUAL_PROFILE_API = 'ctx.weborama.com';
/** @type {string} */
export const DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY = 'webo_wam2gam_entry';
/** @type {string} */
const LOCAL_STORAGE_USER_TARGETING_SECTION = 'targeting';
/** @type {string} */
export const DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY = '_lite';
/** @type {string} */
const LOCAL_STORAGE_LITE_TARGETING_SECTION = 'webo';
/** @type {string} */
const WEBO_CTX_CONF_SECTION = 'weboCtxConf';
/** @type {string} */
const WEBO_USER_DATA_CONF_SECTION = 'weboUserDataConf';
/** @type {string} */
const SFBX_LITE_DATA_CONF_SECTION = 'sfbxLiteDataConf';

/** @type {number} */
const GVLID = 284;
/** @type {?Object} */
export const storage = getStorageManager({
  gvlid: GVLID,
  moduleName: SUBMODULE_NAME
});

/** @type {null|Object} */
let _weboContextualProfile = null;

/** @type {Boolean} */
let _weboCtxInitialized = false;

/** @type {?Object} */
let _weboUserDataUserProfile = null;

/** @type {Boolean} */
let _weboUserDataInitialized = false;

/** @type {?Object} */
let _sfbxLiteDataProfile = null;

/** @type {Boolean} */
let _sfbxLiteDataInitialized = false;

/** Initialize module
 * @param {object} moduleConfig
 * @return {Boolean} true if module was initialized with success
 */
function init(moduleConfig) {
  const moduleParams = moduleConfig?.params || {};

  _weboContextualProfile = null;
  _weboUserDataUserProfile = null;
  _sfbxLiteDataProfile = null;

  _weboCtxInitialized = initSubSection(moduleParams, WEBO_CTX_CONF_SECTION, 'token');
  _weboUserDataInitialized = initSubSection(moduleParams, WEBO_USER_DATA_CONF_SECTION);
  _sfbxLiteDataInitialized = initSubSection(moduleParams, SFBX_LITE_DATA_CONF_SECTION);

  return _weboCtxInitialized || _weboUserDataInitialized || _sfbxLiteDataInitialized;
}

/** Initialize subsection module
 * @param {Object} moduleParams
 * @param {string} subSection subsection name to initialize
 * @param {[]string} requiredFields
 * @return {Boolean} true if module subsection was initialized with success
 */
function initSubSection(moduleParams, subSection, ...requiredFields) {
  const weboSectionConf = moduleParams[subSection] || {enabled: false};

  if (weboSectionConf.enabled === false) {
    delete moduleParams[subSection];

    return false;
  }

  requiredFields ||= [];

  try {
    normalizeConf(moduleParams, weboSectionConf);

    requiredFields.forEach(field => {
      if (!weboSectionConf[field]) {
        throw `missing required field "{field}" on {section}`;
      }
    });
  } catch (e) {
    logError(`unable to initialize: error on ${subSection} configuration: ${e}`);
    return false
  }

  logMessage(`weborama ${subSection} initialized with success`);

  return true;
}

/** @type {Object} */
const globalDefaults = {
  setPrebidTargeting: true,
  sendToBidders: true,
  onData: () => {
    /* do nothing */ },
}

/** normalize submodule configuration
 * @param {ModuleParams} moduleParams
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} submoduleParams
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

  submoduleParams.defaultProfile = submoduleParams.defaultProfile || {};

  if (!isValidProfile(submoduleParams.defaultProfile)) {
    throw 'defaultProfile is not valid';
  }
}

/** coerce set prebid targeting to function
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} submoduleParams
 * @return {void}
 */
function coerceSetPrebidTargeting(submoduleParams) {
  const setPrebidTargeting = submoduleParams.setPrebidTargeting;

  if (isFn(setPrebidTargeting)) {
    return
  }

  if (isBoolean(setPrebidTargeting)) {
    const shouldSetPrebidTargeting = setPrebidTargeting;

    submoduleParams.setPrebidTargeting = () => shouldSetPrebidTargeting;

    return
  }

  if (isStr(setPrebidTargeting)) {
    const allowedAdUnitCode = setPrebidTargeting;

    submoduleParams.setPrebidTargeting = (adUnitCode) => allowedAdUnitCode == adUnitCode;

    return
  }

  if (isArray(setPrebidTargeting)) {
    const allowedAdUnitCodes = setPrebidTargeting;

    submoduleParams.setPrebidTargeting = (adUnitCode) => allowedAdUnitCodes.includes(adUnitCode);

    return
  }

  throw `unexpected format for setPrebidTargeting: ${typeof setPrebidTargeting}`;
}

/** coerce send to bidders to function
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} submoduleParams
 * @return {void}
 */
function coerceSendToBidders(submoduleParams) {
  const sendToBidders = submoduleParams.sendToBidders;

  if (isFn(sendToBidders)) {
    return
  }

  if (isBoolean(sendToBidders)) {
    const shouldSendToBidders = sendToBidders;

    submoduleParams.sendToBidders = () => shouldSendToBidders;

    return
  }

  if (isStr(sendToBidders)) {
    const allowedBidder = sendToBidders;

    submoduleParams.sendToBidders = (bid) => allowedBidder == bid.bidder;

    return
  }

  if (isArray(sendToBidders)) {
    const allowedBidders = sendToBidders;

    submoduleParams.sendToBidders = (bid) => allowedBidders.includes(bid.bidder);

    return
  }

  if (isPlainObject(sendToBidders)) {
    const sendToBiddersMap = sendToBidders;
    submoduleParams.sendToBidders = (bid, adUnitCode) => {
      const bidder = bid.bidder;
      if (!sendToBiddersMap.hasOwnProperty(bidder)) {
        return false
      }

      const value = sendToBiddersMap[bidder];

      if (isBoolean(value)) {
        return value
      }

      if (isStr(value)) {
        return value == adUnitCode
      }

      if (isArray(value)) {
        return value.includes(adUnitCode)
      }

      throw `unexpected format for sendToBidders[${bidder}]: ${typeof value}`;
    };

    return
  }

  throw `unexpected format for sendToBidders: ${typeof sendToBidders}`;
}
/**
 * check if profile is valid
 * @param {*} profile
 * @returns {Boolean}
 */
function isValidProfile(profile) {
  if (!isPlainObject(profile)) {
    return false;
  }

  const keys = Object.keys(profile);

  for (var i in keys) {
    const key = keys[i];
    const value = profile[key];
    if (!isArray(value)) {
      return false;
    }

    for (var j in value) {
      const elem = value[j]
      if (!isStr(elem)) {
        return false;
      }
    }
  }

  return true;
}

/** function that provides ad server targeting data to RTD-core
 * @param {Array} adUnitsCodes
 * @param {Object} moduleConfig
 * @returns {Object} target data
 */
function getTargetingData(adUnitsCodes, moduleConfig) {
  const moduleParams = moduleConfig?.params || {};

  const profileHandlers = buildProfileHandlers(moduleParams);

  if (isEmpty(profileHandlers)) {
    logMessage('no data to set targeting');
    return {};
  }

  try {
    const td = adUnitsCodes.reduce((data, adUnitCode) => {
      data[adUnitCode] = profileHandlers.reduce((targeting, ph) => {
        // logMessage(`check if should set targeting for adunit '${adUnitCode}'`);
        const cph = copyProfileHandler(ph);
        if (ph.setTargeting(adUnitCode, cph.data, cph.metadata)) {
          // logMessage(`set targeting for adunit '${adUnitCode}', source '${ph.metadata.source}'`);

          mergeDeep(targeting, cph.data);
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

/** function that provides data handlers based on the configuration
 * @param {ModuleParams} moduleParams
 * @returns {Array<Object>} handlers
 */
function buildProfileHandlers(moduleParams) {
  const profileHandlers = [];

  if (_weboCtxInitialized && moduleParams?.weboCtxConf) {
    const weboCtxConf = moduleParams.weboCtxConf;
    const [data, isDefault] = getContextualProfile(weboCtxConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: {
          user: false,
          source: 'contextual',
          isDefault: !!isDefault,
        },
        setTargeting: weboCtxConf.setPrebidTargeting,
        sendToBidders: weboCtxConf.sendToBidders,
        onData: weboCtxConf.onData,
      })
    } else {
      logMessage('skip contextual profile: no data');
    }
  }

  if (_weboUserDataInitialized && moduleParams?.weboUserDataConf) {
    const weboUserDataConf = moduleParams.weboUserDataConf;
    const [data, isDefault] = getWeboUserDataProfile(weboUserDataConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: {
          user: true,
          source: 'wam',
          isDefault: !!isDefault,
        },
        setTargeting: weboUserDataConf.setPrebidTargeting,
        sendToBidders: weboUserDataConf.sendToBidders,
        onData: weboUserDataConf.onData,
      })
    } else {
      logMessage('skip wam profile: no data');
    }
  }

  if (_sfbxLiteDataInitialized && moduleParams?.sfbxLiteDataConf) {
    const sfbxLiteDataConf = moduleParams.sfbxLiteDataConf;
    const [data, isDefault] = getSfbxLiteDataProfile(sfbxLiteDataConf);
    if (!isEmpty(data)) {
      profileHandlers.push({
        data: data,
        metadata: {
          user: false,
          source: 'lite',
          isDefault: !!isDefault,
        },
        setTargeting: sfbxLiteDataConf.setPrebidTargeting,
        sendToBidders: sfbxLiteDataConf.sendToBidders,
        onData: sfbxLiteDataConf.onData,
      })
    } else {
      logMessage('skip sfbx lite profile: no data');
    }
  }

  return profileHandlers;
}

/** return contextual profile
 * @param {WeboCtxConf} weboCtxConf
 * @returns {Array} contextual profile + isDefault boolean flag
 */
function getContextualProfile(weboCtxConf) {
  if (_weboContextualProfile) {
    return [_weboContextualProfile, false];
  }

  const defaultContextualProfile = weboCtxConf.defaultProfile || {};

  return [defaultContextualProfile, true];
}

/** return weboUserData profile
 * @param {WeboUserDataConf} weboUserDataConf
 * @returns {Array} weboUserData profile  + isDefault boolean flag
 */
function getWeboUserDataProfile(weboUserDataConf) {
  return getDataFromLocalStorage(weboUserDataConf,
    () => _weboUserDataUserProfile,
    (data) => _weboUserDataUserProfile = data,
    DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY,
    LOCAL_STORAGE_USER_TARGETING_SECTION,
    'wam');
}

/** return weboUserData profile
 * @param {SfbxLiteDataConf} sfbxLiteDataConf
 * @returns {Array} sfbxLiteData profile + isDefault boolean flag
 */
function getSfbxLiteDataProfile(sfbxLiteDataConf) {
  return getDataFromLocalStorage(sfbxLiteDataConf,
    () => _sfbxLiteDataProfile,
    (data) => _sfbxLiteDataProfile = data,
    DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY,
    LOCAL_STORAGE_LITE_TARGETING_SECTION,
    'lite');
}

/** return generic webo data profile
 * @param {WeboUserDataConf|SfbxLiteDataConf} weboDataConf
 * @param {cacheGetCallback} cacheGet
 * @param {cacheSetCallback} cacheSet
 * @param {String} defaultLocalStorageProfileKey
 * @param {String} targetingSection
 * @param {String} source
 * @returns {Array} webo (user|lite) data profile + isDefault boolean flag
 */
function getDataFromLocalStorage(weboDataConf, cacheGet, cacheSet, defaultLocalStorageProfileKey, targetingSection, source) {
  const defaultProfile = weboDataConf.defaultProfile || {};

  if (storage.localStorageIsEnabled() && !cacheGet()) {
    const localStorageProfileKey = weboDataConf.localStorageProfileKey || defaultLocalStorageProfileKey;

    const entry = storage.getDataFromLocalStorage(localStorageProfileKey);
    if (entry) {
      const data = JSON.parse(entry);
      if (data && isPlainObject(data) && data.hasOwnProperty(targetingSection)) {
        const profile = data[targetingSection];
        const valid = isValidProfile(profile);
        if (!valid) {
          logWarn(`found invalid ${source} profile on local storage key ${localStorageProfileKey}, section ${targetingSection}`);
        }

        if (valid && !isEmpty(data)) {
          cacheSet(profile);
        }
      }
    }
  }

  const profile = cacheGet()

  if (profile) {
    return [profile, false];
  }

  return [defaultProfile, true];
}

/** function that will allow RTD sub-modules to modify the AdUnit object for each auction
 * @param {Object} reqBidsConfigObj
 * @param {doneCallback} onDone
 * @param {Object} moduleConfig
 * @returns {void}
 */
export function getBidRequestData(reqBidsConfigObj, onDone, moduleConfig) {
  const moduleParams = moduleConfig?.params || {};

  if (!_weboCtxInitialized) {
    handleBidRequestData(reqBidsConfigObj, moduleParams);

    onDone();

    return;
  }

  const weboCtxConf = moduleParams.weboCtxConf || {};

  fetchContextualProfile(weboCtxConf, (data) => {
    logMessage('fetchContextualProfile on getBidRequestData is done');

    setWeboContextualProfile(data);
  }, () => {
    handleBidRequestData(reqBidsConfigObj, moduleParams);

    onDone();
  });
}

/** function that handles bid request data
 * @param {Object} reqBids
 * @param {ModuleParams} moduleParams
 * @returns {void}
 */
function handleBidRequestData(reqBids, moduleParams) {
  const profileHandlers = buildProfileHandlers(moduleParams);

  if (isEmpty(profileHandlers)) {
    logMessage('no data to send to bidders');
    return;
  }

  const adUnits = reqBids.adUnits || getGlobal().adUnits;

  try {
    adUnits.filter(
      adUnit => adUnit.hasOwnProperty('bids')
    ).forEach(
      adUnit => adUnit.bids.forEach(
        bid => profileHandlers.forEach(ph => {
          // logMessage(`check if bidder '${bid.bidder}' and adunit '${adUnit.code} are share ${ph.metadata.source} data`);

          const cph = copyProfileHandler(ph);
          if (ph.sendToBidders(bid, adUnit.code, cph.data, cph.metadata)) {
            // logMessage(`handling bidder '${bid.bidder}' with ${ph.metadata.source} data`);

            handleBid(reqBids, bid, cph.data, ph.metadata);
          }
        })
      )
    );
  } catch (e) {
    logError('unable to send data to bidders:', e);
  }

  profileHandlers.forEach(ph => {
    try {
      const cph = copyProfileHandler(ph);
      ph.onData(cph.data, cph.metadata);
    } catch (e) {
      logError(`error while executure onData callback with ${ph.metadata.source}-based data:`, e);
    }
  });
}
/** function that handles bid request data
 * @param {Object} ph profile handler
 *@returns {Object} of deeply copy data and metadata
 */
function copyProfileHandler(ph) {
  return {
    data: deepClone(ph.data),
    metadata: deepClone(ph.metadata),
  };
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
 * @param reqBids
 * @param {Object} bid
 * @param {Object} profile
 * @param {Object} metadata
 * @returns {void}
 */
function handleBid(reqBids, bid, profile, metadata) {
  const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

  switch (bidder) {
    // TODO: these special cases should not be necessary - all adapters should look into FPD, not just their params
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
      handleRubiconBid(bid, profile, metadata);

      break;
    default:
      handleBidViaORTB2(reqBids, bid, profile, metadata);
  }
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
  const target = [];

  bid.params ||= {};

  const data = bid.params.dctr;
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

  bid.params.dctr = target.join(sep);
}

/** handle smartadserver bid
 * @param {Object} bid
 * @param {Object} profile
 * @returns {void}
 */
function handleSmartadserverBid(bid, profile) {
  const sep = ';';
  const target = [];

  bid.params ||= {};

  const data = bid.params.target;
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

  bid.params.target = target.join(sep);
}

/** handle rubicon bid
 * @param {Object} bid
 * @param {Object} profile
 * @param {Object} metadata
 * @returns {void}
 */
function handleRubiconBid(bid, profile, metadata) {
  if (isBoolean(metadata.user)) {
    const section = (metadata.user) ? 'visitor' : 'inventory';
    const base = `params.${section}`;
    assignProfileToObject(bid, base, profile);
  } else {
    logMessage(`SKIP bidder '${bid.bidder}', data from '${metadata.source}' is not defined as user or site-centric`);
  }
}

/** handle generic bid via ortb2 arbitrary data
 * @param reqBids
 * @param {Object} bid
 * @param {Object} profile
 * @param {Object} metadata
 * @returns {void}
 */
function handleBidViaORTB2(reqBids, bid, profile, metadata) {
  if (isBoolean(metadata.user)) {
    logMessage(`bidder '${bid.bidder}' is not directly supported, trying set data via bidder ortb2 fpd`);
    const section = ((metadata.user) ? 'user' : 'site');
    const base = `${bid.bidder}.${section}.ext.data`;

    assignProfileToObject(reqBids.ortb2Fragments?.bidder, base, profile);
  } else {
    logMessage(`SKIP unsupported bidder '${bid.bidder}', data from '${metadata.source}' is not defined as user or site-centric`);
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

/** set bigsea contextual profile on module state
 * @param {null|Object} data
 * @returns {void}
 */
export function setWeboContextualProfile(data) {
  if (data && isPlainObject(data) && isValidProfile(data) && !isEmpty(data)) {
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
  const baseURLProfileAPI = weboCtxConf.baseURLProfileAPI || BASE_URL_CONTEXTUAL_PROFILE_API;

  let queryString = '';
  queryString = tryAppendQueryString(queryString, 'token', token);
  queryString = tryAppendQueryString(queryString, 'url', targetURL);

  const urlProfileAPI = `https://${baseURLProfileAPI}/api/profile?${queryString}`;

  ajax(urlProfileAPI, {
    success: (response, req) => {
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
    error: () => {
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
