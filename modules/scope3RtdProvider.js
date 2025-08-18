/**
 * This module adds the Scope3 RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * @module modules/scope3RtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logMessage, logError, logWarn, mergeDeep, isPlainObject } from '../src/utils.js';
import { setKeyValue } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'scope3';
const LOG_PREFIX = 'Scope3 RTD:';

// Endpoints - will transition to the prebid endpoint when available
const SCOPE3_ENDPOINT = 'https://rtdp.scope3.com/amazonaps/rtii';
// const SCOPE3_PREBID_ENDPOINT = 'https://rtdp.scope3.com/prebid'; // Future endpoint - will be used when available

// Module configuration
let moduleConfig = {};
let requestCache = new Map();
const CACHE_TTL = 30000; // 30 seconds cache for identical requests

/**
 * Initialize the Scope3 RTD module
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent information
 * @returns {boolean} - True if module was initialized successfully
 */
function init(config, userConsent) {
  logMessage(`${LOG_PREFIX} Initializing module`, config);

  if (!config || !config.params) {
    logError(`${LOG_PREFIX} Missing required configuration`);
    return false;
  }

  // Validate required parameters
  if (!config.params.publisherId) {
    logError(`${LOG_PREFIX} Missing required publisherId parameter`);
    return false;
  }

  if (!config.params.apiKey && !config.params.endpoint) {
    logWarn(`${LOG_PREFIX} No API key provided. Using default endpoint without authentication.`);
  }

  moduleConfig = {
    publisherId: config.params.publisherId, // Required publisher identifier
    apiKey: config.params.apiKey,
    endpoint: config.params.endpoint || SCOPE3_ENDPOINT,
    timeout: config.params.timeout || 1000,
    bidders: config.params.bidders || [], // Empty array means all bidders
    publisherTargeting: config.params.publisherTargeting !== false, // Default true
    advertiserTargeting: config.params.advertiserTargeting !== false, // Default true
    keyPrefix: config.params.keyPrefix || 'scope3',
    cacheEnabled: config.params.cacheEnabled !== false, // Default true
    debugMode: config.params.debugMode || false
  };

  if (moduleConfig.debugMode) {
    logMessage(`${LOG_PREFIX} Module initialized with config:`, moduleConfig);
  }

  return true;
}

/**
 * Get bid request data and enrich with Scope3 carbon footprint data
 * @param {Object} reqBidsConfigObj - Bid request configuration object
 * @param {Function} callback - Callback to be called when processing is complete
 * @param {Object} config - Module configuration
 * @param {Object} userConsent - User consent information
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  logMessage(`${LOG_PREFIX} Processing bid request data`);

  try {
    // Extract OpenRTB data from the request
    const ortb2Data = extractOrtb2Data(reqBidsConfigObj);

    // Check cache first
    const cacheKey = generateCacheKey(ortb2Data);
    const cachedData = getCachedData(cacheKey);

    if (cachedData) {
      logMessage(`${LOG_PREFIX} Using cached Scope3 data`);
      enrichBidRequest(reqBidsConfigObj, cachedData);
      callback();
      return;
    }

    // Prepare the request payload
    const payload = preparePayload(ortb2Data, reqBidsConfigObj);

    if (moduleConfig.debugMode) {
      logMessage(`${LOG_PREFIX} Sending request to Scope3:`, payload);
    }

    // Make the API request
    makeApiRequest(payload, (response) => {
      try {
        const scope3Data = parseResponse(response);

        if (scope3Data) {
          // Cache the response
          if (moduleConfig.cacheEnabled) {
            setCachedData(cacheKey, scope3Data);
          }

          // Enrich the bid request with Scope3 data
          enrichBidRequest(reqBidsConfigObj, scope3Data);

          // Set publisher targeting if enabled
          if (moduleConfig.publisherTargeting) {
            setPublisherTargeting(scope3Data);
          }
        }
      } catch (error) {
        logError(`${LOG_PREFIX} Error processing response:`, error);
      }

      callback();
    }, () => {
      // On error or timeout, continue without enrichment
      logWarn(`${LOG_PREFIX} Request failed or timed out, continuing without enrichment`);
      callback();
    });
  } catch (error) {
    logError(`${LOG_PREFIX} Error in getBidRequestData:`, error);
    callback();
  }
}

/**
 * Extract OpenRTB 2.x data from the bid request
 * @param {Object} reqBidsConfigObj - Bid request configuration
 * @returns {Object} - Extracted OpenRTB data
 */
function extractOrtb2Data(reqBidsConfigObj) {
  const ortb2 = reqBidsConfigObj.ortb2Fragments?.global || {};

  return {
    site: ortb2.site || {},
    device: ortb2.device || {},
    user: ortb2.user || {},
    imp: reqBidsConfigObj.adUnits?.map(adUnit => ({
      id: adUnit.code,
      mediaTypes: adUnit.mediaTypes,
      bidders: adUnit.bids?.map(bid => bid.bidder) || []
    })) || [],
    ext: {
      prebid: {
        version: '$prebid.version$'
      }
    }
  };
}

/**
 * Prepare the payload for the Scope3 API
 * @param {Object} ortb2Data - OpenRTB data
 * @param {Object} reqBidsConfigObj - Bid request configuration
 * @returns {Object} - Prepared payload
 */
function preparePayload(ortb2Data, reqBidsConfigObj) {
  return {
    publisherId: moduleConfig.publisherId, // Include publisher identifier
    ortb2: ortb2Data,
    adUnits: reqBidsConfigObj.adUnits?.map(adUnit => ({
      code: adUnit.code,
      mediaTypes: adUnit.mediaTypes,
      bidders: adUnit.bids?.map(bid => bid.bidder) || []
    })) || [],
    timestamp: Date.now(),
    source: 'prebid-rtd'
  };
}

/**
 * Make API request to Scope3
 * @param {Object} payload - Request payload
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 */
function makeApiRequest(payload, onSuccess, onError) {
  const ajax = ajaxBuilder(moduleConfig.timeout);

  const headers = {
    'Content-Type': 'application/json'
  };

  // Add authentication header if API key is provided
  if (moduleConfig.apiKey) {
    headers['Authorization'] = `Bearer ${moduleConfig.apiKey}`;
  }

  ajax(
    moduleConfig.endpoint,
    {
      success: (response, xhr) => {
        logMessage(`${LOG_PREFIX} Received response from Scope3`);
        onSuccess(response);
      },
      error: (error, xhr) => {
        logError(`${LOG_PREFIX} API request failed:`, error);
        onError(error);
      }
    },
    JSON.stringify(payload),
    {
      method: 'POST',
      customHeaders: headers,
      withCredentials: false
    }
  );
}

/**
 * Parse the Scope3 API response
 * @param {string|Object} response - API response
 * @returns {Object|null} - Parsed response data
 */
function parseResponse(response) {
  try {
    const data = typeof response === 'string' ? JSON.parse(response) : response;

    if (!data || !isPlainObject(data)) {
      logWarn(`${LOG_PREFIX} Invalid response format`);
      return null;
    }

    // Expected response format:
    // {
    //   scores: {
    //     overall: 0.5,
    //     byBidder: {
    //       'bidderA': 0.3,
    //       'bidderB': 0.7
    //     }
    //   },
    //   recommendations: {
    //     'bidderA': { carbonScore: 0.3, recommended: true },
    //     'bidderB': { carbonScore: 0.7, recommended: false }
    //   },
    //   metadata: {
    //     calculationId: 'xxx',
    //     timestamp: 123456789
    //   }
    // }

    return data;
  } catch (error) {
    logError(`${LOG_PREFIX} Failed to parse response:`, error);
    return null;
  }
}

/**
 * Enrich bid request with Scope3 data
 * @param {Object} reqBidsConfigObj - Bid request configuration
 * @param {Object} scope3Data - Scope3 response data
 */
function enrichBidRequest(reqBidsConfigObj, scope3Data) {
  // Add to global ortb2 if advertiser targeting is enabled
  if (moduleConfig.advertiserTargeting) {
    const globalData = {
      site: {
        ext: {
          data: {
            scope3: {
              carbonScore: scope3Data.scores?.overall,
              calculationId: scope3Data.metadata?.calculationId,
              timestamp: scope3Data.metadata?.timestamp
            }
          }
        }
      }
    };

    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, globalData);
  }

  // Add bidder-specific data if available
  if (scope3Data.scores?.byBidder && moduleConfig.advertiserTargeting) {
    const bidderData = {};

    Object.entries(scope3Data.scores.byBidder).forEach(([bidder, score]) => {
      // Only add data for configured bidders (or all if none configured)
      if (moduleConfig.bidders.length === 0 || moduleConfig.bidders.includes(bidder)) {
        bidderData[bidder] = {
          site: {
            ext: {
              data: {
                scope3: {
                  carbonScore: score,
                  recommended: scope3Data.recommendations?.[bidder]?.recommended,
                  calculationId: scope3Data.metadata?.calculationId
                }
              }
            }
          }
        };
      }
    });

    if (Object.keys(bidderData).length > 0) {
      mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, bidderData);
    }
  }

  // Add data to individual ad units if needed
  if (scope3Data.adUnitScores) {
    reqBidsConfigObj.adUnits?.forEach(adUnit => {
      const adUnitScore = scope3Data.adUnitScores[adUnit.code];
      if (adUnitScore) {
        adUnit.ortb2Imp = adUnit.ortb2Imp || {};
        mergeDeep(adUnit.ortb2Imp, {
          ext: {
            data: {
              scope3: {
                carbonScore: adUnitScore,
                calculationId: scope3Data.metadata?.calculationId
              }
            }
          }
        });
      }
    });
  }

  logMessage(`${LOG_PREFIX} Bid request enriched with Scope3 data`);
}

/**
 * Set publisher targeting key-values for GAM
 * @param {Object} scope3Data - Scope3 response data
 */
function setPublisherTargeting(scope3Data) {
  if (!scope3Data || !scope3Data.scores) {
    return;
  }

  const prefix = moduleConfig.keyPrefix;

  // Set overall carbon score
  if (scope3Data.scores.overall !== undefined) {
    const score = Math.round(scope3Data.scores.overall * 100);
    setKeyValue(`${prefix}_score`, score.toString());
  }

  // Set carbon tier (low/medium/high)
  if (scope3Data.scores.overall !== undefined) {
    const tier = getCarbonTier(scope3Data.scores.overall);
    setKeyValue(`${prefix}_tier`, tier);
  }

  // Set recommended bidders list if available
  if (scope3Data.recommendations) {
    const recommendedBidders = Object.entries(scope3Data.recommendations)
      .filter(([_, data]) => data.recommended)
      .map(([bidder, _]) => bidder);

    if (recommendedBidders.length > 0) {
      setKeyValue(`${prefix}_rec`, recommendedBidders);
    }
  }

  logMessage(`${LOG_PREFIX} Publisher targeting set`);
}

/**
 * Determine carbon tier based on score
 * @param {number} score - Carbon score (0-1)
 * @returns {string} - Carbon tier
 */
function getCarbonTier(score) {
  if (score < 0.33) return 'low';
  if (score < 0.66) return 'medium';
  return 'high';
}

/**
 * Generate cache key for request
 * @param {Object} ortb2Data - OpenRTB data
 * @returns {string} - Cache key
 */
function generateCacheKey(ortb2Data) {
  // Create a simple hash of the relevant data
  const keyData = {
    site: ortb2Data.site?.page || ortb2Data.site?.domain,
    device: ortb2Data.device?.ua,
    impCount: ortb2Data.imp?.length
  };
  return JSON.stringify(keyData);
}

/**
 * Get cached data if available and not expired
 * @param {string} key - Cache key
 * @returns {Object|null} - Cached data or null
 */
function getCachedData(key) {
  if (!moduleConfig.cacheEnabled) {
    return null;
  }

  const cached = requestCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  // Remove expired entry
  if (cached) {
    requestCache.delete(key);
  }

  return null;
}

/**
 * Store data in cache
 * @param {string} key - Cache key
 * @param {Object} data - Data to cache
 */
function setCachedData(key, data) {
  if (!moduleConfig.cacheEnabled) {
    return;
  }

  requestCache.set(key, {
    data: data,
    timestamp: Date.now()
  });

  // Limit cache size
  if (requestCache.size > 100) {
    const firstKey = requestCache.keys().next().value;
    requestCache.delete(firstKey);
  }
}

/**
 * Clear expired cache entries
 */
function clearExpiredCache() {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}

// Periodically clear expired cache entries
setInterval(clearExpiredCache, 60000); // Every minute

/** @type {RtdSubmodule} */
export const scope3SubModule = {
  name: MODULE_NAME,
  init: init,
  getBidRequestData: getBidRequestData
};

submodule('realTimeData', scope3SubModule);
