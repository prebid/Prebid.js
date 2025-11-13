/**
 * @module neuwoRtdProvider
 * @author Grzegorz Malisz
 * @see {project-root-directory}/integrationExamples/gpt/neuwoRtdProvider_example.html for an example/testing page.
 * @see {project-root-directory}/test/spec/modules/neuwoRtdProvider_spec.js for unit tests.
 * @description
 * This module is a Prebid.js Real-Time Data (RTD) provider that integrates with the Neuwo API.
 *
 * It fetches contextual marketing categories (IAB content and audience) for the current page from the Neuwo API.
 * The retrieved data is then injected into the bid request as OpenRTB (ORTB2)`site.content.data`
 * and `user.data` fragments, making it available for bidders to use in their decisioning process.
 *
 * @see {@link https://docs.prebid.org/dev-docs/add-rtd-submodule.html} for more information on development of Prebid.js RTD modules.
 * @see {@link https://docs.prebid.org/features/firstPartyData.html} for more information on Prebid.js First Party Data.
 * @see {@link https://www.neuwo.ai/} for more information on the Neuwo API.
 */

import { ajax } from "../src/ajax.js";
import { submodule } from "../src/hook.js";
import { getRefererInfo } from "../src/refererDetection.js";
import { deepSetValue, logError, logInfo, mergeDeep } from "../src/utils.js";

const MODULE_NAME = "NeuwoRTDModule";
export const DATA_PROVIDER = "www.neuwo.ai";

// Cached API response to avoid redundant requests.
let globalCachedResponse;

/**
 * Clears the cached API response. Primarily used for testing.
 * @private
 */
export function clearCache() {
  globalCachedResponse = undefined;
}

// Maps the IAB Content Taxonomy version string to the corresponding segtax ID.
// Based on https://github.com/InteractiveAdvertisingBureau/AdCOM/blob/main/AdCOM%20v1.0%20FINAL.md#list--category-taxonomies-
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
  logInfo(MODULE_NAME, "init:", config, userConsent);
  const params = config?.params || {};
  if (!params.neuwoApiUrl) {
    logError(MODULE_NAME, "init:", "Missing Neuwo Edge API Endpoint URL");
    return false;
  }
  if (!params.neuwoApiToken) {
    logError(MODULE_NAME, "init:", "Missing Neuwo API Token missing");
    return false;
  }
  return true;
}

/**
 * Fetches contextual data from the Neuwo API and enriches the bid request object with IAB categories.
 * Uses cached response if available to avoid redundant API calls.
 *
 * @param {Object} reqBidsConfigObj The bid request configuration object.
 * @param {function} callback The callback function to continue the auction.
 * @param {Object} config The module configuration.
 * @param {Object} config.params Configuration parameters.
 * @param {string} config.params.neuwoApiUrl The Neuwo API endpoint URL.
 * @param {string} config.params.neuwoApiToken The Neuwo API authentication token.
 * @param {string} [config.params.websiteToAnalyseUrl] Optional URL to analyze instead of current page.
 * @param {string} [config.params.iabContentTaxonomyVersion] IAB content taxonomy version (default: "3.0").
 * @param {boolean} [config.params.enableCache=true] If true, caches API responses to avoid redundant requests (default: true).
 * @param {boolean} [config.params.stripAllQueryParams] If true, strips all query parameters from the URL.
 * @param {string[]} [config.params.stripQueryParamsForDomains] List of domains for which to strip all query params.
 * @param {string[]} [config.params.stripQueryParams] List of specific query parameter names to strip.
 * @param {boolean} [config.params.stripFragments] If true, strips URL fragments (hash).
 * @param {Object} userConsent The user consent object.
 */
export function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  logInfo(MODULE_NAME, "getBidRequestData:", "starting getBidRequestData", config);

  const {
    websiteToAnalyseUrl,
    neuwoApiUrl,
    neuwoApiToken,
    iabContentTaxonomyVersion,
    enableCache = true,
    stripAllQueryParams,
    stripQueryParamsForDomains,
    stripQueryParams,
    stripFragments,
  } = config.params;

  const rawUrl = websiteToAnalyseUrl || getRefererInfo().page;
  const processedUrl = cleanUrl(rawUrl, {
    stripAllQueryParams,
    stripQueryParamsForDomains,
    stripQueryParams,
    stripFragments
  });
  const pageUrl = encodeURIComponent(processedUrl);
  // Adjusted for pages api.url?prefix=test (to add params with '&') as well as api.url (to add params with '?')
  const joiner = neuwoApiUrl.indexOf("?") < 0 ? "?" : "&";
  const neuwoApiUrlFull =
    neuwoApiUrl + joiner + ["token=" + neuwoApiToken, "url=" + pageUrl].join("&");

  const success = (response) => {
    logInfo(MODULE_NAME, "getBidRequestData:", "Neuwo API raw response:", response);
    try {
      const responseParsed = JSON.parse(response);

      if (enableCache) {
        globalCachedResponse = responseParsed;
      }

      injectIabCategories(responseParsed, reqBidsConfigObj, iabContentTaxonomyVersion);
    } catch (ex) {
      logError(MODULE_NAME, "getBidRequestData:", "Error while processing Neuwo API response", ex);
    }
    callback();
  };

  const error = (err) => {
    logError(MODULE_NAME, "getBidRequestData:", "AJAX error:", err);
    callback();
  };

  if (enableCache && globalCachedResponse) {
    logInfo(MODULE_NAME, "getBidRequestData:", "Using cached response:", globalCachedResponse);
    injectIabCategories(globalCachedResponse, reqBidsConfigObj, iabContentTaxonomyVersion);
    callback();
  } else {
    logInfo(MODULE_NAME, "getBidRequestData:", "Calling Neuwo API Endpoint: ", neuwoApiUrlFull);
    ajax(neuwoApiUrlFull, { success, error }, null);
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
  const { stripAllQueryParams, stripQueryParamsForDomains, stripQueryParams, stripFragments } = options;

  if (!url) {
    logInfo(MODULE_NAME, "cleanUrl:", "Empty or null URL provided, returning as-is");
    return url;
  }

  logInfo(MODULE_NAME, "cleanUrl:", "Input URL:", url, "Options:", options);

  try {
    const urlObj = new URL(url);

    // Strip fragments if requested
    if (stripFragments === true) {
      urlObj.hash = "";
      logInfo(MODULE_NAME, "cleanUrl:", "Stripped fragment from URL");
    }

    // Option 1: Strip all query params unconditionally
    if (stripAllQueryParams === true) {
      urlObj.search = "";
      const cleanedUrl = urlObj.toString();
      logInfo(MODULE_NAME, "cleanUrl:", "Output URL:", cleanedUrl);
      return cleanedUrl;
    }

    // Option 2: Strip all query params for specific domains
    if (Array.isArray(stripQueryParamsForDomains) && stripQueryParamsForDomains.length > 0) {
      const hostname = urlObj.hostname;
      const shouldStripForDomain = stripQueryParamsForDomains.some(domain => {
        // Support exact match or subdomain match
        return hostname === domain || hostname.endsWith("." + domain);
      });

      if (shouldStripForDomain) {
        urlObj.search = "";
        const cleanedUrl = urlObj.toString();
        logInfo(MODULE_NAME, "cleanUrl:", "Output URL:", cleanedUrl);
        return cleanedUrl;
      }
    }

    // Option 3: Strip specific query parameters
    // Caveats:
    // - "?=value" is treated as query parameter with key "" and value "value"
    // - "??" is treated as query parameter with key "?" and value ""
    if (Array.isArray(stripQueryParams) && stripQueryParams.length > 0) {
      const queryParams = urlObj.searchParams;
      logInfo(MODULE_NAME, "cleanUrl:", `Query parameters to strip: ${stripQueryParams}`);
      stripQueryParams.forEach(param => {
        queryParams.delete(param);
      });
      urlObj.search = queryParams.toString();
      const cleanedUrl = urlObj.toString();
      logInfo(MODULE_NAME, "cleanUrl:", "Output URL:", cleanedUrl);
      return cleanedUrl;
    }

    const finalUrl = urlObj.toString();
    logInfo(MODULE_NAME, "cleanUrl:", "Output URL:", finalUrl);
    return finalUrl;
  } catch (e) {
    logError(MODULE_NAME, "cleanUrl:", "Error cleaning URL:", e);
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
 * Builds an IAB category data object for use in OpenRTB.
 *
 * @param {Object} marketingCategories Marketing Categories returned by Neuwo API.
 * @param {string[]} tiers The tier keys to extract from marketingCategories.
 * @param {number} segtax The IAB taxonomy version Id.
 * @returns {Object} The constructed data object.
 */
export function buildIabData(marketingCategories, tiers, segtax) {
  const data = {
    name: DATA_PROVIDER,
    segment: [],
    ext: { segtax },
  };

  tiers.forEach((tier) => {
    const tierData = marketingCategories?.[tier];
    if (Array.isArray(tierData)) {
      tierData.forEach((item) => {
        const ID = item?.ID;
        const label = item?.label;

        if (ID && label) {
          data.segment.push({ id: ID, name: label });
        }
      });
    }
  });

  return data;
}

/**
 * Processes the Neuwo API response to build and inject IAB content and audience categories
 * into the bid request object.
 *
 * @param {Object} responseParsed The parsed JSON response from the Neuwo API.
 * @param {Object} reqBidsConfigObj The bid request configuration object to be modified.
 * @param {string} iabContentTaxonomyVersion The version of the IAB content taxonomy to use for segtax mapping.
 */
function injectIabCategories(responseParsed, reqBidsConfigObj, iabContentTaxonomyVersion) {
  const marketingCategories = responseParsed.marketing_categories;

  if (!marketingCategories) {
    logError(MODULE_NAME, "injectIabCategories:", "No Marketing Categories in Neuwo API response.");
    return
  }

  // Process content categories
  const contentTiers = ["iab_tier_1", "iab_tier_2", "iab_tier_3"];
  const contentData = buildIabData(
    marketingCategories,
    contentTiers,
    IAB_CONTENT_TAXONOMY_MAP[iabContentTaxonomyVersion] || IAB_CONTENT_TAXONOMY_MAP["3.0"]
  );

  // Process audience categories
  const audienceTiers = ["iab_audience_tier_3", "iab_audience_tier_4", "iab_audience_tier_5"];
  const audienceData = buildIabData(marketingCategories, audienceTiers, 4);

  logInfo(MODULE_NAME, "injectIabCategories:", "contentData structure:", contentData);
  logInfo(MODULE_NAME, "injectIabCategories:", "audienceData structure:", audienceData);

  injectOrtbData(reqBidsConfigObj, "site.content.data", [contentData]);
  injectOrtbData(reqBidsConfigObj, "user.data", [audienceData]);

  logInfo(MODULE_NAME, "injectIabCategories:", "post-injection bidsConfig", reqBidsConfigObj);
}

export const neuwoRtdModule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
};

submodule("realTimeData", neuwoRtdModule);
