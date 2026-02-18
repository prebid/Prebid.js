import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { loadExternalScript } from '../src/adloader.js';
import { ajax } from '../src/ajax.js';
import { submodule } from '../src/hook.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getStorageManager } from '../src/storageManager.js';
import { mergeDeep, prefixLog } from '../src/utils.js';

const MODULE_NAME = 'nodalsAi';
const GVLID = 1360;
const ENGINE_VESION = '1.x.x';
const PUB_ENDPOINT_ORIGIN = 'https://nodals.io';
const LOCAL_STORAGE_KEY = 'signals.nodals.ai';
const DEFAULT_STORAGE_TTL = 3600; // 1 hour in seconds

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
  #dataFetchInProgress = false;
  #userConsent = null;

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
      this.#hasRequiredUserConsent(userConsent, config)
    ) {
      this.#propertyId = params.propertyId;
      this.#userConsent = userConsent;
      this.#setOverrides(params);
      const storedData = this.#readFromStorage();
      if (storedData === null) {
        this.#fetchData();
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
    if (!this.#hasRequiredUserConsent(userConsent, config)) {
      return targetingData;
    }
    this.#userConsent = userConsent;
    const storedData = this.#getData();
    const engine = this.#initialiseEngine(config);
    if (!storedData || !engine) {
      return targetingData;
    }
    try {
      targetingData = engine.getTargetingData(
        adUnitArray,
        userConsent,
        storedData
      );
    } catch (error) {
      logError(`Error determining targeting keys: ${error}`);
    }
    return targetingData;
  }

  getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
    if (!this.#hasRequiredUserConsent(userConsent, config)) {
      callback();
      return;
    }
    this.#userConsent = userConsent;
    const storedData = this.#getData();
    if (!storedData) {
      callback();
      return;
    }
    const engine = this.#initialiseEngine(config);
    if (!engine) {
      this.#addToCommandQueue('getBidRequestData', {config, reqBidsConfigObj, callback, userConsent, storedData });
    } else {
      try {
        engine.getBidRequestData(
          reqBidsConfigObj,
          callback,
          userConsent,
          storedData
        );
      } catch (error) {
        logError(`Error getting bid request data: ${error}`);
        callback();
      }
    }
  }

  onBidResponseEvent(bidResponse, config, userConsent) {
    if (!this.#hasRequiredUserConsent(userConsent, config)) {
      return;
    }
    this.#userConsent = userConsent;
    const storedData = this.#getData();
    if (!storedData) {
      return;
    }
    const engine = this.#initialiseEngine(config);
    if (!engine) {
      this.#addToCommandQueue('onBidResponseEvent', {config, bidResponse, userConsent, storedData })
      return;
    }
    try {
      engine.onBidResponseEvent(bidResponse, userConsent, storedData);
    } catch (error) {
      logError(`Error processing bid response event: ${error}`);
    }
  }

  onAuctionEndEvent(auctionDetails, config, userConsent) {
    if (!this.#hasRequiredUserConsent(userConsent, config)) {
      return;
    }
    this.#userConsent = userConsent;
    const storedData = this.#getData();
    if (!storedData) {
      return;
    }
    const engine = this.#initialiseEngine(config);
    if (!engine) {
      this.#addToCommandQueue('onAuctionEndEvent', {config, auctionDetails, userConsent, storedData });
      return;
    }
    try {
      engine.onAuctionEndEvent(auctionDetails, userConsent, storedData);
    } catch (error) {
      logError(`Error processing auction end event: ${error}`);
    }
  }

  // Private methods
  #getData() {
    const storedData = this.#readFromStorage();
    if (storedData === null) {
      this.#fetchData();
      return null;
    }
    if (storedData.facts === undefined) {
      storedData.facts = {};
    }
    storedData.facts = mergeDeep(storedData.facts, this.#getRuntimeFacts());
    return storedData;
  }

  #initialiseEngine(config) {
    const engine = this.#getEngine();
    if (!engine) {
      logInfo(`Engine v${ENGINE_VESION} not found`);
      return null;
    }
    try {
      engine.init(config);
      return engine
    } catch (error) {
      logError(`Error initialising engine: ${error}`);
      return null;
    }
  }

  #getEngine() {
    try {
      return window?.$nodals?.adTargetingEngine?.[ENGINE_VESION];
    } catch (error) {
      return undefined;
    }
  }

  #setOverrides(params) {
    if (params?.storage?.ttl && typeof params.storage.ttl === 'number') {
      this.#overrides.storageTTL = params.storage.ttl;
    }
    this.#overrides.storageKey = params?.storage?.key;
    this.#overrides.endpointOrigin = params?.endpoint?.origin;
  }

  #getRuntimeFacts() {
    return {
      'page.url': getRefererInfo().page,
      'prebid.version': '$prebid.version$',
    };
  }

  /**
   * Validates if the provided module input parameters are valid.
   * @param {Object} params - Parameters object from the module configuration.
   * @returns {boolean} - True if parameters are valid, false otherwise.
   */

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
   * @param {Object} config - Configuration object for the module.
   * @returns {boolean} - True if the user consent is valid, false otherwise.
   */

  #hasRequiredUserConsent(userConsent, config) {
    if (config?.params?.publisherProvidedConsent === true || !userConsent.gdpr || userConsent.gdpr?.gdprApplies === false) {
      return true;
    }
    if (
      [false, undefined].includes(userConsent.gdpr.vendorData?.vendor?.consents?.[this.gvlid])
    ) {
      return false;
    } else if (userConsent.gdpr.vendorData?.purpose?.consents[1] === false ||
      userConsent.gdpr.vendorData?.purpose?.consents[7] === false
    ) {
      return false;
    }
    return true;
  }

  #readFromStorage() {
    const key = this.#overrides?.storageKey || this.STORAGE_KEY;
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
          logInfo('Stale data found in storage. Refreshing data.');
          this.#fetchData();
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

  #dataIsStale(dataEnvelope) {
    const currentTime = Date.now();
    const dataTime = dataEnvelope.createdAt || 0;
    const staleThreshold = this.#overrides?.storageTTL ?? dataEnvelope?.data?.meta?.ttl ?? DEFAULT_STORAGE_TTL;
    return currentTime - dataTime >= (staleThreshold * 1000);
  }

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

  #fetchData() {
    if (this.#dataFetchInProgress) {
      return;
    }
    this.#dataFetchInProgress = true;
    const endpointUrl = this.#getEndpointUrl(this.#userConsent);
    const callback = {
      success: (response, req) => {
        this.#dataFetchInProgress = false;
        this.#handleServerResponse(response, req);
      },
      error: (error, req) => {
        this.#dataFetchInProgress = false;
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

  #addToCommandQueue(cmd, payload) {
    window.$nodals = window.$nodals || {};
    window.$nodals.cmdQueue = window.$nodals.cmdQueue || [];
    window.$nodals.cmdQueue.push({ cmd, runtimeFacts: this.#getRuntimeFacts(), data: payload });
  }

  /**
   * Handles the server response, processes it and extracts relevant data.
   * @param {Object} response - The server response object.
   * @returns {Object} - Processed data from the response.
   */

  #handleServerResponse(response, req) {
    let data;
    try {
      data = JSON.parse(response);
    } catch (error) {
      const msg = `Error parsing response: ${error}`;
      logError(msg);
      return;
    }
    this.#writeToStorage(this.#overrides?.storageKey || this.STORAGE_KEY, data);
    this.#loadAdLibraries(data.deps || []);
  }

  #handleServerError(error, req) {
    logError(`Publisher endpoint response error: ${error}`);
  }

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
