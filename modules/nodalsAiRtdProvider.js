import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getStorageManager } from '../src/storageManager.js';
import { prefixLog } from '../src/utils.js';

const MODULE_NAME = 'nodalsAi';
const GVLID = 1360;
const PUB_ENDPOINT_ORIGIN = 'https://nodals.io';
const LOCAL_STORAGE_KEY = 'signals.nodals.ai';
const STORAGE_TTL = 3600; // 1 hour in seconds

const fillTemplate = (strings, ...keys) => {
  return function (values) {
    return strings.reduce((result, str, i) => {
      const key = keys[i - 1];
      return result + (key ? values[key] || '' : '') + str;
    });
  };
};

const PUB_ENDPOINT_PATH = fillTemplate`/p/v1/${'propertyId'}/config?${'consentParams'}`;
const { logInfo, logWarn, logError } = prefixLog('[NodalsAiRTDProvider]');

class NodalsAiRtdProvider {
  // Public properties
  name = MODULE_NAME;
  gvlid = GVLID;

  // Exposed for testing
  storage = getStorageManager({
    moduleType: MODULE_TYPE_RTD,
    moduleName: MODULE_NAME,
  });

  STORAGE_KEY = LOCAL_STORAGE_KEY;

  // Private properties
  #propertyId = null;
  #overrides = {};

  // Public methods

  /**
   * Initialises the class with the provided config and user consent.
   * @param {Object} config - Configuration object for the module.
   * @param {Object} userConsent - User consent object for GDPR or other purposes.
   */
  init(config, userConsent) {
    const params = config?.params || {};
    if (
      this.#isValidConfig(params) &&
      this.#hasRequiredUserConsent(userConsent)
    ) {
      this.#propertyId = params.propertyId;
      this.#setOverrides(params);
      const storedData = this.#readFromStorage(
        this.#overrides?.storageKey || this.STORAGE_KEY
      );
      if (storedData === null) {
        this.#fetchRules(userConsent);
      } else {
        this.#loadAdLibraries(storedData.deps || []);
      }
      return true;
    } else {
      logWarn('Invalid configuration or missing user consent.');
      return false;
    }
  }

  /**
   * Retrieves targeting data by fetching and processing signals.
   * @param {Array} adUnitArray - Array of ad units.
   * @param {Object} config - Configuration object.
   * @param {Object} userConsent - User consent object.
   * @returns {Object} - Targeting data.
   */
  getTargetingData(adUnitArray, config, userConsent) {
    let targetingData = {};
    if (!this.#hasRequiredUserConsent(userConsent)) {
      return targetingData;
    }
    const storedData = this.#readFromStorage(
      this.#overrides?.storageKey || this.STORAGE_KEY
    );
    if (storedData === null) {
      return targetingData;
    }
    const facts = Object.assign({}, storedData?.facts ?? {});
    facts['page.url'] = getRefererInfo().page;
    const targetingEngine = window?.$nodals?.adTargetingEngine['latest'];
    try {
      targetingEngine.init(config, facts);
      targetingData = targetingEngine.getTargetingData(
        adUnitArray,
        storedData,
        userConsent
      );
    } catch (error) {
      logError(`Error determining targeting keys: ${error}`);
    }
    return targetingData;
  }

  // Private methods
  #setOverrides(params) {
    if (params?.storage?.ttl && typeof params.storage.ttl === 'number') {
      this.#overrides.storageTTL = params.storage.ttl;
    }
    this.#overrides.storageKey = params?.storage?.key;
    this.#overrides.endpointOrigin = params?.endpoint?.origin;
  }

  /**
   * Validates if the provided module input parameters are valid.
   * @param {Object} params - Parameters object from the module configuration.
   * @returns {boolean} - True if parameters are valid, false otherwise.
   */
  // eslint-disable-next-line no-dupe-class-members
  #isValidConfig(params) {
    // Basic validation logic
    if (typeof params === 'object' && params?.propertyId) {
      return true;
    }
    logWarn('Invalid configuration');
    return false;
  }

  /**
   * Checks if the user has provided the required consent.
   * @param {Object} userConsent - User consent object.
   * @returns {boolean} - True if the user consent is valid, false otherwise.
   */
  // eslint-disable-next-line no-dupe-class-members
  #hasRequiredUserConsent(userConsent) {
    if (userConsent?.gdpr?.gdprApplies !== true) {
      return true;
    }
    if (
      userConsent?.gdpr?.vendorData?.vendor?.consents?.[this.gvlid] === false
    ) {
      return false;
    } else if (userConsent?.gdpr?.vendorData?.purpose?.consents[1] === false) {
      return false;
    }
    return true;
  }

  /**
   * @param {string} key - The key of the data to retrieve.
   * @returns {string|null} - The data from localStorage, or null if not found.
   */
  // eslint-disable-next-line no-dupe-class-members
  #readFromStorage(key) {
    if (
      this.storage.hasLocalStorage() &&
      this.storage.localStorageIsEnabled()
    ) {
      try {
        const entry = this.storage.getDataFromLocalStorage(key);
        if (!entry) {
          return null;
        }
        const dataEnvelope = JSON.parse(entry);
        if (this.#dataIsStale(dataEnvelope)) {
          this.storage.removeDataFromLocalStorage(key);
          return null;
        }
        if (!dataEnvelope.data) {
          throw new Error('Data envelope is missing \'data\' property.');
        }
        return dataEnvelope.data;
      } catch (error) {
        logError(`Corrupted data in local storage: ${error}`);
        return null;
      }
    } else {
      logError('Local storage is not available or not enabled.');
      return null;
    }
  }

  /**
   * Writes data to localStorage.
   * @param {string} key - The key under which to store the data.
   * @param {Object} data - The data to store.
   */
  // eslint-disable-next-line no-dupe-class-members
  #writeToStorage(key, data) {
    if (
      this.storage.hasLocalStorage() &&
      this.storage.localStorageIsEnabled()
    ) {
      const storageObject = {
        createdAt: Date.now(),
        data,
      };
      this.storage.setDataInLocalStorage(key, JSON.stringify(storageObject));
    } else {
      logError('Local storage is not available or not enabled.');
    }
  }

  /**
   * Checks if the provided data is stale.
   * @param {Object} dataEnvelope - The data envelope object.
   * @returns {boolean} - True if the data is stale, false otherwise.
   */
  // eslint-disable-next-line no-dupe-class-members
  #dataIsStale(dataEnvelope) {
    const currentTime = Date.now();
    const dataTime = dataEnvelope.createdAt || 0;
    const staleThreshold = this.#overrides?.storageTTL ?? dataEnvelope?.data?.meta?.ttl ?? STORAGE_TTL;
    return currentTime - dataTime >= (staleThreshold * 1000);
  }

  // eslint-disable-next-line no-dupe-class-members
  #getEndpointUrl(userConsent) {
    const endpointOrigin =
      this.#overrides.endpointOrigin || PUB_ENDPOINT_ORIGIN;
    const parameterMap = {
      gdpr_consent: userConsent?.gdpr?.consentString ?? '',
      gdpr: userConsent?.gdpr?.gdprApplies ? '1' : '0',
      us_privacy: userConsent?.uspConsent ?? '',
      gpp: userConsent?.gpp?.gppString ?? '',
      gpp_sid:
        userConsent.gpp && Array.isArray(userConsent.gpp.applicableSections)
          ? userConsent.gpp.applicableSections.join(',')
          : '',
    };
    const querystring = new URLSearchParams(parameterMap).toString();
    const values = {
      propertyId: this.#propertyId,
      consentParams: querystring,
    };
    const path = PUB_ENDPOINT_PATH(values);
    return `${endpointOrigin}${path}`;
  }

  /**
   * Initiates the request to fetch rule data from the publisher endpoint.
   */
  // eslint-disable-next-line no-dupe-class-members
  #fetchRules(userConsent) {
    const endpointUrl = this.#getEndpointUrl(userConsent);

    const callback = {
      success: (response, req) => {
        this.#handleServerResponse(response, req);
      },
      error: (error, req) => {
        this.#handleServerError(error, req);
      },
    };

    const options = {
      method: 'GET',
      withCredentials: false,
    };

    logInfo(`Fetching ad rules from: ${endpointUrl}`);
    ajax(endpointUrl, callback, null, options);
  }

  /**
   * Handles the server response, processes it and extracts relevant data.
   * @param {Object} response - The server response object.
   * @returns {Object} - Processed data from the response.
   */
  // eslint-disable-next-line no-dupe-class-members
  #handleServerResponse(response, req) {
    let data;
    try {
      data = JSON.parse(response);
    } catch (error) {
      throw `Error parsing response: ${error}`;
    }
    this.#writeToStorage(this.#overrides?.storageKey || this.STORAGE_KEY, data);
    this.#loadAdLibraries(data.deps || []);
  }

  // eslint-disable-next-line no-dupe-class-members
  #handleServerError(error, req) {
    logError(`Publisher endpoint response error: ${error}`);
  }

  // eslint-disable-next-line no-dupe-class-members
  #loadAdLibraries(deps) {
    // eslint-disable-next-line no-unused-vars
    for (const [key, value] of Object.entries(deps)) {
      if (typeof value === 'string') {
        loadExternalScript(value, MODULE_TYPE_RTD, MODULE_NAME, () => {
          // noop
        });
      }
    }
  }
}

export const nodalsAiRtdSubmodule = new NodalsAiRtdProvider();

submodule('realTimeData', nodalsAiRtdSubmodule);
