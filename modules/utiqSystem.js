/**
 * This module adds Utiq provided by Utiq SA/NV to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/utiqSystem
 * @requires module:modules/userId
 */
import { logInfo } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';

const MODULE_NAME = 'utiq';
const LOG_PREFIX = 'Utiq module';
let mnoDomain = '';

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_UID,
  moduleName: MODULE_NAME,
});

/**
 * Handle an event for an iframe.
 * Takes the body.url parameter from event and returns the string domain.
 * i.e.: "fc.vodafone.de"
 * @param event
 */
function messageHandler(event) {
  try {
    if (event && event.data && typeof event.data === 'string') {
      const msg = JSON.parse(event.data);
      if (msg.msgType === 'MNOSELECTOR' && msg.body && msg.body.url) {
        let URL = msg.body.url.split('//');
        let domainURL = URL[1].split('/');
        mnoDomain = domainURL[0];
        logInfo(`${LOG_PREFIX}: Message handler set domain to ${mnoDomain}`);
      }
    }
  } catch (e) {
    logInfo(
      `${LOG_PREFIX}: Unsupported message caught. Origin: ${event.origin}, data: ${event.data}.`
    );
  }
}

// Set a listener to handle the iframe response message.
window.addEventListener('message', messageHandler, false);

/**
 * Get the "atid" from html5 local storage to make it available to the UserId module.
 * @param config
 * @returns {{utiq: (*|string)}}
 */
function getUtiqFromStorage() {
  // Get the domain either from localStorage or global
  let domain =
    JSON.parse(storage.getDataFromLocalStorage('fcIdConnectDomain')) ||
    mnoDomain;
  logInfo(`${LOG_PREFIX}: Local storage domain: ${domain}`);

  if (!domain) {
    logInfo(`${LOG_PREFIX}: Local storage domain not found, returning null`);
    return {
      utiq: null,
    };
  }

  let fcIdConnectObject;
  let fcIdConnectData = JSON.parse(
    storage.getDataFromLocalStorage('fcIdConnectData')
  );
  logInfo(
    `${LOG_PREFIX}: Local storage fcIdConnectData: ${JSON.stringify(
      fcIdConnectData
    )}`
  );

  if (
    fcIdConnectData &&
    fcIdConnectData.connectId &&
    Array.isArray(fcIdConnectData.connectId.idGraph) &&
    fcIdConnectData.connectId.idGraph.length > 0
  ) {
    fcIdConnectObject = fcIdConnectData.connectId.idGraph.find((item) => {
      return item.domain === domain;
    });
  }
  logInfo(
    `${LOG_PREFIX}: Local storage fcIdConnectObject for domain: ${JSON.stringify(
      fcIdConnectObject
    )}`
  );

  return {
    utiq:
      fcIdConnectObject && fcIdConnectObject.atid
        ? fcIdConnectObject.atid
        : null,
  };
}

/** @type {Submodule} */
export const utiqSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * Decodes the stored id value for passing to bid requests.
   * @function
   * @returns {{utiq: string} | null}
   */
  decode(bidId) {
    logInfo(`${LOG_PREFIX}: Decoded ID value ${JSON.stringify(bidId)}`);
    return bidId.utiq ? bidId : null;
  },
  /**
   * Get the id from helper function and initiate a new user sync.
   * @param config
   * @returns {{callback: result}|{id: {utiq: string}}}
   */
  getId: function (config) {
    const data = getUtiqFromStorage();
    if (data.utiq) {
      logInfo(`${LOG_PREFIX}: Local storage ID value ${JSON.stringify(data)}`);
      return { id: { utiq: data.utiq } };
    } else {
      if (!config) {
        config = {};
      }
      if (!config.params) {
        config.params = {};
      }
      if (
        typeof config.params.maxDelayTime === 'undefined' ||
        config.params.maxDelayTime === null
      ) {
        config.params.maxDelayTime = 1000;
      }
      // Current delay and delay step in milliseconds
      let currentDelay = 0;
      const delayStep = 50;
      const result = (callback) => {
        const data = getUtiqFromStorage();
        if (!data.utiq) {
          if (currentDelay > config.params.maxDelayTime) {
            logInfo(
              `${LOG_PREFIX}: No utiq value set after ${config.params.maxDelayTime} max allowed delay time`
            );
            callback(null);
          } else {
            currentDelay += delayStep;
            setTimeout(() => {
              result(callback);
            }, delayStep);
          }
        } else {
          const dataToReturn = { utiq: data.utiq };
          logInfo(
            `${LOG_PREFIX}: Returning ID value data of ${JSON.stringify(
              dataToReturn
            )}`
          );
          callback(dataToReturn);
        }
      };
      return { callback: result };
    }
  },
};

submodule('userId', utiqSubmodule);
