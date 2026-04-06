/**
 * Agentic Audience Adapter – injects Agentic Audiences (vector-based) signals into the OpenRTB request.
 * Conforms to the OpenRTB community extension:
 * {@link https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/agentic-audiences.md Agentic Audiences in OpenRTB}
 *
 * Context: {@link https://github.com/IABTechLab/agentic-audiences IABTechLab Agentic Audiences}
 *
 * The {@link module:modules/realTimeData} module is required
 * @module modules/agenticAudienceAdapter
 * @requires module:modules/realTimeData
 */

import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { logInfo, mergeDeep } from '../src/utils.js';
import { VENDORLESS_GVLID } from '../src/consentHandler.js';

/**
 * @typedef {import('./rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = 'agenticAudience';

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

function dataFromLocalStorage(key) {
  return storage.localStorageIsEnabled() ? storage.getDataFromLocalStorage(key) : null;
}

function dataFromCookie(key) {
  return storage.cookiesAreEnabled() ? storage.getCookie(key) : null;
}

/**
 * Map a stored entry to an OpenRTB Segment (Agentic Audiences): id, name, ext.{ver, vector, dimension, model, type}
 * Assumes storage matches the intended shape; fields are copied without validation or coercion.
 * @param {Object} entry - Raw entry from storage `entries` array
 * @returns {Object|null}
 */
export function mapEntryToOpenRtbSegment(entry) {
  if (entry == null || typeof entry !== 'object') return null;

  return {
    id: entry.id,
    name: entry.name,
    ext: {
      ver: entry.ver,
      vector: entry.vector,
      dimension: entry.dimension,
      model: entry.model,
      type: entry.type
    }
  };
}

function init(config, userConsent) {
  const providers = config?.params?.providers;
  if (!providers || typeof providers !== 'object' || Object.keys(providers).length === 0) {
    return false;
  }
  return true;
}

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const providers = config?.params?.providers;
  if (!providers || typeof providers !== 'object' || Object.keys(providers).length === 0) {
    callback();
    return;
  }

  const data = [];
  const providerKeys = Object.keys(providers);

  for (let i = 0; i < providerKeys.length; i++) {
    const provider = providerKeys[i];
    const providerParams = providers[provider];
    const storageKey = providerParams && providerParams.storageKey;
    if (!storageKey) continue;

    const segments = getSegmentsForStorageKey(storageKey);

    if (segments && segments.length > 0) {
      data.push({
        name: provider,
        segment: segments
      });
    }
  }

  if (data.length === 0) {
    callback();
    return;
  }

  const updated = {
    user: {
      data
    }
  };

  mergeDeep(reqBidsConfigObj.ortb2Fragments.global, updated);
  callback();
}

function tryParse(data) {
  try {
    return JSON.parse(atob(data));
  } catch (error) {
    logInfo(error);
    return null;
  }
}

function getSegmentsForStorageKey(key) {
  const storedData = dataFromLocalStorage(key) || dataFromCookie(key);

  if (!storedData || typeof storedData !== 'string') {
    return [];
  }

  const parsed = tryParse(storedData);

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
    return [];
  }

  return parsed.entries
    .map(entry => mapEntryToOpenRtbSegment(entry))
    .filter(seg => seg != null);
}

/** @type {RtdSubmodule} */
export const agenticAudienceAdapterSubmodule = {
  name: MODULE_NAME,
  gvlid: VENDORLESS_GVLID,
  init,
  getBidRequestData
};

submodule(REAL_TIME_MODULE, agenticAudienceAdapterSubmodule);
