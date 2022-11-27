/**
 * This module adds Weborama provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch contextual data (page-centric) from Weborama server
 * and may access user-centric data from local storage
 * @module modules/weboramaRtdProvider
 * @requires module:modules/realTimeData
 */

/** profile metadata
 * @typedef dataCallbackMetadata
 * @property {boolean} user if true it is user-centric data
 * @property {string} source describe the source of data, if 'contextual' or 'wam'
 * @property {boolean} isDefault if true it the default profile defined in the configuration
 */

/** profile from contextual, wam or sfbx
 * @typedef {Object.<string,string[]>} Profile
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
 * @property {?setPrebidTargetingCallback|?boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?WeboCtxConf} weboCtxConf site-centric contextual configuration
 * @property {?WeboUserDataConf} weboUserDataConf user-centric wam configuration
 * @property {?SfbxLiteDataConf} sfbxLiteDataConf site-centric lite configuration
 */

/**
 * @callback assetIDcallback
 * @returns {string} should return asset identifier using the form datasource:docId
 */
/**
 * @typedef {Object} WeboCtxConf
 * @property {string} token required token to be used on bigsea contextual API requests
 * @property {?string} targetURL specify the target url instead use the referer
 * @property {?assetIDcallback|?string} assetID specifies the assert identifier using the form datasource:docId or via callback
 * @property {?setPrebidTargetingCallback|?boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?dataCallback} onData callback
 * @property {?Profile} defaultProfile to be used if the profile is not found
 * @property {?boolean} enabled if false, will ignore this configuration
 * @property {?string} baseURLProfileAPI to be used to point to a different domain than ctx.weborama.com
 */

/**
 * @typedef {Object} WeboUserDataConf
 * @property {?number} accountId wam account id
 * @property {?setPrebidTargetingCallback|?boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?Profile} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is 'webo_wam2gam_entry')
 * @property {?boolean} enabled if false, will ignore this configuration
 */

/**
 * @typedef {Object} SfbxLiteDataConf
 * @property {?setPrebidTargetingCallback|?boolean|?Object} setPrebidTargeting if true, will set the GAM targeting (default undefined)
 * @property {?sendToBiddersCallback|?boolean|?Object} sendToBidders if true, will send the contextual profile to all bidders, else expects a list of allowed bidders (default undefined)
 * @property {?Profile} defaultProfile to be used if the profile is not found
 * @property {?dataCallback} onData callback
 * @property {?string} localStorageProfileKey can be used to customize the local storage key (default is '_lite')
 * @property {?boolean} enabled if false, will ignore this configuration
 */

/** common configuration between contextual, wam and sfbx
 * @typedef {WeboCtxConf|WeboUserDataConf|SfbxLiteDataConf} CommonConf
 */

import {
  getGlobal
} from '../src/prebidGlobal.js';
import {
  deepClone,
  deepSetValue,
  isEmpty,
  isFn,
  logError,
  logMessage,
  isArray,
  isStr,
  isBoolean,
  isPlainObject,
  logWarn,
  mergeDeep,
  tryAppendQueryString
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

export const storage = getStorageManager({
  gvlid: GVLID,
  moduleName: SUBMODULE_NAME
});

/**
 * @typedef {Object} Component
 * @property {boolean} initialized
 * @property {?Profile} data
 * @property {boolean} user if true it is user-centric data
 * @property {string} source describe the source of data, if 'contextual' or 'wam'
 * @property {buildProfileHandlerCallbackBuilder} callbackBuilder
 */

/**
 * @typedef {Object} Components
 * @property {Component} WeboCtx
 * @property {Component} WeboUserData
 * @property {Component} SfbxLiteData
 */

/**
 * @classdesc Weborama Real Time Data Provider
 * @class
 */
class WeboramaRtdProvider {
  #components;
  name = SUBMODULE_NAME;
  /**
   * @param  {Components} components
   */
  constructor(components) {
    this.#components = components;
  }
  /** Initialize module
   * @method
   * @param {Object} moduleConfig
   * @param {?ModuleParams} moduleConfig.params
   * @return {boolean} true if module was initialized with success
   */
  init(moduleConfig) {
    /** @type {Object} */
    const globalDefaults = {
      setPrebidTargeting: true,
      sendToBidders: true,
      onData: () => {
        /* do nothing */
      }
    };
    /** @type {ModuleParams} */
    const moduleParams = Object.assign({}, globalDefaults, moduleConfig?.params || {});

    // reset profiles

    this.#components.WeboCtx.data = null;
    this.#components.WeboUserData.data = null;
    this.#components.SfbxLiteData.data = null;

    this.#components.WeboCtx.initialized = this.#initSubSection(moduleParams, WEBO_CTX_CONF_SECTION, 'token');
    this.#components.WeboUserData.initialized = this.#initSubSection(moduleParams, WEBO_USER_DATA_CONF_SECTION);
    this.#components.SfbxLiteData.initialized = this.#initSubSection(moduleParams, SFBX_LITE_DATA_CONF_SECTION);

    return Object.values(this.#components).some((c) => c.initialized);
  }

  /** function that will allow RTD sub-modules to modify the AdUnit object for each auction
   * @method
   * @param {Object} reqBidsConfigObj
   * @param {doneCallback} onDone
   * @param {Object} moduleConfig
   * @param {?ModuleParams} moduleConfig.params
   * @returns {void}
   */
  getBidRequestData(reqBidsConfigObj, onDone, moduleConfig) {
    /** @type {ModuleParams} */
    const moduleParams = moduleConfig?.params || {};

    if (!this.#components.WeboCtx.initialized) {
      this.#handleBidRequestData(reqBidsConfigObj, moduleParams);

      onDone();

      return;
    }

    /** @type {WeboCtxConf} */
    const weboCtxConf = moduleParams.weboCtxConf || {};

    this.#fetchContextualProfile(weboCtxConf, (data) => {
      logMessage('fetchContextualProfile on getBidRequestData is done');

      this.#setWeboContextualProfile(data);
    }, () => {
      this.#handleBidRequestData(reqBidsConfigObj, moduleParams);

      onDone();
    });
  }

  /** function that provides ad server targeting data to RTD-core
   * @method
   * @param {string[]} adUnitsCodes
   * @param {Object} moduleConfig
   * @param {?ModuleParams} moduleConfig.params
   * @returns {Object} target data
   */
  getTargetingData(adUnitsCodes, moduleConfig) {
    /** @type {ModuleParams} */
    const moduleParams = moduleConfig?.params || {};

    const profileHandlers = this.#buildProfileHandlers(moduleParams);

    if (isEmpty(profileHandlers)) {
      logMessage('no data to set targeting');
      return {};
    }

    try {
      return adUnitsCodes.reduce((data, adUnitCode) => {
        data[adUnitCode] = profileHandlers.reduce((targeting, ph) => {
          // logMessage(`check if should set targeting for adunit '${adUnitCode}'`);
          const [data, metadata] = this.#copyDataAndMetadata(ph);
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

  /** Initialize subsection module
   * @method
   * @private
   * @param {ModuleParams} moduleParams
   * @param {string} subSection subsection name to initialize
   * @param {string[]} requiredFields
   * @return {boolean} true if module subsection was initialized with success
   */
  #initSubSection(moduleParams, subSection, ...requiredFields) {
    /** @type {CommonConf} */
    const weboSectionConf = moduleParams[subSection] || { enabled: false };

    if (weboSectionConf.enabled === false) {
      delete moduleParams[subSection];

      return false;
    }

    try {
      this.#normalizeConf(moduleParams, weboSectionConf);

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
   * @method
   * @private
   * @param {ModuleParams} moduleParams
   * @param {CommonConf} submoduleParams
   * @return {void}
   * @throws will throw an error in case of invalid configuration
   */
  // eslint-disable-next-line no-dupe-class-members
  #normalizeConf(moduleParams, submoduleParams) {
    submoduleParams.defaultProfile = submoduleParams.defaultProfile || {};

    const { setPrebidTargeting, sendToBidders, onData } = moduleParams;

    submoduleParams.setPrebidTargeting ??= setPrebidTargeting;
    submoduleParams.sendToBidders ??= sendToBidders;
    submoduleParams.onData ??= onData;

    // handle setPrebidTargeting
    this.#coerceSetPrebidTargeting(submoduleParams);

    // handle sendToBidders
    this.#coerceSendToBidders(submoduleParams);

    if (!isFn(submoduleParams.onData)) {
      throw 'onData parameter should be a callback';
    }

    if (!isValidProfile(submoduleParams.defaultProfile)) {
      throw 'defaultProfile is not valid';
    }
  }

  /** coerce setPrebidTargeting to a callback
   * @method
   * @private
   * @param {CommonConf} submoduleParams
   * @return {void}
   * @throws will throw an error in case of invalid configuration
   */
  // eslint-disable-next-line no-dupe-class-members
  #coerceSetPrebidTargeting(submoduleParams) {
    try {
      submoduleParams.setPrebidTargeting = this.#wrapValidatorCallback(submoduleParams.setPrebidTargeting);
    } catch (e) {
      throw `invalid setPrebidTargeting: ${e}`;
    }
  }

  /** coerce sendToBidders to a callback
   * @method
   * @private
   * @param {CommonConf} submoduleParams
   * @return {void}
   * @throws will throw an error in case of invalid configuration
   */
  // eslint-disable-next-line no-dupe-class-members
  #coerceSendToBidders(submoduleParams) {
    let sendToBidders = submoduleParams.sendToBidders;

    if (isPlainObject(sendToBidders)) {
      const sendToBiddersMap = Object.entries(sendToBidders).reduce((map, [key, value]) => {
        map[key] = this.#wrapValidatorCallback(value);
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
      submoduleParams.sendToBidders = this.#wrapValidatorCallback(submoduleParams.sendToBidders,
        (bid) => bid.bidder);
    } catch (e) {
      throw `invalid sendToBidders: ${e}`;
    }
  }

  /**
   * @typedef {Object} AdUnit
   * @property {Object[]} bids
   */
  /** function that handles bid request data
   * @method
   * @private
   * @param {Object} reqBidsConfigObj
   * @param {AdUnit[]} reqBidsConfigObj.adUnits
   * @param {Object} reqBidsConfigObj.ortb2Fragments
   * @param {Object} reqBidsConfigObj.ortb2Fragments.bidder
   * @param {ModuleParams} moduleParams
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleBidRequestData(reqBidsConfigObj, moduleParams) {
    const profileHandlers = this.#buildProfileHandlers(moduleParams);

    if (isEmpty(profileHandlers)) {
      logMessage('no data to send to bidders');
      return;
    }

    const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;

    try {
      adUnits.forEach(
        adUnit => adUnit.bids?.forEach(
          bid => profileHandlers.forEach(ph => {
            // logMessage(`check if bidder '${bid.bidder}' and adunit '${adUnit.code} are share ${ph.metadata.source} data`);

            const [data, metadata] = this.#copyDataAndMetadata(ph);
            if (ph.sendToBidders(bid, adUnit.code, data, metadata)) {
              // logMessage(`handling bidder '${bid.bidder}' with ${ph.metadata.source} data`);

              this.#handleBid(reqBidsConfigObj, bid, data, ph.metadata);
            }
          })
        )
      );
    } catch (e) {
      logError('unable to send data to bidders:', e);
    }

    profileHandlers.forEach(ph => {
      try {
        const [data, metadata] = this.#copyDataAndMetadata(ph);
        ph.onData(data, metadata);
      } catch (e) {
        logError(`error while execute onData callback with ${ph.metadata.source}-based data:`, e);
      }
    });
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
   * @method
   * @private
   * @param {WeboCtxConf} weboCtxConf
   * @param {successCallback} onSuccess callback
   * @param {doneCallback} onDone callback
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #fetchContextualProfile(weboCtxConf, onSuccess, onDone) {
    const token = weboCtxConf.token;
    const baseURLProfileAPI = weboCtxConf.baseURLProfileAPI || BASE_URL_CONTEXTUAL_PROFILE_API;

    let path = '/profile';
    let queryString = '';
    queryString = tryAppendQueryString(queryString, 'token', token);

    if (weboCtxConf.assetID) {
      path = '/document-profile';

      let assetID = weboCtxConf.assetID;
      if (isFn(assetID)) {
        try {
          assetID = weboCtxConf.assetID();
        } catch (e) {
          logError('unexpected error while fetching asset id from callback', e);

          onDone();

          return;
        }
      }

      if (!assetID) {
        logError('missing asset id');

        onDone();

        return;
      }

      queryString = tryAppendQueryString(queryString, 'assetId', assetID);
    }

    const targetURL = weboCtxConf.targetURL || document.URL;
    queryString = tryAppendQueryString(queryString, 'url', targetURL);

    const urlProfileAPI = `https://${baseURLProfileAPI}/api${path}?${queryString}`;

    const success = (response, req) => {
      if (req.status === 200) {
        const data = JSON.parse(response);
        onSuccess(data);
      } else {
        throw `unexpected http status response ${req.status} with response ${response}`;
      }

      onDone();
    };

    const error = (e, req) => {
      logError(`unable to get weborama data`, e, req);

      onDone();
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

  /** set bigsea contextual profile on module state
   * @method
   * @private
   * @param {?Object} data
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #setWeboContextualProfile(data) {
    if (data && isPlainObject(data) && isValidProfile(data) && !isEmpty(data)) {
      this.#components.WeboCtx.data = data;
    }
  }

  /** function that provides data handlers based on the configuration
   * @method
   * @private
   * @param {ModuleParams} moduleParams
   * @returns {ProfileHandler[]}
   */
  // eslint-disable-next-line no-dupe-class-members
  #buildProfileHandlers(moduleParams) {
    const steps = [{
      component: this.#components.WeboCtx,
      conf: moduleParams?.weboCtxConf,
    }, {
      component: this.#components.WeboUserData,
      conf: moduleParams?.weboUserDataConf,
    }, {
      component: this.#components.SfbxLiteData,
      conf: moduleParams?.sfbxLiteDataConf,
    }];

    return steps.filter(step => step.component.initialized).reduce((ph, { component, conf }) => {
      const user = component.user;
      const source = component.source;
      const callback = component.callbackBuilder(component /* equivalent to this */);
      const profileHandler = this.#buildProfileHandler(conf, callback, user, source);
      if (profileHandler) {
        ph.push(profileHandler);
      } else {
        logMessage(`skip ${source} profile: no data`);
      }

      return ph;
    }, []);
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
   * @callback buildProfileHandlerCallbackBuilder
   * @param {Component} component
   * @returns {buildProfileHandlerCallback}
   */

  /**
   * @callback buildProfileHandlerCallback
   * @param {CommonConf} dataConf
   * @returns {[Profile,boolean]} profile + is default flag
   */

  /**
   * return specific profile handler
   * @method
   * @private
   * @param {CommonConf} dataConf
   * @param {buildProfileHandlerCallback} callback
   * @param {boolean} user
   * @param {string} source
   * @returns {ProfileHandler}
   */
  // eslint-disable-next-line no-dupe-class-members
  #buildProfileHandler(dataConf, callback, user, source) {
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
  /** handle individual bid
   * @method
   * @private
   * @param {Object} reqBidsConfigObj
   * @param {Object} reqBidsConfigObj.ortb2Fragments
   * @param {Object} reqBidsConfigObj.ortb2Fragments.bidder
   * @param {Object} bid
   * @param {string} bid.bidder
   * @param {Profile} profile
   * @param {dataCallbackMetadata} metadata
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleBid(reqBidsConfigObj, bid, profile, metadata) {
    this.#handleBidViaORTB2(reqBidsConfigObj, bid.bidder, profile, metadata);

    /** @type {Object.<string,string>} */
    const bidderAliasRegistry = adapterManager.aliasRegistry || {};

    /** @type {string} */
    const bidder = bidderAliasRegistry[bid.bidder] || bid.bidder;

    switch (bidder) {
      case 'appnexus':
        this.#handleAppnexusBid(bid, profile);
        break;
      case 'pubmatic':
        this.#handlePubmaticBid(bid, profile);
        break;
      case 'smartadserver':
        this.#handleSmartadserverBid(bid, profile);
        break;
      case 'rubicon':
        this.#handleRubiconBid(bid, profile, metadata);
        break;
    }
  }

  /** function that handles bid request data
   * @method
   * @private
   * @param {ProfileHandler} ph profile handler
   * @returns {[Profile,dataCallbackMetadata]} deeply copy data + metadata
   */
  // eslint-disable-next-line no-dupe-class-members
  #copyDataAndMetadata(ph) {
    return [deepClone(ph.data), deepClone(ph.metadata)];
  }

  /** handle appnexus/xandr bid
   * @method
   * @private
   * @param {Object} bid
   * @param {Object} bid.params
   * @param {Object} bid.params.keyword
   * @param {Profile} profile
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleAppnexusBid(bid, profile) {
    const base = 'params.keywords';
    this.#assignProfileToObject(bid, base, profile);
  }

  /** handle pubmatic bid
   * @method
   * @private
   * @param {Object} bid
   * @param {Object} bid.params
   * @param {string} bid.params.dctr
   * @param {Profile} profile
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handlePubmaticBid(bid, profile) {
    const sep = '|';
    const subsep = ',';

    bid.params ||= {};

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
   * @method
   * @private
   * @param {Object} bid
   * @param {Object} bid.params
   * @param {string} bid.params.target
   * @param {Profile} profile
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleSmartadserverBid(bid, profile) {
    const sep = ';';

    bid.params ||= {};

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
   * @method
   * @private
   * @param {Object} bid
   * @param {string} bid.bidder
   * @param {Profile} profile
   * @param {dataCallbackMetadata} metadata
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleRubiconBid(bid, profile, metadata) {
    if (isBoolean(metadata.user)) {
      const section = metadata.user ? 'visitor' : 'inventory';
      const base = `params.${section}`;
      this.#assignProfileToObject(bid, base, profile);
    } else {
      logMessage(`SKIP bidder '${bid.bidder}', data from '${metadata.source}' is not defined as user or site-centric`);
    }
  }

  /** handle generic bid via ortb2 arbitrary data
   * @method
   * @private
   * @param {Object} reqBidsConfigObj
   * @param {Object} reqBidsConfigObj.ortb2Fragments
   * @param {Object} reqBidsConfigObj.ortb2Fragments.bidder
   * @param {string} bidder
   * @param {Profile} profile
   * @param {dataCallbackMetadata} metadata
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleBidViaORTB2(reqBidsConfigObj, bidder, profile, metadata) {
    if (isBoolean(metadata.user)) {
      logMessage(`bidder '${bidder}' is not directly supported, trying set data via bidder ortb2 fpd`);
      const section = metadata.user ? 'user' : 'site';
      const base = `${bidder}.${section}.ext.data`;

      this.#assignProfileToObject(reqBidsConfigObj.ortb2Fragments?.bidder, base, profile);
    } else {
      logMessage(`SKIP unsupported bidder '${bidder}', data from '${metadata.source}' is not defined as user or site-centric`);
    }
  }

  /**
   * assign profile to object
   * @method
   * @private
   * @param {Object} destination
   * @param {string} base
   * @param {Profile} profile
   * @returns {void}
   */
  // eslint-disable-next-line no-dupe-class-members
  #assignProfileToObject(destination, base, profile) {
    Object.entries(profile).forEach(([key, values]) => {
      const path = `${base}.${key}`;
      deepSetValue(destination, path, values);
    })
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
   * @method
   * @private
   * @param {*} value
   * @param {coerceCallback} coerce
   * @returns {validatorCallback}
   * @throws will throw an error in case of unsupported type
   */
  // eslint-disable-next-line no-dupe-class-members
  #wrapValidatorCallback(value, coerce = (x) => x) {
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
}

/**
 * check if profile is valid
 * @param {*} profile
 * @returns {boolean}
 */
export function isValidProfile(profile) {
  if (!isPlainObject(profile)) {
    return false;
  }

  return Object.values(profile).every((field) => isArray(field) && field.every(isStr));
}

/**
 * bind callback with component
 * @param {Component} component
 * @returns {buildProfileHandlerCallback}
 */
function getContextualProfile(component /* equivalent to this */) {
  /** return contextual profile
   * @param {WeboCtxConf} weboCtxConf
   * @returns {[Profile,boolean]} contextual profile + isDefault boolean flag
   */
  return function (weboCtxConf) {
    if (component.data) {
      return [component.data, false];
    }

    const defaultContextualProfile = weboCtxConf.defaultProfile || {};

    return [defaultContextualProfile, true];
  }
}

/**
 * bind callback with component
 * @param {Component} component
 * @returns {buildProfileHandlerCallback}
 */
function getWeboUserDataProfile(component /* equivalent to this */) {
  /** return weboUserData profile
   * @param {WeboUserDataConf} weboUserDataConf
   * @returns {[Profile,boolean]} weboUserData profile  + isDefault boolean flag
   */
  return function (weboUserDataConf) {
    return getDataFromLocalStorage(weboUserDataConf,
      () => component.data,
      (data) => component.data = data,
      DEFAULT_LOCAL_STORAGE_USER_PROFILE_KEY,
      LOCAL_STORAGE_USER_TARGETING_SECTION,
      WEBO_USER_DATA_SOURCE_LABEL);
  }
}

/**
 * bind callback with component
 * @param {Component} component
 * @returns {buildProfileHandlerCallback}
 */
function getSfbxLiteDataProfile(component /* equivalent to this */) {
  /** return weboUserData profile
   * @param {SfbxLiteDataConf} sfbxLiteDataConf
   * @returns {[Profile,boolean]} sfbxLiteData profile + isDefault boolean flag
   */
  return function getSfbxLiteDataProfile(sfbxLiteDataConf) {
    return getDataFromLocalStorage(sfbxLiteDataConf,
      () => component.data,
      (data) => component.data = data,
      DEFAULT_LOCAL_STORAGE_LITE_PROFILE_KEY,
      LOCAL_STORAGE_LITE_TARGETING_SECTION,
      SFBX_LITE_DATA_SOURCE_LABEL);
  }
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

  if (storage.hasLocalStorage() && storage.localStorageIsEnabled() && !cacheGet()) {
    const localStorageProfileKey = weboDataConf.localStorageProfileKey || defaultLocalStorageProfileKey;

    const entry = storage.getDataFromLocalStorage(localStorageProfileKey);
    if (entry) {
      const data = JSON.parse(entry);
      if (data && isPlainObject(data) && targetingSection in data) {
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
/** @type {Components} */
const components = {
  WeboCtx: {
    initialized: false,
    data: null,
    user: false,
    source: WEBO_CTX_SOURCE_LABEL,
    callbackBuilder: getContextualProfile,
  },
  WeboUserData: {
    initialized: false,
    data: null,
    user: true,
    source: WEBO_USER_DATA_SOURCE_LABEL,
    callbackBuilder: getWeboUserDataProfile,
  },
  SfbxLiteData: {
    initialized: false,
    data: null,
    user: false,
    source: SFBX_LITE_DATA_SOURCE_LABEL,
    callbackBuilder: getSfbxLiteDataProfile,
  },
};

export const weboramaSubmodule = new WeboramaRtdProvider(components);

submodule(MODULE_NAME, weboramaSubmodule);
