/**
 * Agentic Audience Adapter – injects Agentic Audiences (vector-based) signals into the OpenRTB request.
 * Conforms to the OpenRTB community extension:
 * {@link https://github.com/InteractiveAdvertisingBureau/openrtb/blob/main/extensions/community_extensions/agentic-audiences.md Agentic Audiences in OpenRTB}
 *
 * Context: {@link https://github.com/IABTechLab/agentic-audiences IABTechLab Agentic Audiences}
 *
 * The {@link module:modules/realTimeData} module is required
 *
 * Injects one OpenRTB `Data` object into `user.data` (`name` = submodule id, `segment[]` from storage).
 * Each segment has optional `id`/`name` and `ext.aa` with `ver`, `vector`, `dimension`, `model`, `type`.
 * Storage is read from the default key (see `DEFAULT_STORAGE_KEY` export) unless `params.storageKey` is set.
 *
 * @module modules/agenticAudienceAdapter
 * @requires module:modules/realTimeData
 */

import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { logInfo, mergeDeep } from '../src/utils.js';

/**
 * @typedef {import('./rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = 'agenticAudience';

/** @type {string} Default localStorage / cookie key when `params.storageKey` is omitted. */
export const DEFAULT_STORAGE_KEY = '_agentic_audience_';

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
 * Map a stored entry to an OpenRTB Segment (Agentic Audiences): id, name, ext.aa.{ver, vector, dimension, model, type}
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
      aa: {
        ver: entry.ver,
        vector: entry.vector,
        dimension: entry.dimension,
        model: entry.model,
        type: entry.type
      }
    }
  };
}

function init(config, userConsent) {
  return true;
}

/**
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  const customKey = config?.params?.storageKey;
  const storageKey =
    typeof customKey === 'string' && customKey.length > 0 ? customKey : DEFAULT_STORAGE_KEY;

  const segments = getSegmentsForStorageKey(storageKey);

  if (!segments || segments.length === 0) {
    callback();
    return;
  }

  const updated = {
    user: {
      data: [
        {
          name: MODULE_NAME,
          segment: segments
        }
      ]
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
  init,
  getBidRequestData
};

submodule(REAL_TIME_MODULE, agenticAudienceAdapterSubmodule);
