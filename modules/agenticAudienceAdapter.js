/**
 * Agentic Audience Adapter – injects Agentic Audiences (vector-based) signals into the OpenRTB request.
 * See: https://github.com/IABTechLab/agentic-audiences
 *
 * The {@link module:modules/realTimeData} module is required
 * @module modules/agenticAudienceAdapter
 * @requires module:modules/realTimeData
 */

import { identity } from 'lodash';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { logInfo, logError } from '../src/utils.js';

/**
 * @typedef {import('./rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = 'agenticAudience';
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
 * @param {Object} config
 * @param {Object} userConsent
 * @returns {boolean}
 */
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
  const entries = [];

  if (defaultEntries = getEntries(DEFAULT_STORAGE_KEY)) {
    defaultEntries.forEach(entry => { entries.push(entry); });
  }

  const configParams = (config && config.params) ? config.params : {};
  const providers = Object.keys(configParams['providers']);

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    const providerParams = configParams['providers'][provider];
    const providerEntries = getEntries(providerParams['storageKey']);
    providerEntries.forEach(entry => { entries.push(entry); });
  }

  const updated = {
    user: {
      data: {
        name: 'agentic-audiences.org',
        segment: entries
      }
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
  
  if (!storedData || typeof storedData != 'string') {
    return [];
  }

  const parsed = tryParse(storedData);
  
  if (!parsed || typeof parsed != 'object') {
    return [];
  }

  return parsed['entries'].map(entry => ({
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
