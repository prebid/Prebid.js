import { submodule } from '../src/hook.js';
import { logError, isStr, logMessage, isPlainObject, isEmpty, isFn, mergeDeep, logWarn } from '../src/utils.js';
import { config as conf } from '../src/config.js';
import { getDeviceType as fetchDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { getLowEntropySUA } from '../src/fpd/sua.js';

import { continueAuction } from './priceFloors.js'; // eslint-disable-line prebid/validate-imports

const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'pubmatic',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'PubMatic-Rtd-Provider: ',
  UTM: 'utm_',
  UTM_VALUES: {
    TRUE: '1',
    FALSE: '0'
  },
  TIME_OF_DAY_VALUES: {
    MORNING: 'morning',
    AFTERNOON: 'afternoon',
    EVENING: 'evening',
    NIGHT: 'night',
  },
  ENDPOINTS: {
    BASEURL: 'https://ads.pubmatic.com/AdServer/js/ym/',
    FLOORS_ENDPOINT: 'floors.json',
    CONFIGS_ENDPOINT: 'configs.json'
  }
});

const BROWSER_REGEX_MAP = [
  { regex: /\b(?:crios)\/([\w\.]+)/i, id: 1 }, // Chrome for iOS
  { regex: /edg(?:e|ios|a)?\/([\w\.]+)/i, id: 2 }, // Edge
  { regex: /(opera)(?:.+version\/|[\/ ]+)([\w\.]+)/i, id: 3 }, // Opera
  { regex: /(?:ms|\()(ie) ([\w\.]+)/i, id: 4 }, // Internet Explorer
  { regex: /fxios\/([-\w\.]+)/i, id: 5 }, // Firefox for iOS
  { regex: /((?:fban\/fbios|fb_iab\/fb4a)(?!.+fbav)|;fbav\/([\w\.]+);)/i, id: 6 }, // Facebook In-App Browser
  { regex: / wv\).+(chrome)\/([\w\.]+)/i, id: 7 }, // Chrome WebView
  { regex: /droid.+ version\/([\w\.]+)\b.+(?:mobile safari|safari)/i, id: 8 }, // Android Browser
  { regex: /(chrome|chromium|crios)\/v?([\w\.]+)/i, id: 9 }, // Chrome
  { regex: /version\/([\w\.\,]+) .*mobile\/\w+ (safari)/i, id: 10 }, // Safari Mobile
  { regex: /version\/([\w(\.|\,)]+) .*(mobile ?safari|safari)/i, id: 11 }, // Safari
  { regex: /(firefox)\/([\w\.]+)/i, id: 12 } // Firefox
];

let _fetchFloorRulesPromise = null, _fetchConfigPromise = null, _mergedConfigPromise = null;
export let _country;

export const getCurrentTimeOfDay = () => {
  const currentHour = new Date().getHours();

  return currentHour < 5 ? CONSTANTS.TIME_OF_DAY_VALUES.NIGHT
    : currentHour < 12 ? CONSTANTS.TIME_OF_DAY_VALUES.MORNING
      : currentHour < 17 ? CONSTANTS.TIME_OF_DAY_VALUES.AFTERNOON
        : currentHour < 19 ? CONSTANTS.TIME_OF_DAY_VALUES.EVENING
          : CONSTANTS.TIME_OF_DAY_VALUES.NIGHT;
}

export const getBrowserType = () => {
    const brandName = getLowEntropySUA()?.browsers
      ?.map(b => b.brand.toLowerCase())
      .join(' ') || '';
    const browserMatch = brandName ? BROWSER_REGEX_MAP.find(({ regex }) => regex.test(brandName)) : -1;
  
    if (browserMatch?.id) return browserMatch.id.toString();
  
    const userAgent = navigator?.userAgent;
    let browserIndex = userAgent == null ? -1 : 0;
  
    if (userAgent) {
      browserIndex = BROWSER_REGEX_MAP.find(({ regex }) => regex.test(userAgent))?.id || 0;
    }
    return browserIndex.toString();
}
  

export const getOs = () => getOS().toString();

export const getDeviceType = () => fetchDeviceType().toString();

export const getCountry = () => _country;

export const getUtm = () => {
  const url = new URL(window.location?.href);
  const urlParams = new URLSearchParams(url?.search);
  return urlParams && urlParams.toString().includes(CONSTANTS.UTM) ? CONSTANTS.UTM_VALUES.TRUE : CONSTANTS.UTM_VALUES.FALSE;
}

export const getFloorsConfig = (floorsData, profileConfigs) => {
    if (!isPlainObject(profileConfigs) || isEmpty(profileConfigs)) {
      logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
      return undefined;
    }
  
    // Floor configs from adunit / setconfig
    const defaultFloorConfig = conf.getConfig()?.floors ?? {};
    // Plugin data from profile
    const dynamicFloors = profileConfigs?.plugins?.dynamicFloors;
  
    if (!dynamicFloors?.enabled || !dynamicFloors.config) {
      // If plugin disabled or config not present, return default floor config
      return { floors: { ...defaultFloorConfig } };
    }

    let config = { ...dynamicFloors.config };
    
    // default values provided by publisher on profile
    const defaultValues = config.defaultValues ?? {};
    // If floorsData is not present, use default values
    const finalFloorsData = floorsData ?? { ...defaultValues }; // TODO: Need to be confirmed from product
  
    // If traffic allocation is overridden, overwrite the skiprate from floorsData
    // with the one provided by publisher in profile
    if (config.trafficAllocation === 1) {   // TODO: confirm from api team for data type
      finalFloorsData.skipRate = config.skipRate; // TODO: confirm with api team for calculation
    }

    // Delete unnecessary fields
    delete config.trafficAllocation; // TODO: confirm with api team
    delete config.floorMinEnabled; // Confirm if this deletion is necessary

    // merge configs
    return {
      floors: {
        ...defaultFloorConfig,
        ...config,
        data: finalFloorsData,
        additionalSchemaFields: {
          deviceType: getDeviceType,
          timeOfDay: getCurrentTimeOfDay,
          browser: getBrowserType,
          os: getOs,
          utm: getUtm,
          country: getCountry,
        },
      },
    };
};

export const fetchFloorsData = async (publisherId, profileId) => {
  try {
    const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.FLOORS_ENDPOINT}`;
    const response = await fetch(url);

    if (!response.ok) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching floors: No response`);
      return;
    }

    _country = response.headers?.get('country_code')?.split(',')[0]?.trim() ?? undefined;
    const floorsData = await response.json();
    return floorsData;
  } catch (error) {
    logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching floors:`, error);
  }
};

export const fetchProfileConfigs = async (publisherId, profileId) => {
  try {
    const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.CONFIGS_ENDPOINT}`;

    const response = await fetch(url);
    if (!response?.ok) {
      logError(CONSTANTS.LOG_PRE_FIX + 'Error while fetching profile configs: Not ok');
    }

    const conf = await response.json();
    return conf;
  } catch (error) {
    logError(CONSTANTS.LOG_PRE_FIX + 'Error while fetching profile configs:', error);
  }
}

/**
 * Initialize the Pubmatic RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
const init = (config, _userConsent) => {
  const publisherId = config?.params?.publisherId;
  const profileId = config?.params?.profileId;

  if (!publisherId || !isStr(publisherId) || !profileId || !isStr(profileId)) {
    logError(
      `${CONSTANTS.LOG_PRE_FIX} ${!publisherId ? 'Missing publisher Id.'
        : !isStr(publisherId) ? 'Publisher Id should be a string.'
          : !profileId ? 'Missing profile Id.'
            : 'Profile Id should be a string.'
      }`
    );
    return false;
  }

  if (!isFn(continueAuction)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} continueAuction is not a function. Please ensure to add priceFloors module.`);
    return false;
  }

  _fetchFloorRulesPromise = fetchFloorsData(publisherId, profileId);
  _fetchConfigPromise = fetchProfileConfigs(publisherId, profileId);
  // TODO: Need to confirm if we need to wait for both promises to resolve or we can have some timeout or a single call
  _mergedConfigPromise = Promise.all([_fetchFloorRulesPromise, _fetchConfigPromise]).then(
    ([floorsData, profileConfigs]) => {
        const floorsConfig = getFloorsConfig(floorsData, profileConfigs);
        floorsConfig && conf.setConfig(floorsConfig);
  });
  return true;
}

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
    _mergedConfigPromise && _mergedConfigPromise.then(() => {
    const hookConfig = {
      reqBidsConfigObj,
      context: this,
      nextFn: () => true,
      haveExited: false,
      timer: null
    };
    continueAuction(hookConfig);
    const ortb2 = {
      user: {
        ext: {
          ctr: _country,
        }
      }
    }

    mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, {
      [CONSTANTS.SUBMODULE_NAME]: ortb2
    });
    callback();
  }).catch((error) => {
    logError(CONSTANTS.LOG_PRE_FIX, 'Error in updating floors :', error);
    callback();
  });
}

/** @type {RtdSubmodule} */
export const pubmaticSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: CONSTANTS.SUBMODULE_NAME,
  init,
  getBidRequestData,
};

export const registerSubModule = () => {
  submodule(CONSTANTS.REAL_TIME_MODULE, pubmaticSubmodule);
}

registerSubModule();
