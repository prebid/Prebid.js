/**
 * This module adds the Mantis provider to the real time data module.
 * The {@link module:modules/realTimeData} module is required.
 * The module will fetch contextual data from the Mantis API
 * and populate ortb2 site and user data before the auction.
 * @module modules/mantisRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import { fetch } from '../src/ajax.js';
import { mergeDeep, logMessage, logError, logWarn, logInfo } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const SUBMODULE_NAME = 'mantis';
const LOG_PREFIX = 'mantisRtdProvider:';
const BASIC_MANTIS_KEYS = ['mantis', 'mantis_context', 'iab_context'];

const getMantisKeysSegmentData = (targetingData) => {
  if (!targetingData || !targetingData.standard) {
    logWarn('Empty mantis data received for standard targeting');
    return [];
  }
  const segments = [];
  for (const mantisKey of BASIC_MANTIS_KEYS) {
    const keySegments = (targetingData.standard[mantisKey] || "").split(",").map(val => val?.trim()).filter(Boolean).map(id => ({ id }));
    segments.push({
      name: mantisKey,
      segment: [...new Map(keySegments.map(s => [s.id, s])).values()],
    });
  }
  return segments;
}

export const storage = getStorageManager({ moduleType: MODULE_TYPE_RTD, moduleName: SUBMODULE_NAME });

/**
 * Retrieve the Mantis UUID from window or local storage (set by the bid adapter).
 * @returns {string|undefined}
 */
function getMantisUuid() {
  if (window.mantis_uuid) {
    return window.mantis_uuid;
  }
  if (storage.hasLocalStorage()) {
    try {
      return storage.getDataFromLocalStorage('mantis:uuid') || undefined;
    } catch (e) { }
  }
}

const cleanUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    // parsedUrl.host gives hostname:port (if port is specified)
    return parsedUrl.host + parsedUrl.pathname;
  } catch (error) {
    logWarn(`${LOG_PREFIX} Invalid url: ${error?.message}`);
    return '';
  }
};

/**
 * Build the Mantis RTD API request URL.
 * @param {string} endpoint - Publisher property ID from module config params.
 * @returns {string}
 */
export function buildApiUrl(endpoint) {
  const params = [
    "filter=fullRatings,input,findings,sentiment,emotion,categories",
    `url=${cleanUrl(window.location.href)}`,
  ];

  const uuid = getMantisUuid();
  if (uuid) {
    params.push(`uuid=${encodeURIComponent(uuid)}`);
  }

  return `${endpoint}?${params.join('&')}`;
}

// Extract relevant information from the API response and format it into an object with keys and values that can be used as targeting parameters
const processMantisData = (mantisData = {}) => {
  const { categories, emotion = {}, ratings = [], sentiment = '' } = mantisData;
  // Process emotions
  const mantisEmotions = Object.entries(emotion)
    .map(([k, { level }]) => (k === 'unknown' ? 'emotions-unknown' : `${k}-${level}`))
    .join(',');
  // Ensure mantisEmotions includes "emotions-unknown" if there are no emotions
  const finalMantisEmotions = mantisEmotions || 'emotions-unknown';
  // Process the sentiment into the format "sentiment-sentimentValue"
  const mantisSentiment = sentiment ? `sentiment-${sentiment}` : 'sentiment-unknown';
  // Process the ratings into a comma-separated string of format "customer-rating", skipping invalid ratings
  const mantisRatings = ratings
    .filter(({ rating }) => rating !== 'N/A')
    .map(({ customer, rating }) => `${customer}-${rating}`)
    .join(',');

  // Ensure mantisRatings is "unknown" if there are no valid ratings
  const finalMantisRatings = mantisRatings || 'unknown';
  // Define the mantis_source value
  const mantisSource = 'client-side';
  // Combine finalMantisRatings, mantisSentiment, and finalMantisEmotions into a single string
  const mantis = [finalMantisRatings, mantisSentiment, finalMantisEmotions, mantisSource].filter(Boolean).join(',');

  // Define the subsets for granular targeting
  const subsets = [
    {
      subset: 'mantis_green',
      source: ratings,
      key: 'rating',
      filter: 'GREEN',
      mapTo: 'customer',
    },
    {
      subset: 'mantis_amber',
      source: ratings,
      key: 'rating',
      filter: 'AMBER',
      mapTo: 'customer',
    },
    {
      subset: 'mantis_red',
      source: ratings,
      key: 'rating',
      filter: 'RED',
      mapTo: 'customer',
    },
    {
      subset: 'mantis_context',
      source: (categories?.mantis) || [],
      key: 'score',
      filter: 0.6,
      mapTo: 'label',
    },
    {
      subset: 'iab_context',
      source: (categories?.iab) || [],
      key: 'score',
      filter: 0.6,
      mapTo: 'id',
    },
  ].reduce((acc, { subset, source, key, filter, mapTo }) => {
    // Filter the source array based on the filter condition (either a value match or a numerical comparison)
    const filtered = source.filter(
      (entry) => (isNaN(filter) ? entry[key] === filter : entry[key] > filter),
    );
    // Map the filtered entries to the desired field and join them into a comma-separated string
    acc[subset] = filtered.length > 0 ? filtered.map((entry) => entry[mapTo]).join(',') : 'unknown';
    return acc;
  }, {});

  const standardData = { mantis, mantis_context: subsets.mantis_context, iab_context: subsets.iab_context };

  const processedMantisData = { standard: standardData };

  // Return the processed data, including emotions and sentiment separately if granular targeting is enabled
  return processedMantisData;
};

/**
 * Merge ortb2StructuredData data into the global ortb2 fragments.
 *
 * @param {Object} reqBidsConfigObj
 * @param {Object} ortb2StructuredData  - Parsed API response.
 */
export function setOrtb2FromResponse(reqBidsConfigObj, ortb2StructuredData) {
  // The global ortb2 fragments object to merge into.
  const ortb2 = reqBidsConfigObj.ortb2Fragments.global;
  if (!ortb2StructuredData || typeof ortb2StructuredData !== 'object') {
    return false;
  }

  if (ortb2StructuredData.site) {
    mergeDeep(ortb2, { site: ortb2StructuredData.site });
    mergeDeep(ortb2, { ext: ortb2StructuredData.ext });
    logMessage(`${LOG_PREFIX} merged site data`, ortb2StructuredData.site);
  }

  if (ortb2StructuredData.user) {
    mergeDeep(ortb2, { user: ortb2StructuredData.user });
    logMessage(`${LOG_PREFIX} merged user data`, ortb2StructuredData.user);
  }
  return true;
}

/**
 * Fetch RTD data from the Mantis API and populate ortb2 fragments.
 * @param {Object}   reqBidsConfigObj
 * @param {function} onDone
 * @param {Object}   moduleConfig
 */
export function getBidRequestData(reqBidsConfigObj, onDone, moduleConfig) {
  const { endpoint, username, password, timeout = 1000 } = moduleConfig.params;

  if (!endpoint || !username || !password) {
    logWarn(`${LOG_PREFIX} missing required param: params.property`);
    onDone();
    return;
  }

  const url = buildApiUrl(endpoint);
  const headers = new Headers({
    'Authorization': 'Basic ' + btoa(`${username}:${password}`),
  });

  let isDone = false;
  let mantisApiTimeout;

  const completeRequest = () => {
    if (!isDone) {
      isDone = true;
      clearTimeout(mantisApiTimeout);
      onDone();
    }
  };

  fetch(
    url,
    {
      method: 'POST',
      headers
    }).then(response => response.json())
    .then(data => {
      try {
        const processedData = processMantisData(data, { filterThreshold: moduleConfig.params.filterThreshold });
        const mantisSegments = getMantisKeysSegmentData(processedData);
        if (!mantisSegments || !Array.isArray(mantisSegments) || !mantisSegments.length) {
          logInfo(`${LOG_PREFIX} empty mantis data received`);
          completeRequest();
          return;
        }
        const ortb2StructuredData = {
          site: {
            content: {
              data: mantisSegments
            }
          },
          user: {
            data: mantisSegments
          },
          ext: {
            data: mantisSegments
          }
        }
        const hasSetOrtb2Data = setOrtb2FromResponse(reqBidsConfigObj, ortb2StructuredData);
        if (!hasSetOrtb2Data) {
          logError(`${LOG_PREFIX} error occured while setting data into ortb2Fragments.global`);
        }
      } catch (e) {
        logError(`${LOG_PREFIX} failed to process data from Mantis API`, e?.message);
        completeRequest();
      }
    }).catch(error => {
      logError(`${LOG_PREFIX} Mantis API request failed`, error?.message);
      completeRequest();
    });

  mantisApiTimeout = setTimeout(function () {
    if (!isDone) {
      logInfo('Mantis API timeout');
      completeRequest();
    }
  }, timeout);
}
/**
 * Module init — validate required config params.
 * @param {Object} moduleConfig
 * @returns {boolean}
 * @example window.pbjs.setConfig({
              realTimeData: {
                auctionDelay: 5000, // Should be as low as possible for production
                dataProviders: [
                  {
                    name: 'mantis',
                    waitForIt: true,
                    params:
                    {
                      endpoint: 'https://mantis.example.com',
                      username: 'user',
                      password: 'pass',
                      timeout: 1000,
                      filterThreshold: 0.6
                    }
                  }
                ]
              }
            })
 */
function init(moduleConfig) {
  const params = moduleConfig.params;

  if (typeof params !== 'object') {
    logError(`${LOG_PREFIX} Missing Or invalid mantis config`);
    return false;
  }

  const { endpoint, username, password } = params;
  if (!endpoint || !username || !password) {
    logError(`${LOG_PREFIX} Missing required parameters in mantis config`);
    return false;
  }

  logMessage(`${LOG_PREFIX} Mantis RTD module initialized`);
  return true;
}

/** @type {RtdSubmodule} */
export const mantisDataModule = {
  name: SUBMODULE_NAME,
  init,
  getBidRequestData,
};

submodule('realTimeData', mantisDataModule);
