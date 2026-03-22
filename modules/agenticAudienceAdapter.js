/**
 * Agentic Audience Adapter – injects Agentic Audiences (vector-based) signals into the OpenRTB request.
 * See: https://github.com/IABTechLab/agentic-audiences
 *
 * The {@link module:modules/realTimeData} module is required
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

    const providerEntries = getEntries(storageKey);

    if (providerEntries && providerEntries.length > 0) {
      data.push({
        name: provider,
        segment: providerEntries
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

function getEntries(key) {
  const storedData = dataFromLocalStorage(key) || dataFromCookie(key);

  if (!storedData || typeof storedData !== 'string') {
    return [];
  }

  const parsed = tryParse(storedData);

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) {
    return [];
  }

  return parsed.entries.map(entry => ({
    ver: entry['ver'],
    vector: entry['vector'],
    model: entry['model'],
    dimension: entry['dimension'],
    type: entry['type']
  }));
}

/** @type {RtdSubmodule} */
export const agenticAudienceAdapterSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData
};

submodule(REAL_TIME_MODULE, agenticAudienceAdapterSubmodule);
