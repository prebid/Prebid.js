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
 * @property {boolean} user if true it is user-centric data
 * @property {string} source describe the source of data, if 'contextual' or 'wam'
 * @property {boolean} isDefault if true it the default profile defined in the configuration
 */

/**
 * @typedef {Object<string,string[]>} Profile
 */

/** onData callback type
 * @callback dataCallback
 * @param {Profile} data profile data
 * @param {dataCallbackMetadata} meta metadata
 * @returns {void}
 */

/** setPrebidTargeting callback type
 * @callback setPrebidTargetingCallback
 * @param {string} adUnitCode
 * @param {Profile} data
 * @param {dataCallbackMetadata} metadata
 * @returns {boolean}
 */

/** sendToBidders callback type
 * @callback sendToBiddersCallback
 * @param {Object} bid
 * @param {string} adUnitCode
 * @param {Profile} data
 * @param {dataCallbackMetadata} metadata
 * @returns {boolean}
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
 * @property {?Profile} defaultProfile to be used if the profile is not found
 * @property {?boolean} enabled if false, will ignore this configuration
 * @property {?string} baseURLProfileAPI to be used to point to a different domain than ctx.weborama.com
 */

/**
 * @typedef {Object} WeboUserDataConf
 * @property {?number} accountId wam account id
 * @property {?setPrebidTargetingCallback|?Boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?Boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?Profile} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
 * @property {?boolean} enabled if false, will ignore this configuration
 */

/**
 * @typedef {Object} SfbxLiteDataConf
 * @property {?setPrebidTargetingCallback|?Boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?Boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?Profile} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is '_lite')
 * @property {?boolean} enabled if false, will ignore this configuration
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
/** @type {string} */
const WEBO_CTX_SOURCE_LABEL = 'contextual';
/** @type {string} */
const WEBO_USER_DATA_SOURCE_LABEL = 'wam';
/** @type {string} */
const SFBX_LITE_DATA_SOURCE_LABEL = 'lite';
/** @type {number} */
const GVLID = 284;
/** @type {?Object} */
export const storage = getStorageManager({
  gvlid: GVLID,
  moduleName: SUBMODULE_NAME
});

/** @type {?Profile} */
let _weboContextualProfile = null;

/** @type {?Profile} */
let _weboUserDataUserProfile = null;

/** @type {?Profile} */
let _sfbxLiteDataProfile = null;

/**
 * @typedef {Object} DataInitialized
 * @property {boolean} WeboCtx
 * @property {boolean} WeboUser
 * @property {boolean} SfbxLite
 */

/** @type {DataInitialized} */
const _dataInitialized = {
  WeboCtx: false,
  WeboUser: false,
  SfbxLite: false,
};

/** @type {Object} */
const globalDefaults = {
  setPrebidTargeting: true,
  sendToBidders: true,
  onData: () => {
    /* do nothing */
  }
};
/** Initialize module
 * @param {Object} moduleConfig
 * @return {boolean} true if module was initialized with success
 */
function init(moduleConfig) {
  /** @type {ModuleParams} */
  const moduleParams = Object.assign({}, globalDefaults, moduleConfig?.params || {});

  _weboContextualProfile = null;
  _weboUserDataUserProfile = null;
  _sfbxLiteDataProfile = null;

  const WEBO_CTX_REQUIRED_FIELD_TOKEN_LABEL = 'token';

  _dataInitialized.WeboCtx = initSubSection(moduleParams, WEBO_CTX_CONF_SECTION, WEBO_CTX_REQUIRED_FIELD_TOKEN_LABEL);
  _dataInitialized.WeboUser = initSubSection(moduleParams, WEBO_USER_DATA_CONF_SECTION);
  _dataInitialized.SfbxLite = initSubSection(moduleParams, SFBX_LITE_DATA_CONF_SECTION);

  return Object.values(_dataInitialized).some((x) => !!x);
}

/** Initialize subsection module
 * @param {ModuleParams} moduleParams
 * @param {string} subSection subsection name to initialize
 * @param {string[]} requiredFields
 * @return {boolean} true if module subsection was initialized with success
 */
function initSubSection(moduleParams, subSection, ...requiredFields) {
  /** @type {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} */
  const weboSectionConf = moduleParams[subSection] || { enabled: false };

  if (weboSectionConf.enabled === false) {
    delete moduleParams[subSection];

    return false;
  }

  try {
    normalizeConf(moduleParams, weboSectionConf);

    requiredFields.forEach(field => {
      if (!(field in weboSectionConf)) {
        throw `missing required field '${field}''`;
      }
    });
  } catch (e) {
    logError(`unable to initialize: error on ${subSection} configuration:`, e);
    return false;
  }

  logMessage(`weborama ${subSection} initialized with success`);

  return true;
}

/** normalize submodule configuration
 * @param {ModuleParams} moduleParams
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} submoduleParams
 * @return {void}
 */
function normalizeConf(moduleParams, submoduleParams) {
  submoduleParams.defaultProfile = submoduleParams.defaultProfile || {};

  const { setPrebidTargeting, sendToBidders, onData } = moduleParams;

  submoduleParams.setPrebidTargeting ??= setPrebidTargeting;
  submoduleParams.sendToBidders ??= sendToBidders;
  submoduleParams.onData ??= onData;

  // handle setPrebidTargeting
  coerceSetPrebidTargeting(submoduleParams)

  // handle sendToBidders
  coerceSendToBidders(submoduleParams)

  if (!isFn(submoduleParams.onData)) {
    throw 'onData parameter should be a callback';
  }

  if (!isValidProfile(submoduleParams.defaultProfile)) {
    throw 'defaultProfile is not valid';
  }
}

/** coerce set prebid targeting to function
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} submoduleParams
 * @return {void}
 */
function coerceSetPrebidTargeting(submoduleParams) {
  try {
    submoduleParams.setPrebidTargeting = wrapValidatorCallback(submoduleParams.setPrebidTargeting);
  } catch (e) {
    throw `invalid setPrebidTargeting: ${e}`;
  }
}

/** coerce send to bidders to function
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} submoduleParams
 * @return {void}
 */
function coerceSendToBidders(submoduleParams) {
  let sendToBidders = submoduleParams.sendToBidders;

  if (isPlainObject(sendToBidders)) {
    const sendToBiddersMap = Object.entries(sendToBidders).reduce((map, [key, value]) => {
      map[key] = wrapValidatorCallback(value);
      return map;
    }, {});

    submoduleParams.sendToBidders = (bid, adUnitCode) => {
      const bidder = bid.bidder;
      if (!(bidder in sendToBiddersMap)) {
        return false;
      }

      const validatorCallback = sendToBiddersMap[bidder];

      try {
        return validatorCallback(adUnitCode);
      } catch (e) {
        throw `invalid sendToBidders[${bidder}]: ${e}`;
      }
    };

    return;
  }

  try {
    submoduleParams.sendToBidders = wrapValidatorCallback(submoduleParams.sendToBidders,
      (bid) => bid.bidder);
  } catch (e) {
    throw `invalid sendToBidders: ${e}`;
  }
}

/**
 * @callback validatorCallback
 * @param {string} target
 * @returns {boolean}
 */

/**
 * @callback coerceCallback
 * @param {*} input
 * @returns {*}
 */

/**
 * wrap value into validator
 * @param {*} value
 * @param {coerceCallback} coerce
 * @returns {validatorCallback}
 */
function wrapValidatorCallback(value, coerce = (x) => x) {
  if (isFn(value)) {
    return value;
  }

  if (isBoolean(value)) {
    return (_) => value;
  }

  if (isStr(value)) {
    return (target) => {
      return value == coerce(target);
    };
  }

  if (isArray(value)) {
    return (target) => {
      return value.includes(coerce(target));
    };
  }

  throw `unexpected format: ${typeof value} (expects function, boolean, string or array)`;
}

/**
 * check if profile is valid
 * @param {*} profile
 * @returns {boolean}
 */
function isValidProfile(profile) {
  if (!isPlainObject(profile)) {
    return false;
  }

  return Object.values(profile).every((field) => isArray(field) && field.every(isStr));
}

/** function that provides ad server targeting data to RTD-core
 * @param {string[]} adUnitsCodes
 * @param {Object} moduleConfig
 * @returns {Object} target data
 */
function getTargetingData(adUnitsCodes, moduleConfig) {
  /** @type {ModuleParams} */
  const moduleParams = moduleConfig?.params || {};

  const profileHandlers = buildProfileHandlers(moduleParams);

  if (isEmpty(profileHandlers)) {
    logMessage('no data to set targeting');
    return {};
  }

  try {
    return adUnitsCodes.reduce((data, adUnitCode) => {
      data[adUnitCode] = profileHandlers.reduce((targeting, ph) => {
        // logMessage(`check if should set targeting for adunit '${adUnitCode}'`);
        const [data, metadata] = copyDataAndMetadata(ph);
        if (ph.setTargeting(adUnitCode, data, metadata)) {
          // logMessage(`set targeting for adunit '${adUnitCode}', source '${metadata.source}'`);

          mergeDeep(targeting, data);
        }

        return targeting;
      }, {});

      return data;
    }, {});
  } catch (e) {
    logError(`unable to format weborama rtd targeting data:`, e);

    return {};
  }
}

/** function that provides data handlers based on the configuration
 * @param {ModuleParams} moduleParams
 * @returns {ProfileHandler[]}
 */
function buildProfileHandlers(moduleParams) {
  const profileHandlers = [];

  if (_dataInitialized.WeboCtx) {
    const profileHandler = buildProfileHandler(moduleParams?.weboCtxConf, getContextualProfile,
      false, WEBO_CTX_SOURCE_LABEL);
    if (profileHandler) {
      profileHandlers.push(profileHandler)
    } else {
      logMessage('skip contextual profile: no data');
    }
  }

  if (_dataInitialized.WeboUser) {
    const profileHandler = buildProfileHandler(moduleParams?.weboUserDataConf, getWeboUserDataProfile,
      true, WEBO_USER_DATA_SOURCE_LABEL);
    if (profileHandler) {
      profileHandlers.push(profileHandler)
    } else {
      logMessage('skip wam profile: no data');
    }
  }

  if (_dataInitialized.SfbxLite) {
    const profileHandler = buildProfileHandler(moduleParams?.sfbxLiteDataConf, getSfbxLiteDataProfile,
      false, SFBX_LITE_DATA_SOURCE_LABEL);
    if (profileHandler) {
      profileHandlers.push(profileHandler)
    } else {
      logMessage('skip sfbx lite profile: no data');
    }
  }

  return profileHandlers;
}
/**
 * @typedef {Object} ProfileHandler
 * @property {Profile} data
 * @property {dataCallbackMetadata} metadata
 * @property {setPrebidTargetingCallback} setTargeting
 * @property {sendToBiddersCallback} sendToBidders
 * @property {dataCallback} onData
 */

/**
 * @callback buildProfileHandlerCallback
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} dataConf
 * @returns {[Profile,boolean]} profile + is default flag
 */

/**
 * return specific profile handler
 * @param {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} dataConf
 * @param {buildProfileHandlerCallback} callback
 * @param {boolean} user
 * @param {string} source
 * @returns {ProfileHandler}
 */
function buildProfileHandler(dataConf, callback, user, source) {
  if (!dataConf) {
    return;
  }

  const [data, isDefault] = callback(dataConf);
  if (isEmpty(data)) {
    return;
  }

  return {
    data: data,
    metadata: {
      user: user,
      source: source,
      isDefault: !!isDefault,
    },
    setTargeting: dataConf.setPrebidTargeting,
    sendToBidders: dataConf.sendToBidders,
    onData: dataConf.onData,
  };
}

/** return contextual profile
 * @param {WeboCtxConf} weboCtxConf
 * @returns {[Profile,boolean]} contextual profile + isDefault boolean flag
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
 * @returns {[Profile,boolean]} weboUserData profile  + isDefault boolean flag
 */
function getWeboUserDataProfile(weboUserDataConf) {
  return getDataFromLocalStorage(weboUserDataConf,
    () => _weboUserDataUserProfile,
    (data) => _weboUserDataUserProfile = data,
    DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY,
    LOCAL_STORAGE_USER_TARGETING_SECTION,
    WEBO_USER_DATA_SOURCE_LABEL);
}

/** return weboUserData profile
 * @param {SfbxLiteDataConf} sfbxLiteDataConf
 * @returns {[Profile,boolean]} sfbxLiteData profile + isDefault boolean flag
 */
function getSfbxLiteDataProfile(sfbxLiteDataConf) {
  return getDataFromLocalStorage(sfbxLiteDataConf,
    () => _sfbxLiteDataProfile,
    (data) => _sfbxLiteDataProfile = data,
    DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY,
    LOCAL_STORAGE_LITE_TARGETING_SECTION,
    SFBX_LITE_DATA_SOURCE_LABEL);
}

/**
 * @callback cacheGetCallback
 * @returns {Profile}
 */
/**
 * @callback cacheSetCallback
 * @param {Profile} profile
 * @returns {void}
 */

/** return generic webo data profile
 * @param {WeboUserDataConf|SfbxLiteDataConf} weboDataConf
 * @param {cacheGetCallback} cacheGet
 * @param {cacheSetCallback} cacheSet
 * @param {string} defaultLocalStorageProfileKey
 * @param {string} targetingSection
 * @param {string} source
 * @returns {[Profile,boolean]} webo (user|lite) data profile + isDefault boolean flag
 */
function getDataFromLocalStorage(weboDataConf, cacheGet, cacheSet, defaultLocalStorageProfileKey, targetingSection, source) {
  const defaultProfile = weboDataConf.defaultProfile || {};

  if (storage.localStorageIsEnabled() && !cacheGet()) {
    const localStorageProfileKey = weboDataConf.localStorageProfileKey || defaultLocalStorageProfileKey;

    const entry = storage.getDataFromLocalStorage(localStorageProfileKey);
    if (entry) {
      const data = JSON.parse(entry);
      if (data && isPlainObject(data) && data.hasOwnProperty(targetingSection)) {
        /** @type {profile} */
        const profile = data[targetingSection];
        const valid = isValidProfile(profile);
        if (!valid) {
          logWarn(`found invalid ${source} profile on local storage key ${localStorageProfileKey}, section ${targetingSection}`);

          return;
        }

        if (!isEmpty(data)) {
          cacheSet(profile);
        }
      }
    }
  }

  const profile = cacheGet();

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
  /** @type {ModuleParams} */
  const moduleParams = moduleConfig?.params || {};

  if (!_dataInitialized.WeboCtx) {
    handleBidRequestData(reqBidsConfigObj, moduleParams);

    onDone();

    return;
  }

  /** @type {WeboCtxConf} */
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

  /** @type {Object[]} */
  const adUnits = reqBids.adUnits || getGlobal().adUnits;

  try {
    adUnits.forEach(
      adUnit => adUnit.bids?.forEach(
        bid => profileHandlers.forEach(ph => {
          // logMessage(`check if bidder '${bid.bidder}' and adunit '${adUnit.code} are share ${ph.metadata.source} data`);

          const [data, metadata] = copyDataAndMetadata(ph);
          if (ph.sendToBidders(bid, adUnit.code, data, metadata)) {
            // logMessage(`handling bidder '${bid.bidder}' with ${ph.metadata.source} data`);

            handleBid(reqBids, bid, data, ph.metadata);
          }
        })
      )
    );
  } catch (e) {
    logError('unable to send data to bidders:', e);
  }

  profileHandlers.forEach(ph => {
    try {
      const [data, metadata] = copyDataAndMetadata(ph);
      ph.onData(data, metadata);
    } catch (e) {
      logError(`error while executure onData callback with ${ph.metadata.source}-based data:`, e);
    }
  });
}
/** function that handles bid request data
 * @param {ProfileHandler} ph profile handler
 * @returns {[Profile,dataCallbackMetadata]} deeply copy data + metadata
 */
function copyDataAndMetadata(ph) {
  return [deepClone(ph.data), deepClone(ph.metadata)];
}

/** @type {string} */
const APPNEXUS = 'appnexus';

/** @type {string} */
const PUBMATIC = 'pubmatic';

/** @type {string} */
const RUBICON = 'rubicon';

/** @type {string} */
const SMARTADSERVER = 'smartadserver';

/** @type {Object<string,string>} */
const bidderAliasRegistry = adapterManager.aliasRegistry || {};

/**
 * @callback specificBidHandlerCallback
 * @param {Object} bid
 * @param {Profile} profile
 * @param {dataCallbackMetadata} metadata
 * @returns {void}
 */

/** @type {Object<string,specificBidHandlerCallback>} */
const specificBidHandlers = {
  [APPNEXUS]: handleAppnexusBid,
  [PUBMATIC]: handlePubmaticBid,
  [SMARTADSERVER]: handleSmartadserverBid,
  [RUBICON]: handleRubiconBid,
}

/** handle individual bid
 * @param {Object} reqBids
 * @param {Object} bid
 * @param {Profile} profile
 * @param {dataCallbackMetadata} metadata
 * @returns {void}
 */
function handleBid(reqBids, bid, profile, metadata) {
  handleBidViaORTB2(reqBids, bid, profile, metadata);

  /** @type {string} */
  const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

  if (bidder in specificBidHandlers) {
    const bidHandler = specificBidHandlers[bidder];
    bidHandler(bid, profile, metadata);
  }
}

/** handle appnexus/xandr bid
 * @param {Object} bid
 * @param {Profile} profile
 * @returns {void}
 */
function handleAppnexusBid(bid, profile) {
  const base = 'params.keywords';
  assignProfileToObject(bid, base, profile);
}

/** handle pubmatic bid
 * @param {Object} bid
 * @param {Profile} profile
 * @returns {void}
 */
function handlePubmaticBid(bid, profile) {
  const sep = '|';
  const subsep = ',';

  bid.params ||= {};

  /** @type {string} */
  const data = bid.params.dctr || '';
  const target = new Set(data.split(sep).filter((x) => x.length > 0));

  Object.entries(profile).forEach(([key, values]) => {
    const value = values.join(subsep);
    const keyword = `${key}=${value}`;
    target.add(keyword);
  });

  bid.params.dctr = Array.from(target).join(sep);
}

/** handle smartadserver bid
 * @param {Object} bid
 * @param {Profile} profile
 * @returns {void}
 */
function handleSmartadserverBid(bid, profile) {
  const sep = ';';

  bid.params ||= {};

  /** @type {string} */
  const data = bid.params.target || '';
  const target = new Set(data.split(sep).filter((x) => x.length > 0));

  Object.entries(profile).forEach(([key, values]) => {
    values.forEach(value => {
      const keyword = `${key}=${value}`;
      target.add(keyword);
    })
  });

  bid.params.target = Array.from(target).join(sep);
}

/** handle rubicon bid
 * @param {Object} bid
 * @param {Profile} profile
 * @param {dataCallbackMetadata} metadata
 * @returns {void}
 */
function handleRubiconBid(bid, profile, metadata) {
  if (isBoolean(metadata.user)) {
    const section = metadata.user ? 'visitor' : 'inventory';
    const base = `params.${section}`;
    assignProfileToObject(bid, base, profile);
  } else {
    logMessage(`SKIP bidder '${bid.bidder}', data from '${metadata.source}' is not defined as user or site-centric`);
  }
}

/** handle generic bid via ortb2 arbitrary data
 * @param reqBids
 * @param {Object} bid
 * @param {Profile} profile
 * @param {dataCallbackMetadata} metadata
 * @returns {void}
 */
function handleBidViaORTB2(reqBids, bid, profile, metadata) {
  if (isBoolean(metadata.user)) {
    logMessage(`bidder '${bid.bidder}' is not directly supported, trying set data via bidder ortb2 fpd`);
    const section = metadata.user ? 'user' : 'site';
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
 * @param {Profile} profile
 * @returns {void}
 */
function assignProfileToObject(destination, base, profile) {
  Object.keys(profile).forEach(key => {
    const path = `${base}.${key}`;
    deepSetValue(destination, path, profile[key])
  })
}

/** set bigsea contextual profile on module state
 * @param {?Object} data
 * @returns {void}
 */
export function setWeboContextualProfile(data) {
  if (data && isPlainObject(data) && isValidProfile(data) && !isEmpty(data)) {
    _weboContextualProfile = data;
  }
}

/** onSuccess callback type
 * @callback successCallback
 * @param {?Object} data
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

  const success = (response, req) => {
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
    } else {
      logWarn(`unexpected http status response ${req.status} with response`, response);
      onDone();
    }
  };

  const error = (e) => {
    onDone();
    logError(`unable to get weborama data`, e);
  };

  const callback = {
    success,
    error,
  };

  const options = {
    method: 'GET',
    withCredentials: false,
  };

  ajax(urlProfileAPI, callback, null, options);
}

export const weboramaSubmodule = {
  name: SUBMODULE_NAME,
  init,
  getTargetingData,
  getBidRequestData,
};

submodule(MODULE_NAME, weboramaSubmodule);
