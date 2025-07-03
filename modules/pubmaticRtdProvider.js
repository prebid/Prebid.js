import { submodule } from '../src/hook.js';
import { logError, isStr, isPlainObject, isEmpty, isFn, mergeDeep, logMessage } from '../src/utils.js';
import { config as conf } from '../src/config.js';
import { getDeviceType as fetchDeviceType, getOS } from '../libraries/userAgentUtils/index.js';
import { getBrowserType, getCurrentTimeOfDay, getUtmValue } from '../libraries/pubmaticUtils/pubmaticUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

/**
 * This RTD module has a dependency on the priceFloors module.
 * We utilize the continueAuction function from the priceFloors module to incorporate price floors data into the current auction.
 */
import { continueAuction } from './priceFloors.js'; // eslint-disable-line prebid/validate-imports

const CONSTANTS = Object.freeze({
  SUBMODULE_NAME: 'pubmatic',
  REAL_TIME_MODULE: 'realTimeData',
  LOG_PRE_FIX: 'PubMatic-Rtd-Provider: ',
  ENDPOINTS: {
    BASEURL: 'https://ads.pubmatic.com/AdServer/js/pwt',
    CONFIGS: 'config.json'
  }
});

export const defaultValueTemplate = {
    currency: 'USD',
    skipRate: 0,
    schema: {
        fields: ['mediaType', 'size']
    }
};

export let _ymConfigPromise = null;
export let _configData = {};
export let _country;

// Getter Functions
export const getTimeOfDay = () => getCurrentTimeOfDay();
export const getBrowser = () => getBrowserType();
export const getOs = () => getOS().toString();
export const getDeviceType = () => fetchDeviceType().toString();
export const getCountry = () => _country;
export const getBidder = (request) => request?.bidder;
export const getUtm = () => getUtmValue();

export const setFloorsConfig = () => {
    const dynamicFloors = _configData?.plugins?.dynamicFloors;

    if (!dynamicFloors?.enabled || !dynamicFloors?.config) {
      return undefined;
    }

    // Floor configs from adunit / setconfig
    const defaultFloorConfig = conf.getConfig('floors') ?? {};
    if (defaultFloorConfig?.endpoint) {
      delete defaultFloorConfig.endpoint;
    }

    let ymUiConfig = { ...dynamicFloors.config };

    // default values provided by publisher on YM UI
    const defaultValues = ymUiConfig.defaultValues ?? {};
    // If floorsData is not present, use default values
    const ymFloorsData = dynamicFloors.data ?? { ...defaultValueTemplate, values: { ...defaultValues } };

    delete ymUiConfig.defaultValues;
    // If skiprate is provided in configs, overwrite the value in ymFloorsData
    (ymUiConfig.skipRate !== undefined) && (ymFloorsData.skipRate = ymUiConfig.skipRate);

    // merge default configs from page, configs
    return {
        floors: {
            ...defaultFloorConfig,
            ...ymUiConfig,
            data: ymFloorsData,
            additionalSchemaFields: {
                deviceType: getDeviceType,
                timeOfDay: getTimeOfDay,
                browser: getBrowser,
                os: getOs,
                utm: getUtm,
                country: getCountry,
                bidder: getBidder,
            },
        },
    };
};

export const getRtdConfig = async (publisherId, profileId) => {
  const apiResponse = await fetchData(publisherId, profileId);

  if (!isPlainObject(apiResponse) || isEmpty(apiResponse)) {
    logError(`${CONSTANTS.LOG_PRE_FIX} profileConfigs is not an object or is empty`);
  } else {
    // Check for each module in config
    if (apiResponse.plugins?.dynamicFloors) {
      try{
        conf.setConfig(setFloorsConfig());
        logMessage(`${CONSTANTS.LOG_PRE_FIX} dynamicFloors config set successfully`);
      } catch (error) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error setting dynamicFloors config: ${error}`);
      }
    }
  }
};

export const fetchData = async (publisherId, profileId) => {
    try {
      const url = `${CONSTANTS.ENDPOINTS.BASEURL}/${publisherId}/${profileId}/${CONSTANTS.ENDPOINTS.CONFIGS}`;
      const response = await fetch(url);

      if (!response.ok) {
        logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: Not ok`);
        return;
      }

      const cc = response.headers?.get('country_code');
      _country = cc ? cc.split(',')?.map(code => code.trim())[0] : undefined;
      _configData = await response.json();

      return _configData;
    } catch (error) {
      logError(`${CONSTANTS.LOG_PRE_FIX} Error while fetching config: ${error}`);
    }
};

/**
 * Initialize the Pubmatic RTD Module.
 * @param {Object} config
 * @param {Object} _userConsent
 * @returns {boolean}
 */
const init = (config, _userConsent) => {
    const { publisherId, profileId } = config?.params || {};

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

    _ymConfigPromise = getRtdConfig(publisherId, profileId);

    return true;
};

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 */
const getBidRequestData = (reqBidsConfigObj, callback) => {
  _ymConfigPromise.then(() => {
        const hookConfig = {
            reqBidsConfigObj,
            context: this,
            nextFn: () => true,
            haveExited: false,
            timer: null
        };
        continueAuction(hookConfig);
        if (_country) {
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
        }
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
