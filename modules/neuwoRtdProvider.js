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
 * @param {Object} config The module configuration.
 * @param {Object} userConsent The user consent object.
 * @returns {boolean} `true` if the module is configured correctly, otherwise `false`.
 */
function init(config, userConsent) {
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
 * @param {Object} reqBidsConfigObj The bid request configuration object.
 * @param {function} callback The callback function to continue the auction.
 * @param {Object} config The module configuration.
 * @param {Object} userConsent The user consent object.
 */
export function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  logInfo(MODULE_NAME, "getBidRequestData:", "starting getBidRequestData", config);

  const { websiteToAnalyseUrl, neuwoApiUrl, neuwoApiToken, iabContentTaxonomyVersion } =
    config.params;

  const pageUrl = encodeURIComponent(websiteToAnalyseUrl || getRefererInfo().page);
  // Adjusted for pages api.url?prefix=test (to add params with '&') as well as api.url (to add params with '?')
  const joiner = neuwoApiUrl.indexOf("?") < 0 ? "?" : "&";
  const neuwoApiUrlFull =
    neuwoApiUrl + joiner + ["token=" + neuwoApiToken, "url=" + pageUrl].join("&");

  const success = (response) => {
    logInfo(MODULE_NAME, "getBidRequestData:", "Neuwo API raw response:", response);
    try {
      const responseJson = JSON.parse(response);
      injectIabCategories(responseJson, reqBidsConfigObj, iabContentTaxonomyVersion);
    } catch (ex) {
      logError(MODULE_NAME, "getBidRequestData:", "Error while processing Neuwo API response", ex);
    }
    callback();
  };

  const error = (err) => {
    logError(MODULE_NAME, "getBidRequestData:", "AJAX error:", err);
    callback();
  };

  ajax(neuwoApiUrlFull, { success, error }, null);
}

//
// HELPER FUNCTIONS
//

/**
 * Injects data into the OpenRTB 2.x global fragments of the bid request object.
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
 * @param {Object} responseJson The parsed JSON response from the Neuwo API.
 * @param {Object} reqBidsConfigObj The bid request configuration object to be modified.
 * @param {string} iabContentTaxonomyVersion The version of the IAB content taxonomy to use for segtax mapping.
 */
function injectIabCategories(responseJson, reqBidsConfigObj, iabContentTaxonomyVersion) {
  const marketingCategories = responseJson.marketing_categories;

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
