/**
 * This module adds TrustPid provided by Vodafone Sales and Services Limited to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/trustpidSystem
 * @requires module:modules/userId
 */
import { logInfo } from '../src/utils.js';
import { submodule } from '../src/hook.js';
import { getStorageManager } from '../src/storageManager.js';

const MODULE_NAME = 'trustpid';
const LOG_PREFIX = 'Trustpid module'
let mnoAcronym = '';
let mnoDomain = '';

export const storage = getStorageManager({gvlid: null, moduleName: MODULE_NAME});

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
        getDomainAcronym(mnoDomain);
      }
    }
  } catch (e) {
    logInfo(`${LOG_PREFIX}: Unsupported message caught. Origin: ${event.origin}, data: ${event.data}.`);
  }
}

/**
 * Properly sets the trustpid acronym depending on the domain value.
 * @param domain
 */
function getDomainAcronym(domain) {
  const prefix = '-';
  const acronym = window.FC_CONF?.TELCO_ACRONYM?.[domain];
  if (!acronym) {
    logInfo(`${LOG_PREFIX}: No acronym found for domain: ${domain}`);
    return;
  }
  mnoAcronym = prefix + acronym;
}

// Set a listener to handle the iframe response message.
window.addEventListener('message', messageHandler, false);

/**
 * Get the "umid" from html5 local storage to make it available to the UserId module.
 * @param config
 * @returns {{trustpid: (*|string), acr: (string)}}
 */
function getTrustpidFromStorage() {
  // Get the domain either from localStorage or global
  let domain = JSON.parse(storage.getDataFromLocalStorage('fcIdConnectDomain')) || mnoDomain;
  logInfo(`${LOG_PREFIX}: Local storage domain: ${domain}`);

  if (!domain) {
    logInfo(`${LOG_PREFIX}: Local storage domain not found, returning null`);
    return {
      trustpid: null,
      acr: null,
    };
  }

  // Get the acronym from global
  let acronym = mnoAcronym;
  // if acronym is empty, but "domain" is available, get the acronym from domain
  if (!acronym) {
    getDomainAcronym(domain);
    acronym = mnoAcronym;
  }

  logInfo(`${LOG_PREFIX}: Domain acronym found: ${acronym}`);

  // Domain is correct in both local storage and idGraph, but no acronym is existing for the domain
  if (domain && !acronym) {
    return {
      trustpid: null,
      acr: null
    }
  }

  let fcIdConnectObject;
  let fcIdConnectData = JSON.parse(storage.getDataFromLocalStorage('fcIdConnectData'));
  logInfo(`${LOG_PREFIX}: Local storage fcIdConnectData: ${JSON.stringify(fcIdConnectData)}`);

  if (fcIdConnectData &&
    fcIdConnectData.connectId &&
    Array.isArray(fcIdConnectData.connectId.idGraph) &&
    fcIdConnectData.connectId.idGraph.length > 0) {
    fcIdConnectObject = fcIdConnectData.connectId.idGraph.find(item => {
      return item.domain === domain;
    });
  }
  logInfo(`${LOG_PREFIX}: Local storage fcIdConnectObject for domain: ${JSON.stringify(fcIdConnectObject)}`);

  return {
    trustpid: (fcIdConnectObject && fcIdConnectObject.umid)
      ? fcIdConnectObject.umid
      : null,
    acr: acronym,
  };
}

/** @type {Submodule} */
export const trustpidSubmodule = {
  /**
   * Used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * Decodes the stored id value for passing to bid requests.
   * @function
   * @returns {{trustpid: string} | null}
   */
  decode(bidId) {
    logInfo(`${LOG_PREFIX}: Decoded ID value ${JSON.stringify(bidId)}`);
    return bidId.trustpid ? bidId : null;
  },
  /**
   * Get the id from helper function and initiate a new user sync.
   * @param config
   * @returns {{callback: result}|{id: {trustpid: string}}}
   */
  getId: function(config) {
    const data = getTrustpidFromStorage();
    if (data.trustpid) {
      logInfo(`${LOG_PREFIX}: Local storage ID value ${JSON.stringify(data)}`);
      return {id: {trustpid: data.trustpid + data.acr}};
    } else {
      if (!config) {
        config = {};
      }
      if (!config.params) {
        config.params = {};
      }
      if (typeof config.params.maxDelayTime === 'undefined' || config.params.maxDelayTime === null) {
        config.params.maxDelayTime = 1000;
      }
      // Current delay and delay step in milliseconds
      let currentDelay = 0;
      const delayStep = 50;
      const result = (callback) => {
        const data = getTrustpidFromStorage();
        if (!data.trustpid) {
          if (currentDelay > config.params.maxDelayTime) {
            logInfo(`${LOG_PREFIX}: No trustpid value set after ${config.params.maxDelayTime} max allowed delay time`);
            callback(null);
          } else {
            currentDelay += delayStep;
            setTimeout(() => {
              result(callback);
            }, delayStep);
          }
        } else {
          const dataToReturn = { trustpid: data.trustpid + data.acr };
          logInfo(`${LOG_PREFIX}: Returning ID value data of ${JSON.stringify(dataToReturn)}`);
          callback(dataToReturn);
        }
      };
      return { callback: result };
    }
  },
};

submodule('userId', trustpidSubmodule);
