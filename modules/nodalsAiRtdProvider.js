import { MODULE_TYPE_RTD } from "../src/activities/modules.js";
import { loadExternalScript } from "../src/adloader.js";
import { ajax } from "../src/ajax.js";
import { submodule } from "../src/hook.js";
import { getStorageManager } from "../src/storageManager.js";
import { prefixLog } from "../src/utils.js";

const MODULE_NAME = "nodalsAi";
const GVLID = 1360;
const PUB_ENDPOINT_ORIGIN = "https://nodals.io";
const LOCAL_STORAGE_KEY = "signals.nodals.ai";
const STORAGE_TTL = 3600000; // 1 hour in milliseconds

const fillTemplate = (strings, ...keys) => {
  return function (values) {
    return strings.reduce((result, str, i) => {
      const key = keys[i - 1];
      return result + (key ? values[key] || "" : "") + str;
    });
  };
};

const PUB_ENDPOINT_PATH = fillTemplate`/p/v1/${"publisherId"}/config?${"consentParams"}`;
const { logInfo, logWarn, logError } = prefixLog("[NodalsAiRTDProvider]");

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
  #publisherId = null;
  #overrides = {};

  // Public methods

  /**
   * Initialises the class with the provided config and user consent.
   * @param {Object} config - Configuration object for targeting.
   * @param {Object} userConsent - User consent object for GDPR or other purposes.
   */
  init(config, userConsent) {
    if (
      this.#isValidConfig(config) &&
      this.#hasRequiredUserConsent(userConsent)
    ) {
      this.#publisherId = config.publisherId;
      this.#setOverrides(config);
      const storedData = this.#readFromStorage(
        this.#overrides?.storageKey || this.STORAGE_KEY
      );
      if (storedData === null) {
        this.#fetchAdRules(userConsent);
      } else {
        this.#loadAdLibraries(storedData.ads || []);
      }
      return true;
    } else {
      logWarn("Invalid configuration or missing user consent.");
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
    const facts = storedData?.facts ?? {};
    const ads = storedData?.ads ?? [];
    const targetingEngine = window.$nodals.AdTargetingEngine["latest"];
    targetingEngine.init(config, facts);
    try {
      targetingData = targetingEngine.getTargetingData(adUnitArray, ads);
    } catch (error) {
      logError(`Error determining targeting keys: ${error}`);
    }
    return targetingData;
  }

  // Private methods
  #setOverrides(config) {
    this.#overrides.storageTTL = config?.storage?.ttl;
    this.#overrides.storageKey = config?.storage?.key;
    this.#overrides.endpointOrigin = config?.endpoint?.origin;
  }

  /**
   * Validates if the provided config is valid.
   * @param {Object} config - Configuration object.
   * @returns {boolean} - True if config is valid, false otherwise.
   */
  #isValidConfig(config) {
    // Basic validation logic
    return typeof config === "object" && config?.publisherId;
  }

  /**
   * Checks if the user has provided the required consent.
   * @param {Object} userConsent - User consent object.
   * @returns {boolean} - True if the user consent is valid, false otherwise.
   */
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
          throw new Error("Data envelope is missing 'data' property.");
        }
        return dataEnvelope.data;
      } catch (error) {
        logError(`Corrupted data in local storage: ${error}`);
        return null;
      }
    } else {
      logError("Local storage is not available or not enabled.");
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
      this.#loadAdLibraries(data.ads);
    } else {
      logError("Local storage is not available or not enabled.");
    }
  }

  /**
   * Checks if the provided data is stale.
   * @param {Object} data - The data to check.
   * @returns {boolean} - True if the data is stale, false otherwise.
   */
  #dataIsStale(storedData) {
    const currentTime = Date.now();
    const dataTime = storedData.createdAt || 0;
    const staleThreshold = STORAGE_TTL;
    return currentTime - dataTime >= staleThreshold;
  }

  #getEndpointUrl(userConsent) {
    const endpoint_origin =
      this.#overrides.endpointOrigin || PUB_ENDPOINT_ORIGIN;
    const parameterMap = {
      gdpr_consent: userConsent?.gdpr?.consentString ?? "",
      gdpr: userConsent?.gdpr?.gdprApplies ? "1" : "0",
      us_privacy: userConsent?.uspConsent ?? "",
      gpp: userConsent?.gpp?.gppString ?? "",
      gpp_sid:
        userConsent.gpp && Array.isArray(userConsent.gpp.applicableSections)
          ? userConsent.gpp.applicableSections.join(",")
          : "",
    };
    const querystring = new URLSearchParams(parameterMap).toString();
    const values = {
      publisherId: this.#publisherId,
      consentParams: querystring,
    };
    const path = PUB_ENDPOINT_PATH(values);
    return `${endpoint_origin}${path}`;
  }

  /**
   * Initiates the request to fetch ad rule data from the publisher endpoint.
   */
  #fetchAdRules(userConsent) {
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
      method: "GET",
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
  #handleServerResponse(response, req) {
    let data;
    try {
      data = JSON.parse(response);
    } catch (error) {
      throw `Error parsing response: ${error}`;
    }
    this.#writeToStorage(this.#overrides?.storageKey || this.STORAGE_KEY, data);
    this.#loadAdLibraries(data.ads || []);
  }

  #handleServerError(error, req) {
    logError(`Publisher endpoint response error: ${error}`);
  }

  #loadAdLibraries(ads) {
    ads.forEach((ad) => {
      if (ad?.engine?.url) {
        loadExternalScript(ad.engine.url, MODULE_TYPE_RTD, MODULE_NAME, () => {
          // noop
        });
      }
    });
  }
}

export const nodalsAiRtdSubmodule = new NodalsAiRtdProvider();

submodule("realTimeData", nodalsAiRtdSubmodule);
