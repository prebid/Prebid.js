import { submodule } from '../src/hook.js';
import { config } from '../src/config.js';
import { ajax } from '../src/ajax.js';
import {
  logMessage, logError,
  deepAccess, mergeDeep,
  isNumber, isArray, deepSetValue
} from '../src/utils.js';

// Constants
const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = '1plusX';
const PAPI_VERSION = 'v1.0';
const SUPPORTED_BIDDERS = ['appnexus', 'rubicon']

// Functions
/**
 * Extracts the parameters for 1plusX RTD module from the config object passed at instanciation
 * @param {Object} moduleConfig Config object passed to the module
 * @param {Object} reqBidsConfigObj Config object for the bidders; each adapter has its own entry
 * @returns
 */
const extractConfig = (moduleConfig, reqBidsConfigObj) => {
  // CustomerId
  const customerId = deepAccess(moduleConfig, 'params.customerId');
  if (!customerId) {
    throw new Error('REQUIRED CUSTOMER ID');
  }
  // Timeout
  const tempTimeout = deepAccess(moduleConfig, 'params.timeout');
  const timeout = isNumber(tempTimeout) && tempTimeout > 300 ? tempTimeout : 1000;

  // Bidders
  const biddersTemp = deepAccess(moduleConfig, 'params.bidders');
  if (!isArray(biddersTemp) || !biddersTemp.length) {
    throw new Error('REQUIRED BIDDERS IN SUBMODULE CONFIG');
  }

  const adUnitBidders = reqBidsConfigObj.adUnits
    .flatMap(({ bids }) => bids.map(({ bidder }) => bidder))
    .filter((e, i, a) => a.indexOf(e) === i);
  if (!isArray(adUnitBidders) || !adUnitBidders.length) {
    throw new Error('REQUIRED BIDDERS IN BID REQUEST CONFIG');
  }

  const bidders = biddersTemp.filter(
    bidder =>
      SUPPORTED_BIDDERS.includes(bidder) && adUnitBidders.includes(bidder)
  );
  if (!bidders.length) {
    throw new Error('NO SUPPORTED BIDDER FOUND IN SUBMODULE/ BID REQUEST CONFIG');
  }

  return { customerId, timeout, bidders };
}

/**
 * Gets the URL of Profile Api from which targeting data will be fetched 
 * @param {*} param0
 * @returns
 */
const getPapiUrl = ({ customerId }) => {
  logMessage('GET PAPI URL');
  // https://[yourClientId].profiles.tagger.opecloud.com/[VERSION]/targeting?url=
  const currentUrl = encodeURIComponent(window.location.href);
  const papiUrl = `https://${customerId}.profiles.tagger.opecloud.com/${PAPI_VERSION}/targeting?url=${currentUrl}`;
  return papiUrl;
}

/**
 * Fetches targeting data. It contains the audience segments & the contextual topics
 * @param {string} papiUrl URL of profile API
 * @returns
 */
const getTargetingDataFromPapi = (papiUrl) => {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      customHeaders: {
        'Accept': 'application/json'
      }
    }
    const callbacks = {
      success(responseText, response) {
        logMessage('Say it has been successful');
        resolve(JSON.parse(response.response));
      },
      error(errorText, error) {
        logMessage(errorText)
        logMessage(JSON.stringify(error, null, 2))
        reject(error);
      }
    };
    ajax(papiUrl, callbacks, null, requestOptions)
  })
}

/**
 * Prepares the update for the ORTB2 object
 * @param {*} param0
 * @returns
 */
export const buildOrtb2Updates = ({ segments = [], topics = [] }) => {
  const userData = {
    name: '1plusX.com',
    segment: segments.map((segmentId) => ({ id: segmentId }))
  };
  const site = {
    keywords: topics.join(',')
  };
  return { userData, site };
}

/**
 * Merges the targeting data with the existing config for bidder and updates
 * @param {string} bidder Bidder for which to set config
 * @param {Object} ortb2
 * @param {Object} bidderConfigs
 * @returns
 */
export const updateBidderConfig = (bidder, ortb2Updates, bidderConfigs) => {
  if (!SUPPORTED_BIDDERS.includes(bidder)) {
    return null;
  }
  const { site, userData } = ortb2Updates;
  const bidderConfigCopy = mergeDeep({}, bidderConfigs[bidder]);

  const currentSite = deepAccess(bidderConfigCopy, 'ortb2.site')
  const updatedSite = mergeDeep(currentSite, site);

  const currentUserData = deepAccess(bidderConfigCopy, 'ortb2.user.data') || [];
  const updatedUserData = [
    ...currentUserData.filter(({ name }) => name != userData.name),
    userData
  ];

  deepSetValue(bidderConfigCopy, 'ortb2.site', updatedSite);
  deepSetValue(bidderConfigCopy, 'ortb2.user.data', updatedUserData);

  return bidderConfigCopy
};

/**
 * Updates bidder configs with the targeting data retreived from Profile API
 * @param {*} papiResponse
 * @param {*} param1
 */
export const setTargetingDataToConfig = (papiResponse, { bidders }) => {
  const bidderConfigs = config.getBidderConfig();
  const { s: segments, t: topics } = papiResponse;
  const ortb2Updates = buildOrtb2Updates({ segments, topics });

  for (const bidder of bidders) {
    const updatedBidderConfig = updateBidderConfig(bidder, ortb2Updates, bidderConfigs);
    if (updatedBidderConfig) {
      config.setBidderConfig({
        bidders: [bidder],
        config: updatedBidderConfig
      });
    }
  }
}

// Functions exported in submodule object
/**
 * Init
 * @param {*} config
 * @param {*} userConsent
 * @returns
 */
const init = (config, userConsent) => {
  // We prolly get the config again in getBidRequestData
  return true;
}

/**
 *
 * @param {*} reqBidsConfigObj
 * @param {*} callback
 * @param {*} moduleConfig
 * @param {*} userConsent
 */
const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    // Get the required config
    const { customerId, bidders } = extractConfig(moduleConfig, reqBidsConfigObj);
    // Get PAPI URL
    const papiUrl = getPapiUrl({ customerId })
    // Call PAPI
    getTargetingDataFromPapi(papiUrl)
      .then((papiResponse) => {
        logMessage('REQUEST TO PAPI SUCCESS');
        setTargetingDataToConfig(papiResponse, { bidders });
        callback();
      })
      .catch((error) => {
        // -- Catch : print err & do nothing
        throw error;
      })
  } catch (error) {
    logError(error);
    callback();
  }
}

// The RTD submodule object to be exported
export const onePlusXSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData
}

// Register the onePlusXSubmodule as submodule of realTimeData
submodule(REAL_TIME_MODULE, onePlusXSubmodule);
