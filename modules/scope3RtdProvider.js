/**
 * This module adds the Scope3 RTD provider to the real time data module
 * Enables Scope3's agentic execution engine for real-time media buying decisions
 * The {@link module:modules/realTimeData} module is required
 * @module modules/scope3RtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { logMessage, logError, logWarn, mergeDeep, isPlainObject, getBidderCodes } from '../src/utils.js';
import { setKeyValue } from '../libraries/gptUtils/gptUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const MODULE_NAME = 'scope3';
const LOG_PREFIX = 'Scope3 RTD:';

// Endpoints
const SCOPE3_ENDPOINT = 'https://prebid.scope3.com/prebid';

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
  if (!config.params.orgId) {
    logError(`${LOG_PREFIX} Missing required orgId parameter`);
    return false;
  }

  moduleConfig = {
    orgId: config.params.orgId, // Required organization identifier
    endpoint: config.params.endpoint || SCOPE3_ENDPOINT,
    timeout: config.params.timeout || 1000,
    bidders: config.params.bidders || [], // Empty array means all bidders
    publisherTargeting: config.params.publisherTargeting !== false, // Default true
    advertiserTargeting: config.params.advertiserTargeting !== false, // Default true
    includeKey: config.params.includeKey || 's3i',  // Key for include segments
    excludeKey: config.params.excludeKey || 's3x',  // Key for exclude segments
    macroKey: config.params.macroKey || 's3m',      // Key for macro blob
    cacheEnabled: config.params.cacheEnabled !== false, // Default true
    debugMode: config.params.debugMode || false
  };

  if (moduleConfig.debugMode) {
    logMessage(`${LOG_PREFIX} Module initialized with config:`, moduleConfig);
  }

  return true;
}

/**
 * Get bid request data and send to Scope3 agents for real-time decisioning
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
      logMessage(`${LOG_PREFIX} Using cached agent decisions`);
      applyAgentDecisions(reqBidsConfigObj, cachedData);
      callback();
      return;
    }

    // Prepare the request payload
    const payload = preparePayload(ortb2Data, reqBidsConfigObj);

    if (moduleConfig.debugMode) {
      logMessage(`${LOG_PREFIX} Sending request to Scope3:`, payload);
    }

    // Request agent decisions
    makeApiRequest(payload, (response) => {
      try {
        const agentDecisions = parseResponse(response);

        if (agentDecisions) {
          // Cache the response
          if (moduleConfig.cacheEnabled) {
            setCachedData(cacheKey, agentDecisions);
          }

          // Apply agent decisions to bid request
          applyAgentDecisions(reqBidsConfigObj, agentDecisions);

          // Set publisher targeting if enabled
          if (moduleConfig.publisherTargeting) {
            setPublisherTargeting(agentDecisions);
          }
        }
      } catch (error) {
        logError(`${LOG_PREFIX} Error processing response:`, error);
      }

      callback();
    }, () => {
      // On error or timeout, continue without agent decisions
      logWarn(`${LOG_PREFIX} Agent request failed or timed out, continuing without decisions`);
      callback();
    });
  } catch (error) {
    logError(`${LOG_PREFIX} Error in getBidRequestData:`, error);
    callback();
  }
}

/**
 * Extract complete OpenRTB 2.x data from the bid request
 * @param {Object} reqBidsConfigObj - Bid request configuration
 * @returns {Object} - Complete OpenRTB data
 */
function extractOrtb2Data(reqBidsConfigObj) {
  // Deep copy the complete OpenRTB object from global fragments to preserve all data
  const ortb2 = reqBidsConfigObj.ortb2Fragments?.global || {};

  // Deep clone to avoid modifying the original
  const ortb2Request = JSON.parse(JSON.stringify(ortb2));

  // Build impression array with full ad unit data
  ortb2Request.imp = reqBidsConfigObj.adUnits?.map(adUnit => ({
    id: adUnit.code,
    mediaTypes: adUnit.mediaTypes,
    bidfloor: adUnit.bidfloor,
    bidfloorcur: adUnit.bidfloorcur,
    ortb2Imp: adUnit.ortb2Imp || {},
    bidders: adUnit.bids?.map(bid => bid.bidder) || []
  })) || [];

  // Ensure we have ext.prebid.version
  if (!ortb2Request.ext) {
    ortb2Request.ext = {};
  }
  if (!ortb2Request.ext.prebid) {
    ortb2Request.ext.prebid = {};
  }
  if (!ortb2Request.ext.prebid.version) {
    ortb2Request.ext.prebid.version = '$prebid.version$';
  }

  return ortb2Request;
}

/**
 * Prepare the payload for the Scope3 API
 * @param {Object} ortb2Data - Complete OpenRTB data
 * @param {Object} reqBidsConfigObj - Bid request configuration
 * @returns {Object} - Prepared payload
 */
function preparePayload(ortb2Data, reqBidsConfigObj) {
  // Get the list of bidders - use configured list or default to all bidders from ad units
  let bidders = moduleConfig.bidders;
  if (!bidders || bidders.length === 0) {
    // Get all unique bidder codes from the ad units
    bidders = getBidderCodes(reqBidsConfigObj.adUnits);
  }

  return {
    orgId: moduleConfig.orgId,
    ortb2: ortb2Data,  // Send complete OpenRTB request
    bidders: bidders,  // List of bidders to get data for
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

  ajax(
    moduleConfig.endpoint,
    {
      success: (response, xhr) => {
        logMessage(`${LOG_PREFIX} Received agent decisions from Scope3`);
        onSuccess(response);
      },
      error: (error, xhr) => {
        logError(`${LOG_PREFIX} Agent request failed:`, error);
        onError(error);
      }
    },
    JSON.stringify(payload),
    {
      method: 'POST',
      contentType: 'application/json',
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
    //   aee_signals: {
    //     include: ["seg1", "seg2"],
    //     exclude: ["seg3", "seg4"],
    //     macro: "blob"
    //   }
    // }

    return data;
  } catch (error) {
    logError(`${LOG_PREFIX} Failed to parse response:`, error);
    return null;
  }
}

/**
 * Apply AEE signals to bid request configuration
 * @param {Object} reqBidsConfigObj - Bid request configuration
 * @param {Object} aeeResponse - AEE signals response
 */
function applyAgentDecisions(reqBidsConfigObj, aeeResponse) {
  // Check if we have aee_signals in the response
  const aeeSignals = aeeResponse.aee_signals || aeeResponse;

  if (!aeeSignals) {
    logWarn(`${LOG_PREFIX} No AEE signals in response`);
    return;
  }

  // Add global AEE signals if advertiser targeting is enabled
  if (moduleConfig.advertiserTargeting) {
    // Add global signals that apply to all bidders
    const globalData = {
      site: {
        ext: {
          data: {
            scope3_aee: {
              include: aeeSignals.include || [],
              exclude: aeeSignals.exclude || [],
              macro: aeeSignals.macro || ''
            }
          }
        }
      }
    };

    mergeDeep(reqBidsConfigObj.ortb2Fragments.global, globalData);

    // Process bidder-specific signals if available
    if (aeeSignals.bidders) {
      const bidderFragments = {};

      Object.entries(aeeSignals.bidders).forEach(([bidderCode, bidderData]) => {
        // Only process if bidder is in our configured list (or list is empty)
        if (moduleConfig.bidders.length === 0 || moduleConfig.bidders.includes(bidderCode)) {
          // Add bidder-specific segments using standard OpenRTB user.data format
          bidderFragments[bidderCode] = {
            user: {
              data: [{
                name: 'scope3.com',
                ext: { segtax: 4 },  // IAB Audience Taxonomy
                segment: (bidderData.segments || []).map(seg => ({ id: seg }))
              }]
            },
            site: {
              ext: {
                data: {
                  scope3_bidder: {
                    segments: bidderData.segments || [],
                    deals: bidderData.deals || []
                  }
                }
              }
            }
          };

          // Also add deal IDs to each ad unit for this bidder
          if (bidderData.deals && bidderData.deals.length > 0) {
            reqBidsConfigObj.adUnits?.forEach(adUnit => {
              // Find bids for this bidder in the ad unit
              const bidderBids = adUnit.bids?.filter(bid => bid.bidder === bidderCode);
              if (bidderBids && bidderBids.length > 0) {
                // Add deals to imp-level data for this bidder
                adUnit.ortb2Imp = adUnit.ortb2Imp || {};
                adUnit.ortb2Imp.ext = adUnit.ortb2Imp.ext || {};
                adUnit.ortb2Imp.ext[bidderCode] = adUnit.ortb2Imp.ext[bidderCode] || {};
                adUnit.ortb2Imp.ext[bidderCode].deals = bidderData.deals;
              }
            });
          }
        }
      });

      if (Object.keys(bidderFragments).length > 0) {
        mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, bidderFragments);
      }
    }
  }

  logMessage(`${LOG_PREFIX} AEE signals applied to bid request`);
}

/**
 * Set publisher targeting key-values for GAM based on AEE signals
 * @param {Object} aeeResponse - AEE signals response
 */
function setPublisherTargeting(aeeResponse) {
  const aeeSignals = aeeResponse.aee_signals || aeeResponse;

  if (!aeeSignals) {
    return;
  }

  // Set include segments with configured key
  if (aeeSignals.include && aeeSignals.include.length > 0) {
    setKeyValue(moduleConfig.includeKey, aeeSignals.include);
  }

  // Set exclude segments with configured key
  if (aeeSignals.exclude && aeeSignals.exclude.length > 0) {
    setKeyValue(moduleConfig.excludeKey, aeeSignals.exclude);
  }

  // Set macro blob with configured key
  if (aeeSignals.macro) {
    setKeyValue(moduleConfig.macroKey, aeeSignals.macro);
  }

  logMessage(`${LOG_PREFIX} Publisher targeting set with AEE signals`);
}

/**
 * Generate cache key for request
 * @param {Object} ortb2Data - OpenRTB data
 * @returns {string} - Cache key
 */
function generateCacheKey(ortb2Data) {
  // Create a cache key from relevant OpenRTB fields
  const keyData = {
    site: ortb2Data.site?.page || ortb2Data.site?.domain,
    device: {
      ua: ortb2Data.device?.ua,
      geo: ortb2Data.device?.geo?.country
    },
    user: {
      id: ortb2Data.user?.id,
      eids: ortb2Data.user?.eids?.length || 0
    },
    impCount: ortb2Data.imp?.length,
    imp: ortb2Data.imp?.map(i => i.id).join(',')
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
