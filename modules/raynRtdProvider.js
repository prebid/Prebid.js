/**
 * This module adds the Rayn provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 * The module will fetch real-time audience and context data from Rayn
 * @module modules/raynRtdProvider
 * @requires module:modules/realTimeData
 */

import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { deepAccess, deepSetValue, logError, logMessage, mergeDeep } from '../src/utils.js';

const MODULE_NAME = 'realTimeData';
const SUBMODULE_NAME = 'rayn';
const RAYN_TCF_ID = 1220;
const LOG_PREFIX = 'RaynJS: ';
export const SEGMENTS_RESOLVER = 'rayn.io';
export const RAYN_LOCAL_STORAGE_KEY = 'rayn-segtax';

const defaultIntegration = {
  iabAudienceCategories: {
    v1_1: {
      tier: 6,
      enabled: true,
    },
  },
  iabContentCategories: {
    v3_0: {
      tier: 4,
      enabled: true,
    },
    v2_2: {
      tier: 4,
      enabled: true,
    },
  },
};

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: SUBMODULE_NAME,
});

function init(moduleConfig, userConsent) {
  return true;
}

/**
 * Create and return ORTB2 object with segtax and segments
 * @param {number} segtax
 * @param {Array} segmentIds
 * @param {number} maxTier
 * @return {Array}
 */
export function generateOrtbDataObject(segtax, segment, maxTier) {
  const segmentIds = [];

  try {
    Object.keys(segment).forEach(tier => {
      if (tier <= maxTier) {
        segmentIds.push(...segment[tier].map((id) => {
          return { id };
        }))
      }
    });
  } catch (error) {
    logError(LOG_PREFIX, error);
  }

  return {
    name: SEGMENTS_RESOLVER,
    ext: {
      segtax,
    },
    segment: segmentIds,
  };
}

/**
 * Generates checksum
 * @param {string} url
 * @returns {string}
 */
export function generateChecksum(stringValue) {
  const l = stringValue.length;
  let i = 0;
  let h = 0;
  if (l > 0) while (i < l) h = ((h << 5) - h + stringValue.charCodeAt(i++)) | 0;
  return h.toString();
};

/**
 * Gets an object of segtax and segment IDs from LocalStorage
 * or return the default value provided.
 * @param {string} key
 * @return {Object}
 */
export function readSegments(key) {
  try {
    return JSON.parse(storage.getDataFromLocalStorage(key));
  } catch (error) {
    logError(LOG_PREFIX, error);
    return null;
  }
}

/**
 * Pass segments to configured bidders, using ORTB2
 * @param {Object} bidConfig
 * @param {Array} bidders
 * @param {Object} integrationConfig
 * @param {Array} segments
 * @return {void}
 */
export function setSegmentsAsBidderOrtb2(bidConfig, bidders, integrationConfig, segments, checksum) {
  const raynOrtb2 = {};

  const raynContentData = [];
  if (integrationConfig.iabContentCategories.v2_2.enabled && segments[checksum] && segments[checksum][6]) {
    raynContentData.push(generateOrtbDataObject(6, segments[checksum][6], integrationConfig.iabContentCategories.v2_2.tier));
  }
  if (integrationConfig.iabContentCategories.v3_0.enabled && segments[checksum] && segments[checksum][7]) {
    raynContentData.push(generateOrtbDataObject(7, segments[checksum][7], integrationConfig.iabContentCategories.v3_0.tier));
  }
  if (raynContentData.length > 0) {
    deepSetValue(raynOrtb2, 'site.content.data', raynContentData);
  }

  if (integrationConfig.iabAudienceCategories.v1_1.enabled && segments[4]) {
    const raynUserData = [generateOrtbDataObject(4, segments[4], integrationConfig.iabAudienceCategories.v1_1.tier)];
    deepSetValue(raynOrtb2, 'user.data', raynUserData);
  }

  if (!bidders || bidders.length === 0 || !segments || Object.keys(segments).length <= 0) {
    mergeDeep(bidConfig?.ortb2Fragments?.global, raynOrtb2);
  } else {
    const bidderConfig = Object.fromEntries(
      bidders.map((bidder) => [bidder, raynOrtb2]),
    );
    mergeDeep(bidConfig?.ortb2Fragments?.bidder, bidderConfig);
  }
}

/**
 * Real-time data retrieval from Rayn
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 * @return {void}
 */
function alterBidRequests(reqBidsConfigObj, callback, config, userConsent) {
  try {
    const checksum = generateChecksum(window.location.href);

    const segments = readSegments(RAYN_LOCAL_STORAGE_KEY);

    const bidders = deepAccess(config, 'params.bidders');
    const integrationConfig = mergeDeep(defaultIntegration, deepAccess(config, 'params.integration'));

    if (segments && Object.keys(segments).length > 0 && (
      segments[checksum] || (segments[4] &&
        integrationConfig.iabAudienceCategories.v1_1.enabled &&
        !integrationConfig.iabContentCategories.v2_2.enabled &&
        !integrationConfig.iabContentCategories.v3_0.enabled
      )
    )) {
      logMessage(LOG_PREFIX, `Segtax data from localStorage: ${JSON.stringify(segments)}`);
      setSegmentsAsBidderOrtb2(reqBidsConfigObj, bidders, integrationConfig, segments, checksum);
      callback();
    } else if (window.raynJS && typeof window.raynJS.getSegtax === 'function') {
      window.raynJS.getSegtax().then((segtaxData) => {
        logMessage(LOG_PREFIX, `Segtax data from RaynJS: ${JSON.stringify(segtaxData)}`);
        setSegmentsAsBidderOrtb2(reqBidsConfigObj, bidders, integrationConfig, segtaxData, checksum);
        callback();
      }).catch((error) => {
        logError(LOG_PREFIX, error);
        callback();
      });
    } else {
      logMessage(LOG_PREFIX, 'No segtax data');
      callback();
    }
  } catch (error) {
    logError(LOG_PREFIX, error);
    callback();
  }
}

export const raynSubmodule = {
  name: SUBMODULE_NAME,
  init: init,
  getBidRequestData: alterBidRequests,
  gvlid: RAYN_TCF_ID,
};

submodule(MODULE_NAME, raynSubmodule);
