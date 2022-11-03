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
const ORTB2_NAME = '1plusX.com'
const PAPI_VERSION = 'v1.0';
const LOG_PREFIX = '[1plusX RTD Module]: ';
const OPE_FPID = 'ope_fpid'
const LEGACY_SITE_KEYWORDS_BIDDERS = ['appnexus'];
export const segtaxes = {
  // cf. https://github.com/InteractiveAdvertisingBureau/openrtb/pull/108
  AUDIENCE: 526,
  CONTENT: 527,
};
// Functions
/**
 * Extracts the parameters for 1plusX RTD module from the config object passed at instanciation
 * @param {Object} moduleConfig Config object passed to the module
 * @param {Object} reqBidsConfigObj Config object for the bidders; each adapter has its own entry
 * @returns {Object} Extracted configuration parameters for the module
 */
export const extractConfig = (moduleConfig, reqBidsConfigObj) => {
  // CustomerId
  const customerId = deepAccess(moduleConfig, 'params.customerId');
  if (!customerId) {
    throw new Error('Missing parameter customerId in moduleConfig');
  }
  // Timeout
  const tempTimeout = deepAccess(moduleConfig, 'params.timeout');
  const timeout = isNumber(tempTimeout) && tempTimeout > 300 ? tempTimeout : 1000;

  // Bidders
  const biddersTemp = deepAccess(moduleConfig, 'params.bidders');
  if (!isArray(biddersTemp) || !biddersTemp.length) {
    throw new Error('Missing parameter bidders in moduleConfig');
  }

  const adUnitBidders = reqBidsConfigObj.adUnits
    .flatMap(({ bids }) => bids.map(({ bidder }) => bidder))
    .filter((e, i, a) => a.indexOf(e) === i);
  if (!isArray(adUnitBidders) || !adUnitBidders.length) {
    throw new Error('Missing parameter bidders in bidRequestConfig');
  }

  const bidders = biddersTemp.filter(bidder => adUnitBidders.includes(bidder));
  if (!bidders.length) {
    throw new Error('No bidRequestConfig bidder found in moduleConfig bidders');
  }

  return { customerId, timeout, bidders };
}

/**
 * Extracts consent from the prebid consent object and translates it
 * into a 1plusX profile api query parameter parameter dict
 * @param {object} prebid gdpr object
 * @returns dictionary of papi gdpr query parameters
 */
export const extractConsent = ({ gdpr }) => {
  if (!gdpr) {
    return null
  }
  const { gdprApplies, consentString } = gdpr
  if (!(gdprApplies == '0' || gdprApplies == '1')) {
    throw 'TCF Consent: gdprApplies has wrong format'
  }
  if (consentString && typeof consentString != 'string') {
    throw 'TCF Consent: consentString must be string if defined'
  }
  const result = {
    'gdpr_applies': gdprApplies,
    'consent_string': consentString
  }
  return result
}

/**
 * Extracts the OPE first party id field from local storage
 * @returns fpid string if found, else null
 */
export const extractFpid = () => {
  try {
    const fpid = window.localStorage.getItem(OPE_FPID);
    if (fpid) {
      return fpid;
    }
    return null;
  } catch (error) {
    return null;
  }
}
/**
 * Gets the URL of Profile Api from which targeting data will be fetched
 * @param {string} config.customerId
 * @param {object} consent query params as dict
 * @param {string} oneplusx first party id (nullable)
 * @returns {string} URL to access 1plusX Profile API
 */
export const getPapiUrl = (customerId, consent, fpid) => {
  // https://[yourClientId].profiles.tagger.opecloud.com/[VERSION]/targeting?url=
  const currentUrl = encodeURIComponent(window.location.href);
  var papiUrl = `https://${customerId}.profiles.tagger.opecloud.com/${PAPI_VERSION}/targeting?url=${currentUrl}`;
  if (consent) {
    Object.entries(consent).forEach(([key, value]) => {
      papiUrl += `&${key}=${value}`
    })
  }
  if (fpid) {
    papiUrl += `&fpid=${fpid}`
  }

  return papiUrl;
}

/**
 * Fetches targeting data. It contains the audience segments & the contextual topics
 * @param {string} papiUrl URL of profile API
 * @returns {Promise} Promise object resolving with data fetched from Profile API
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
        resolve(JSON.parse(response.response));
      },
      error(error) {
        reject(error);
      }
    };
    ajax(papiUrl, callbacks, null, requestOptions)
  })
}

/**
 * Prepares the update for the ORTB2 object
 * @param {Object} targetingData Targeting data fetched from Profile API
 * @param {string[]} segments Represents the audience segments of the user
 * @param {string[]} topics Represents the topics of the page
 * @returns {Object} Object describing the updates to make on bidder configs
 */
export const buildOrtb2Updates = ({ segments = [], topics = [] }, bidder) => {
  // Currently appnexus bidAdapter doesn't support topics in `site.content.data.segment`
  // Therefore, writing them in `site.keywords` until it's supported
  // Other bidAdapters do fine with `site.content.data.segment`
  const writeToLegacySiteKeywords = LEGACY_SITE_KEYWORDS_BIDDERS.includes(bidder);
  if (writeToLegacySiteKeywords) {
    const site = {
      keywords: topics.join(',')
    };
    return { site };
  }

  const userData = {
    name: ORTB2_NAME,
    segment: segments.map((segmentId) => ({ id: segmentId }))
  };
  const siteContentData = {
    name: ORTB2_NAME,
    segment: topics.map((topicId) => ({ id: topicId })),
    ext: { segtax: segtaxes.CONTENT }
  }
  return { userData, siteContentData };
}

/**
 * Merges the targeting data with the existing config for bidder and updates
 * @param {string} bidder Bidder for which to set config
 * @param {Object} ortb2Updates Updates to be applied to bidder config
 * @param {Object} bidderConfigs All current bidder configs
 * @returns {Object} Updated bidder config
 */
export const updateBidderConfig = (bidder, ortb2Updates, bidderConfigs) => {
  const { site, siteContentData, userData } = ortb2Updates;
  const bidderConfigCopy = mergeDeep({}, bidderConfigs[bidder]);

  if (site) {
    // Legacy : cf. comment on buildOrtb2Updates first lines
    const currentSite = deepAccess(bidderConfigCopy, 'ortb2.site');
    const updatedSite = mergeDeep(currentSite, site);
    deepSetValue(bidderConfigCopy, 'ortb2.site', updatedSite);
  }

  if (siteContentData) {
    const siteDataPath = 'ortb2.site.content.data';
    const currentSiteContentData = deepAccess(bidderConfigCopy, siteDataPath) || [];
    const updatedSiteContentData = [
      ...currentSiteContentData.filter(({ name }) => name != siteContentData.name),
      siteContentData
    ];
    deepSetValue(bidderConfigCopy, siteDataPath, updatedSiteContentData);
  }

  if (userData) {
    const userDataPath = 'ortb2.user.data';
    const currentUserData = deepAccess(bidderConfigCopy, userDataPath) || [];
    const updatedUserData = [
      ...currentUserData.filter(({ name }) => name != userData.name),
      userData
    ];
    deepSetValue(bidderConfigCopy, userDataPath, updatedUserData);
  }

  return bidderConfigCopy;
};

const setAppnexusAudiences = (audiences) => {
  config.setConfig({
    appnexusAuctionKeywords: {
      '1plusX': audiences,
    },
  });
}

/**
 * Updates bidder configs with the targeting data retreived from Profile API
 * @param {Object} papiResponse Response from Profile API
 * @param {Object} config Module configuration
 * @param {string[]} config.bidders Bidders specified in module's configuration
 */
export const setTargetingDataToConfig = (papiResponse, { bidders }) => {
  const bidderConfigs = config.getBidderConfig();
  const { s: segments, t: topics } = papiResponse;

  for (const bidder of bidders) {
    const ortb2Updates = buildOrtb2Updates({ segments, topics }, bidder);
    const updatedBidderConfig = updateBidderConfig(bidder, ortb2Updates, bidderConfigs);
    if (updatedBidderConfig) {
      config.setBidderConfig({
        bidders: [bidder],
        config: updatedBidderConfig
      });
    }
    if (bidder === 'appnexus') {
      // Do the legacy stuff for appnexus with segments
      setAppnexusAudiences(segments);
    }
  }
}

// Functions exported in submodule object
/**
 * Init
 * @param {Object} config Module configuration
 * @param {boolean} userConsent
 * @returns true
 */
const init = (config, userConsent) => {
  return true;
}

/**
 *
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} moduleConfig Configuration for 1plusX RTD module
 * @param {Object} userConsent
 */
const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  try {
    // Get the required config
    const { customerId, bidders } = extractConfig(moduleConfig, reqBidsConfigObj);
    // Get PAPI URL
    const papiUrl = getPapiUrl(customerId, extractConsent(userConsent) || {}, extractFpid())
    // Call PAPI
    getTargetingDataFromPapi(papiUrl)
      .then((papiResponse) => {
        logMessage(LOG_PREFIX, 'Get targeting data request successful');
        setTargetingDataToConfig(papiResponse, { bidders });
        callback();
      })
  } catch (error) {
    logError(LOG_PREFIX, error);
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
