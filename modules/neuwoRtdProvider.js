/**
 * @module neuwoRtdProvider
 * @version 2.2.6
 * @author Grzegorz Malisz
 * @see {project-root-directory}/integrationExamples/gpt/neuwoRtdProvider_example.html for an example/testing page.
 * @see {project-root-directory}/test/spec/modules/neuwoRtdProvider_spec.js for unit tests.
 * @description
 * This module is a Prebid.js Real-Time Data (RTD) provider that integrates with the Neuwo API.
 *
 * It fetches contextual marketing categories (IAB content and audience) for the current page from the Neuwo API.
 * The retrieved data is then injected into the bid request as OpenRTB (ORTB2) `site.content.data`
 * and `user.data` fragments, making it available for bidders to use in their decisioning process.
 * Additionally, when enabled, the module populates OpenRTB 2.5 category fields (`ortb2.site.cat`,
 * `ortb2.site.sectioncat`, `ortb2.site.pagecat`, `ortb2.site.content.cat`) with IAB Content Taxonomy 1.0 segments.
 *
 * @see {@link https://docs.prebid.org/dev-docs/add-rtd-submodule.html} for more information on development of Prebid.js RTD modules.
 * @see {@link https://docs.prebid.org/features/firstPartyData.html} for more information on Prebid.js First Party Data.
 * @see {@link https://www.neuwo.ai/} for more information on the Neuwo API.
 */

import { ajax } from "../src/ajax.js";
import { submodule } from "../src/hook.js";
import { getRefererInfo } from "../src/refererDetection.js";
import {
  deepSetValue,
  logError,
  logInfo,
  logWarn,
  mergeDeep,
} from "../src/utils.js";

const MODULE_NAME = "NeuwoRTDModule";
const MODULE_VERSION = "2.2.6";
export const DATA_PROVIDER = "www.neuwo.ai";

// Default IAB Content Taxonomy version
const DEFAULT_IAB_CONTENT_TAXONOMY_VERSION = "2.2";

// Maximum number of cached API responses to keep. Oldest entries are evicted when exceeded.
const MAX_CACHE_ENTRIES = 10;
// Cached API responses keyed by full API URL to avoid redundant requests.
let cachedResponses = {};
// In-flight request promises keyed by full API URL to prevent duplicate API calls during the same request cycle.
let pendingRequests = {};

/**
 * Clears the cached API responses and pending requests. Primarily used for testing.
 * @private
 */
export function clearCache() {
  cachedResponses = {};
  pendingRequests = {};
}

// Maps the IAB Content Taxonomy version string to the corresponding segtax ID.
// Based on https://github.com/InteractiveAdvertisingBureau/AdCOM/blob/main/AdCOM%20v1.0%20FINAL.md#list--category-taxonomies-
// prettier-ignore
const IAB_CONTENT_TAXONOMY_MAP = {
  "1.0": 1,
  "2.0": 2,
  "2.1": 5,
  "2.2": 6,
  "3.0": 7,
  "3.1": 9,
};

/**
 * Validates the configuration and initialises the module.
 *
 * @param {Object} config The module configuration.
 * @param {Object} userConsent The user consent object.
 * @returns {boolean} `true` if the module is configured correctly, otherwise `false`.
 */
function init(config, userConsent) {
  logInfo(MODULE_NAME, "init():", "Version " + MODULE_VERSION, config, userConsent);
  const params = config?.params || {};
  if (!params.neuwoApiUrl) {
    logError(MODULE_NAME, "init():", "Missing Neuwo Edge API Endpoint URL");
    return false;
  }
  if (!params.neuwoApiToken) {
    logError(MODULE_NAME, "init():", "Missing Neuwo API Token");
    return false;
  }
  return true;
}

/**
 * Fetches contextual data from the Neuwo API and enriches the bid request object with IAB categories.
 * Uses cached response if available to avoid redundant API calls.
 * Automatically detects API capabilities from the endpoint URL format:
 * - URLs containing "/v1/iab" use GET requests with server-side filtering
 * - Other URLs use GET requests with client-side filtering (legacy support)
 *
 * @param {Object} reqBidsConfigObj The bid request configuration object.
 * @param {function} callback The callback function to continue the auction.
 * @param {Object} config The module configuration.
 * @param {Object} config.params Configuration parameters.
 * @param {string} config.params.neuwoApiUrl The Neuwo API endpoint URL.
 * @param {string} config.params.neuwoApiToken The Neuwo API authentication token.
 * @param {string} [config.params.websiteToAnalyseUrl] Optional URL to analyze instead of current page.
 * @param {string} [config.params.iabContentTaxonomyVersion="2.2"] IAB Content Taxonomy version.
 * @param {boolean} [config.params.enableCache=true] If true, caches API responses to avoid redundant requests.
 * @param {boolean} [config.params.enableOrtb25Fields=true] If true, populates OpenRTB 2.5 category fields (site.cat, site.sectioncat, site.pagecat, site.content.cat) with IAB Content Taxonomy 1.0 segments.
 * @param {boolean} [config.params.stripAllQueryParams] If true, strips all query parameters from the URL.
 * @param {string[]} [config.params.stripQueryParamsForDomains] List of domains for which to strip all query params.
 * @param {string[]} [config.params.stripQueryParams] List of specific query parameter names to strip.
 * @param {boolean} [config.params.stripFragments] If true, strips URL fragments (hash).
 * @param {Object} [config.params.iabTaxonomyFilters] Per-tier filtering configuration for IAB Taxonomies.
 * @param {Object} userConsent The user consent object.
 */
export function getBidRequestData(
  reqBidsConfigObj,
  callback,
  config,
  userConsent
) {
  logInfo(
    MODULE_NAME,
    "getBidRequestData():",
    "starting getBidRequestData",
    config
  );

  const {
    websiteToAnalyseUrl,
    neuwoApiUrl,
    neuwoApiToken,
    iabContentTaxonomyVersion = DEFAULT_IAB_CONTENT_TAXONOMY_VERSION,
    enableCache = true,
    enableOrtb25Fields = true,
    stripAllQueryParams,
    stripQueryParamsForDomains,
    stripQueryParams,
    stripFragments,
    iabTaxonomyFilters,
  } = config.params;

  const rawUrl = websiteToAnalyseUrl || getRefererInfo().page;
  if (!rawUrl) {
    logError(MODULE_NAME, "getBidRequestData():", "No URL available to analyse");
    callback();
    return;
  }
  const processedUrl = cleanUrl(rawUrl, {
    stripAllQueryParams,
    stripQueryParamsForDomains,
    stripQueryParams,
    stripFragments,
  });
  const pageUrl = encodeURIComponent(processedUrl);
  const contentSegtax =
    IAB_CONTENT_TAXONOMY_MAP[iabContentTaxonomyVersion] ||
    IAB_CONTENT_TAXONOMY_MAP[DEFAULT_IAB_CONTENT_TAXONOMY_VERSION];

  // Detect whether the endpoint supports multi-taxonomy responses and server-side filtering.
  // Use URL pathname to avoid false positives when "/v1/iab" appears in query params.
  let isIabEndpoint = false;
  try {
    isIabEndpoint = new URL(neuwoApiUrl).pathname.includes("/v1/iab");
  } catch (e) {
    isIabEndpoint = neuwoApiUrl.split("?")[0].includes("/v1/iab");
  }

  // Warn if OpenRTB 2.5 feature enabled with legacy endpoint
  if (enableOrtb25Fields && !isIabEndpoint) {
    logWarn(
      MODULE_NAME,
      "getBidRequestData():",
      "OpenRTB 2.5 category fields require the /v1/iab endpoint"
    );
  }

  const joiner = neuwoApiUrl.indexOf("?") < 0 ? "?" : "&";
  const urlParams = [
    "token=" + neuwoApiToken,
    "url=" + pageUrl,
    "_neuwo_prod=PrebidModule",
  ];

  // Request both IAB Content Taxonomy (based on config) and IAB Audience Taxonomy (segtax 4)
  if (isIabEndpoint) {
    urlParams.push("iabVersions=" + contentSegtax);
    urlParams.push("iabVersions=4"); // IAB Audience 1.1

    // Request IAB 1.0 for OpenRTB 2.5 fields if feature enabled.
    // Skip when contentSegtax is already 1 -- already requested above.
    if (enableOrtb25Fields && contentSegtax !== 1) {
      urlParams.push("iabVersions=1"); // IAB Content 1.0
    }

    // Add flattened filter parameters to URL for GET request
    const filterParams = buildFilterQueryParams(
      iabTaxonomyFilters,
      contentSegtax,
      enableOrtb25Fields
    );
    if (filterParams.length > 0) {
      urlParams.push(...filterParams);
    }
  }

  const neuwoApiUrlFull = neuwoApiUrl + joiner + urlParams.join("&");

  // For /v1/iab endpoints the full URL already encodes all config (iabVersions, filters).
  // For legacy endpoints the URL only carries token + page URL, so append config-dependent
  // values to the cache key to prevent different configs sharing a response that was
  // transformed/filtered for a different taxonomy version or filter set.
  let cacheKey = neuwoApiUrlFull;
  if (!isIabEndpoint) {
    cacheKey += "&_segtax=" + contentSegtax;
    if (iabTaxonomyFilters && Object.keys(iabTaxonomyFilters).length > 0) {
      cacheKey += "&_filters=" + JSON.stringify(iabTaxonomyFilters);
    }
  }

  // Cache flow: cached response -> pending request -> new request
  // Each caller gets their own callback invoked when data is ready.
  // Keyed by cacheKey to ensure different parameters never share cached data.
  if (enableCache && cachedResponses[cacheKey]) {
    // Previous request succeeded - use cached response immediately
    logInfo(
      MODULE_NAME,
      "getBidRequestData():",
      "Cache System:",
      "Using cached response for:",
      cacheKey
    );
    injectIabCategories(
      cachedResponses[cacheKey],
      reqBidsConfigObj,
      iabContentTaxonomyVersion,
      enableOrtb25Fields
    );
    callback();
  } else if (enableCache && pendingRequests[cacheKey]) {
    // Another caller started a request with the same params - wait for it
    logInfo(
      MODULE_NAME,
      "getBidRequestData():",
      "Cache System:",
      "Waiting for pending request for:",
      cacheKey
    );
    pendingRequests[cacheKey]
      .then((responseParsed) => {
        if (responseParsed) {
          injectIabCategories(
            responseParsed,
            reqBidsConfigObj,
            iabContentTaxonomyVersion,
            enableOrtb25Fields
          );
        }
      })
      .finally(() => callback());
  } else {
    // First request or cache disabled - make the API call
    logInfo(
      MODULE_NAME,
      "getBidRequestData():",
      "Cache System:",
      "Calling Neuwo API Endpoint:",
      neuwoApiUrlFull
    );

    const requestPromise = new Promise((resolve) => {
      ajax(
        neuwoApiUrlFull,
        {
          success: (response) => {
            logInfo(
              MODULE_NAME,
              "getBidRequestData():",
              "success():",
              "Neuwo API raw response:",
              response
            );

            let responseParsed;
            try {
              responseParsed = JSON.parse(response);
            } catch (ex) {
              logError(
                MODULE_NAME,
                "getBidRequestData():",
                "success():",
                "Error parsing Neuwo API response JSON:",
                ex
              );
              resolve(null);
              return;
            }

            try {
              if (!isIabEndpoint) {
                // Apply per-tier filtering to V1 format
                const filteredMarketingCategories = filterIabTaxonomies(
                  responseParsed.marketing_categories,
                  iabTaxonomyFilters
                );

                // Transform filtered V1 response to unified internal format
                responseParsed = transformV1ResponseToV2(
                  { marketing_categories: filteredMarketingCategories },
                  contentSegtax
                );
              }

              // Cache response, evicting oldest entry if at capacity.
              // Only cache valid responses so failed requests can be retried.
              if (
                enableCache &&
                responseParsed &&
                typeof responseParsed === "object"
              ) {
                // Object.keys() preserves string insertion order in modern JS engines.
                const keys = Object.keys(cachedResponses);
                if (keys.length >= MAX_CACHE_ENTRIES) {
                  delete cachedResponses[keys[0]];
                }
                cachedResponses[cacheKey] = responseParsed;
              }

              injectIabCategories(
                responseParsed,
                reqBidsConfigObj,
                iabContentTaxonomyVersion,
                enableOrtb25Fields
              );
              resolve(responseParsed);
            } catch (ex) {
              logError(
                MODULE_NAME,
                "getBidRequestData():",
                "success():",
                "Error processing Neuwo API response:",
                ex
              );
              resolve(null);
            }
          },
          error: (err) => {
            logError(
              MODULE_NAME,
              "getBidRequestData():",
              "error():",
              "AJAX error:",
              err
            );
            resolve(null);
          },
        }
      );
    });

    if (enableCache) {
      // Store promise so concurrent callers with same params can wait on it
      pendingRequests[cacheKey] = requestPromise;
      // Clear after settling so failed requests can be retried
      requestPromise.finally(() => {
        delete pendingRequests[cacheKey];
      });
    }

    // Signal this caller's auction to proceed once request completes
    requestPromise.finally(() => callback());
  }
}

//
// HELPER FUNCTIONS
//

/**
 * Cleans a URL by stripping query parameters and/or fragments based on the provided configuration.
 *
 * @param {string} url The URL to clean.
 * @param {Object} options Cleaning options.
 * @param {boolean} [options.stripAllQueryParams] If true, strips all query parameters.
 * @param {string[]} [options.stripQueryParamsForDomains] List of domains for which to strip all query params.
 * @param {string[]} [options.stripQueryParams] List of specific query parameter names to strip.
 * @param {boolean} [options.stripFragments] If true, strips URL fragments (hash).
 * @returns {string} The cleaned URL.
 */
export function cleanUrl(url, options = {}) {
  const {
    stripAllQueryParams,
    stripQueryParamsForDomains,
    stripQueryParams,
    stripFragments,
  } = options;

  if (!url) {
    logInfo(
      MODULE_NAME,
      "cleanUrl():",
      "Empty or null URL provided, returning as-is"
    );
    return url;
  }

  logInfo(MODULE_NAME, "cleanUrl():", "Input URL:", url, "Options:", options);

  try {
    const urlObj = new URL(url);

    // Strip fragments if requested
    if (stripFragments === true) {
      urlObj.hash = "";
      logInfo(MODULE_NAME, "cleanUrl():", "Stripped fragment from URL");
    }

    // Option 1: Strip all query params unconditionally
    if (stripAllQueryParams === true) {
      urlObj.search = "";
      const cleanedUrl = urlObj.toString();
      logInfo(MODULE_NAME, "cleanUrl():", "Output URL:", cleanedUrl);
      return cleanedUrl;
    }

    // Option 2: Strip all query params for specific domains
    if (
      Array.isArray(stripQueryParamsForDomains) &&
      stripQueryParamsForDomains.length > 0
    ) {
      const hostname = urlObj.hostname;
      const shouldStripForDomain = stripQueryParamsForDomains.some((domain) => {
        // Support exact match or subdomain match
        return hostname === domain || hostname.endsWith("." + domain);
      });

      if (shouldStripForDomain) {
        urlObj.search = "";
        const cleanedUrl = urlObj.toString();
        logInfo(MODULE_NAME, "cleanUrl():", "Output URL:", cleanedUrl);
        return cleanedUrl;
      }
    }

    // Option 3: Strip specific query parameters
    // Caveats:
    // - "?=value" is treated as query parameter with key "" and value "value"
    // - "??" is treated as query parameter with key "?" and value ""
    if (Array.isArray(stripQueryParams) && stripQueryParams.length > 0) {
      const queryParams = urlObj.searchParams;
      logInfo(
        MODULE_NAME,
        "cleanUrl():",
        `Query parameters to strip: ${stripQueryParams}`
      );
      stripQueryParams.forEach((param) => {
        queryParams.delete(param);
      });
      urlObj.search = queryParams.toString();
      const cleanedUrl = urlObj.toString();
      logInfo(MODULE_NAME, "cleanUrl():", "Output URL:", cleanedUrl);
      return cleanedUrl;
    }

    const finalUrl = urlObj.toString();
    logInfo(MODULE_NAME, "cleanUrl():", "Output URL:", finalUrl);
    return finalUrl;
  } catch (e) {
    logError(MODULE_NAME, "cleanUrl():", "Error cleaning URL:", e);
    return url;
  }
}

/**
 * Injects data into the OpenRTB 2.x global fragments of the bid request object.
 *
 * @param {Object} reqBidsConfigObj The main bid request configuration object.
 * @param {string} path The dot-notation path where the data should be injected (e.g., 'site.content.data').
 * @param {*} data The data to inject at the specified path.
 */
export function injectOrtbData(reqBidsConfigObj, path, data) {
  const container = {};
  deepSetValue(container, path, data);
  mergeDeep(reqBidsConfigObj.ortb2Fragments.global, container);
}

/**
 * Extracts all segment IDs from tier data into a flat array.
 * Used for populating OpenRTB 2.5 category fields and building IAB data objects.
 *
 * @param {Object} tierData The tier data keyed by tier numbers (e.g., {"1": [{id: "IAB12"}], "2": [...]}).
 * @returns {Array<string>} Flat array of segment IDs (e.g., ["IAB12", "IAB12-3", "IAB12-5"]).
 */
export function extractCategoryIds(tierData) {
  const ids = [];

  // Handle null, undefined, non-object, or array tierData
  if (!tierData || typeof tierData !== "object" || Array.isArray(tierData)) {
    return ids;
  }

  // Process ALL tier keys present in tierData
  Object.keys(tierData).forEach((tierKey) => {
    const segments = tierData[tierKey];
    if (Array.isArray(segments)) {
      segments.forEach((item) => {
        if (item?.id) {
          ids.push(item.id);
        }
      });
    }
  });

  return ids;
}

/**
 * Builds an IAB category data object for OpenRTB injection.
 * Dynamically processes all tiers present in the response data.
 *
 * @param {Object} tierData The tier data keyed by tier numbers (e.g., {"1": [...], "2": [...], "3": [...]}).
 * @param {number} segtax The IAB Taxonomy segtax ID.
 * @returns {Object} The OpenRTB data object with name, segment array, and ext.segtax.
 */
export function buildIabData(tierData, segtax) {
  const ids = extractCategoryIds(tierData);
  return {
    name: DATA_PROVIDER,
    segment: ids.map((id) => ({ id })),
    ext: { segtax },
  };
}

/**
 * v1 API specific
 * Filters and limits a single tier's taxonomies based on relevance score and count.
 * Used for client-side filtering with legacy endpoints.
 *
 * @param {Array} iabTaxonomies Array of IAB Taxonomy Segments objects with ID, label, and relevance.
 * @param {Object} filter Filter configuration with optional threshold and limit properties.
 * @returns {Array} Filtered and limited array of taxonomies, sorted by relevance (highest first).
 */
export function filterIabTaxonomyTier(iabTaxonomies, filter = {}) {
  if (!Array.isArray(iabTaxonomies)) {
    return [];
  }
  if (iabTaxonomies.length === 0) {
    return iabTaxonomies;
  }

  const { threshold, limit } = filter;
  const hasThreshold = typeof threshold === "number" && threshold > 0;
  const hasLimit = typeof limit === "number" && limit >= 0;

  // No effective filter configured -- return original order unchanged
  if (!hasThreshold && !hasLimit) {
    return iabTaxonomies;
  }

  let filtered = [...iabTaxonomies]; // Create copy to avoid mutating original

  // Filter by minimum relevance score
  if (hasThreshold) {
    filtered = filtered.filter((item) => {
      const relevance = parseFloat(item?.relevance);
      return !isNaN(relevance) && relevance >= threshold;
    });
  }

  // Sort by relevance (highest first) so limit keeps the most relevant items
  if (hasLimit) {
    filtered = filtered.sort((a, b) => {
      const relA = parseFloat(a?.relevance) || 0;
      const relB = parseFloat(b?.relevance) || 0;
      return relB - relA; // Descending order
    });
    filtered = filtered.slice(0, limit);
  }

  return filtered;
}

/**
 * Maps tier configuration keys to API response keys.
 */
const TIER_KEY_MAP = {
  ContentTier1: "iab_tier_1",
  ContentTier2: "iab_tier_2",
  ContentTier3: "iab_tier_3",
  AudienceTier3: "iab_audience_tier_3",
  AudienceTier4: "iab_audience_tier_4",
  AudienceTier5: "iab_audience_tier_5",
};

/**
 * v1 API specific
 * Applies per-tier filtering to IAB taxonomies (client-side filtering for legacy endpoints).
 * Filters taxonomies by relevance score and limits the count per tier.
 *
 * @param {Object} marketingCategories Marketing categories from legacy API response.
 * @param {Object} [tierFilters] Per-tier filter configuration with human-readable tier names (e.g., {ContentTier1: {limit: 3, threshold: 0.75}}).
 * @returns {Object} Filtered marketing categories with the same structure as input.
 */
export function filterIabTaxonomies(marketingCategories, tierFilters = {}) {
  if (!marketingCategories || typeof marketingCategories !== "object") {
    return marketingCategories;
  }

  // If no filters provided, return original data
  if (!tierFilters || Object.keys(tierFilters).length === 0) {
    logInfo(
      MODULE_NAME,
      "filterIabTaxonomies():",
      "No filters provided, returning original data"
    );
    return marketingCategories;
  }

  const filtered = {};

  // Iterate through all tiers in the API response
  Object.keys(marketingCategories).forEach((apiTierKey) => {
    const tierData = marketingCategories[apiTierKey];

    // Find the corresponding config key for this API tier
    const configTierKey = Object.keys(TIER_KEY_MAP).find(
      (key) => TIER_KEY_MAP[key] === apiTierKey
    );

    // Get filter for this tier (if configured)
    const filter = configTierKey ? tierFilters[configTierKey] : {};

    // Apply filter if this tier has data
    if (Array.isArray(tierData)) {
      filtered[apiTierKey] = filterIabTaxonomyTier(tierData, filter);
    } else {
      // Preserve non-array data as-is
      filtered[apiTierKey] = tierData;
    }
  });

  logInfo(
    MODULE_NAME,
    "filterIabTaxonomies():",
    "Filtering results:",
    "Original:",
    marketingCategories,
    "Filtered:",
    filtered
  );

  return filtered;
}

/**
 * v1 API specific
 * Transforms legacy API response format to unified internal format.
 * Converts marketing_categories structure to segtax-based structure for consistent processing.
 *
 * Legacy format: { marketing_categories: { iab_tier_1: [...], iab_audience_tier_3: [...] } }
 * Unified format: { "6": { "1": [...], "2": [...] }, "4": { "3": [...], "4": [...] } }
 *
 * @param {Object} v1Response The legacy API response with marketing_categories structure.
 * @param {number} contentSegtax The segtax ID for content taxonomies (determined by iabContentTaxonomyVersion).
 * @returns {Object} Unified format response keyed by segtax and tier numbers.
 */
export function transformV1ResponseToV2(v1Response, contentSegtax) {
  const marketingCategories = v1Response?.marketing_categories || {};
  const contentSegtaxStr = String(contentSegtax);
  const result = {};

  // Content tiers: keyed by segtax from config
  result[contentSegtaxStr] = {};
  if (marketingCategories.iab_tier_1) {
    result[contentSegtaxStr]["1"] = transformSegmentsV1ToV2(
      marketingCategories.iab_tier_1
    );
  }
  if (marketingCategories.iab_tier_2) {
    result[contentSegtaxStr]["2"] = transformSegmentsV1ToV2(
      marketingCategories.iab_tier_2
    );
  }
  if (marketingCategories.iab_tier_3) {
    result[contentSegtaxStr]["3"] = transformSegmentsV1ToV2(
      marketingCategories.iab_tier_3
    );
  }

  // Audience tiers: segtax 4
  result["4"] = {};
  if (marketingCategories.iab_audience_tier_3) {
    result["4"]["3"] = transformSegmentsV1ToV2(
      marketingCategories.iab_audience_tier_3
    );
  }
  if (marketingCategories.iab_audience_tier_4) {
    result["4"]["4"] = transformSegmentsV1ToV2(
      marketingCategories.iab_audience_tier_4
    );
  }
  if (marketingCategories.iab_audience_tier_5) {
    result["4"]["5"] = transformSegmentsV1ToV2(
      marketingCategories.iab_audience_tier_5
    );
  }

  return result;
}

/**
 * v1 API specific
 * Transforms segment objects from legacy format to unified format.
 * Maps field names from legacy API response to unified internal representation.
 *
 * Legacy format: { ID: "123", label: "Category Name", relevance: "0.95" }
 * Unified format: { id: "123", name: "Category Name", relevance: "0.95" }
 *
 * @param {Array} segments Array of legacy segment objects with ID, label, relevance.
 * @returns {Array} Array of unified format segment objects with id, name, relevance.
 */
export function transformSegmentsV1ToV2(segments) {
  if (!Array.isArray(segments)) return [];
  return segments.map((seg) => ({
    id: seg.ID,
    name: seg.label,
    relevance: seg.relevance,
  }));
}

/**
 * Builds flattened query parameters from IAB taxonomy filters.
 * Converts human-readable tier names directly to query parameter format for GET requests.
 *
 * @param {Object} iabTaxonomyFilters Publisher's tier filter configuration using human-readable tier names.
 * @param {number} contentSegtax The segtax ID for content taxonomies (determined by iabContentTaxonomyVersion).
 * @param {boolean} [enableOrtb25Fields=true] If true, also applies filters to IAB Content Taxonomy 1.0 (segtax 1) for OpenRTB 2.5 category fields.
 * @returns {Array<string>} Array of query parameter strings (e.g., ["filter_6_1_limit=3", "filter_6_1_threshold=0.5"]).
 *
 * @example
 * Input:  { ContentTier1: { limit: 3, threshold: 0.5 }, AudienceTier3: { limit: 2 } }, contentSegtax=6
 * Output: ["filter_6_1_limit=3", "filter_6_1_threshold=0.5", "filter_4_3_limit=2"]
 */
export function buildFilterQueryParams(
  iabTaxonomyFilters,
  contentSegtax,
  enableOrtb25Fields = true
) {
  const params = [];

  if (!iabTaxonomyFilters || typeof iabTaxonomyFilters !== "object") {
    return params;
  }

  const TIER_TO_SEGTAX = {
    ContentTier1: { segtax: contentSegtax, tier: "1" },
    ContentTier2: { segtax: contentSegtax, tier: "2" },
    ContentTier3: { segtax: contentSegtax, tier: "3" },
    AudienceTier3: { segtax: 4, tier: "3" },
    AudienceTier4: { segtax: 4, tier: "4" },
    AudienceTier5: { segtax: 4, tier: "5" },
  };

  // Build query params from tier mappings
  Object.entries(iabTaxonomyFilters).forEach(([tierName, filter]) => {
    const mapping = TIER_TO_SEGTAX[tierName];
    if (mapping && filter && typeof filter === "object") {
      const segtax = mapping.segtax;
      const tier = mapping.tier;

      // Add each filter property (limit, threshold) as a query parameter
      Object.keys(filter).forEach((prop) => {
        const value = filter[prop];
        if (value !== undefined && value !== null) {
          params.push(`filter_${segtax}_${tier}_${prop}=${value}`);
        }
      });
    }
  });

  // Apply same filters to IAB 1.0 (segtax 1) for OpenRTB 2.5 fields.
  // Skip when contentSegtax is already 1 -- the first loop already emitted filter_1_* params.
  // Note: IAB 1.0 only has tiers 1 and 2 (tier 3 will be ignored if configured)
  if (enableOrtb25Fields && contentSegtax !== 1) {
    if (iabTaxonomyFilters.ContentTier1) {
      Object.keys(iabTaxonomyFilters.ContentTier1).forEach((prop) => {
        const value = iabTaxonomyFilters.ContentTier1[prop];
        if (value !== undefined && value !== null) {
          params.push(`filter_1_1_${prop}=${value}`);
        }
      });
    }

    if (iabTaxonomyFilters.ContentTier2) {
      Object.keys(iabTaxonomyFilters.ContentTier2).forEach((prop) => {
        const value = iabTaxonomyFilters.ContentTier2[prop];
        if (value !== undefined && value !== null) {
          params.push(`filter_1_2_${prop}=${value}`);
        }
      });
    }
  }

  return params;
}

/**
 * Processes the Neuwo API response and injects IAB Content and Audience Segments into the bid request.
 * Extracts Segments from the response and injects them into ORTB2 structure.
 *
 * Response format: { "6": { "1": [{id, name}], "2": [...] }, "4": { "3": [...], "4": [...] } }
 * - Content taxonomies are injected into ortb2.site.content.data
 * - Audience taxonomies are injected into ortb2.user.data
 * - If enableOrtb25Fields is true, IAB 1.0 segments are injected into OpenRTB 2.5 category fields
 *
 * Only injects data if segments exist to avoid adding empty data structures.
 *
 * @param {Object} responseParsed The parsed API response.
 * @param {Object} reqBidsConfigObj The bid request configuration object to be enriched.
 * @param {string} iabContentTaxonomyVersion The IAB Content Taxonomy version for segtax mapping.
 * @param {boolean} [enableOrtb25Fields=true] If true, populates OpenRTB 2.5 category fields with IAB Content Taxonomy 1.0 segments.
 */
export function injectIabCategories(
  responseParsed,
  reqBidsConfigObj,
  iabContentTaxonomyVersion,
  enableOrtb25Fields = true
) {
  if (!responseParsed || typeof responseParsed !== "object") {
    logError(MODULE_NAME, "injectIabCategories():", "Invalid response format");
    return;
  }

  const contentSegtax =
    IAB_CONTENT_TAXONOMY_MAP[iabContentTaxonomyVersion] ||
    IAB_CONTENT_TAXONOMY_MAP[DEFAULT_IAB_CONTENT_TAXONOMY_VERSION];
  const contentSegtaxStr = String(contentSegtax);

  // Extract IAB Content Taxonomy data for the configured version
  const contentTiers = responseParsed[contentSegtaxStr] || {};
  const contentData = buildIabData(contentTiers, contentSegtax);

  // Extract IAB Audience Taxonomy data
  const audienceTiers = responseParsed["4"] || {};
  const audienceData = buildIabData(audienceTiers, 4);

  logInfo(
    MODULE_NAME,
    "injectIabCategories():",
    "contentData structure:",
    contentData
  );
  logInfo(
    MODULE_NAME,
    "injectIabCategories():",
    "audienceData structure:",
    audienceData
  );

  // Inject content and audience data independently to avoid sending empty structures
  if (contentData.segment.length > 0) {
    injectOrtbData(reqBidsConfigObj, "site.content.data", [contentData]);
    logInfo(
      MODULE_NAME,
      "injectIabCategories():",
      "Injected content data into site.content.data"
    );
  } else {
    logInfo(
      MODULE_NAME,
      "injectIabCategories():",
      "No content segments to inject, skipping site.content.data"
    );
  }

  if (audienceData.segment.length > 0) {
    injectOrtbData(reqBidsConfigObj, "user.data", [audienceData]);
    logInfo(
      MODULE_NAME,
      "injectIabCategories():",
      "Injected audience data into user.data"
    );
  } else {
    logInfo(
      MODULE_NAME,
      "injectIabCategories():",
      "No audience segments to inject, skipping user.data"
    );
  }

  // Inject OpenRTB 2.5 category fields if feature enabled
  if (enableOrtb25Fields) {
    const iab10Tiers = responseParsed["1"] || {}; // Segtax 1 = IAB Content 1.0
    const categoryIds = extractCategoryIds(iab10Tiers); // ["IAB12", "IAB12-3", ...]

    if (categoryIds.length > 0) {
      // Inject same array into all four OpenRTB 2.5 category fields
      injectOrtbData(reqBidsConfigObj, "site.cat", categoryIds);
      injectOrtbData(reqBidsConfigObj, "site.sectioncat", categoryIds);
      injectOrtbData(reqBidsConfigObj, "site.pagecat", categoryIds);
      injectOrtbData(reqBidsConfigObj, "site.content.cat", categoryIds);

      logInfo(
        MODULE_NAME,
        "injectIabCategories():",
        "Injected OpenRTB 2.5 category fields:",
        categoryIds
      );
    } else {
      logInfo(
        MODULE_NAME,
        "injectIabCategories():",
        "No IAB 1.0 segments available for OpenRTB 2.5 fields"
      );
    }
  }
}

export const neuwoRtdModule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
};

submodule("realTimeData", neuwoRtdModule);
