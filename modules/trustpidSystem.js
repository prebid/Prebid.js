/**
 * This module adds TrustPid provided by Vodafone Sales and Services Limited to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/trustpidSystem
 * @requires module:modules/userId
 */
import {submodule} from '../src/hook.js';

const MODULE_NAME = 'trustpid';
let mnoAcronym = '';
let mnoDomain = '';

/**
 * Handle an event for an iframe.
 * Takes the body.url parameter from event and returns the string domain.
 * i.e.: "fc.vodafone.de"
 * @param event
 */
function messageHandler(event) {
  let msg;
  try {
    msg = JSON.parse(event.data);
    if (msg.msgType === 'MNOSELECTOR' && msg.body && msg.body.url) {
      let URL = msg.body.url.split('//');
      let domainURL = URL[1].split('/');
      mnoDomain = domainURL[0];
      debugModeConsoleLog('info', `messageHandler set domain: ${mnoDomain}`);
      getDomainAcronym(mnoDomain);
    }
  } catch (e) {

  }
}

/**
 * Properly sets the trustpid acronym depending on the domain value.
 * @param domain
 */
function getDomainAcronym(domain) {
  let acronym = '';
  const prefix = '-';
  switch (domain) {
    case 'tmi.mno.link':
      acronym = 'ndye';
      break;
    case 'tmi.vodafone.de':
      acronym = 'pqnx';
      break;
    case 'tmi.telekom.de':
      acronym = 'avgw';
      break;
    case 'tmi.tmid.es':
      acronym = 'kjws';
      break;
    case 'uat.mno.link':
      acronym = 'xxxx';
      break;
    case 'es.tmiservice.orange.com':
      acronym = 'aplw';
      break;
    default:
      return 'none';
  }
  return mnoAcronym = prefix + acronym;
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
  let domain = JSON.parse(window.localStorage.getItem('fcIdConnectDomain')) || mnoDomain;
  debugModeConsoleLog('info', `getTrustpid domain: ${domain}`);

  if (!domain) {
    debugModeConsoleLog('info', `getTrustpid domain: no domain`);
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

  // Domain is correct in both local storage and idGraph, but no acronym is existing for the domain
  if (domain && !acronym) {
    return {
      trustpid: null,
      acr: null
    }
  }

  let fcIdConnectObject;
  let fcIdConnectData = JSON.parse(window.localStorage.getItem('fcIdConnectData'));
  debugModeConsoleLog('info', `getTrustpid fcIdConnectData:
  ${JSON.stringify(fcIdConnectData)}`);

  if (fcIdConnectData &&
    fcIdConnectData.connectId &&
    Array.isArray(fcIdConnectData.connectId.idGraph) &&
    fcIdConnectData.connectId.idGraph.length > 0) {
    fcIdConnectObject = fcIdConnectData.connectId.idGraph.find(item => {
      return item.domain === domain;
    });
  }
  debugModeConsoleLog('info', `getTrustpid fcIdConnectObject:
  ${JSON.stringify(fcIdConnectObject)}`);

  return {
    trustpid: (fcIdConnectObject && fcIdConnectObject.umid)
      ? fcIdConnectObject.umid
      : null,
    acr: acronym,
  };
}

/**
 * Returns whether we are in Prebid debug mode or not.
 * @returns {boolean}
 */
function isDebugMode() {
  return (window.location.href.indexOf('?pbjs_debug=true') > -1) || (window.location.href.indexOf('&pbjs_debug=true') > -1);
}

/**
 * Show debugging messages in browser developer console.
 * @param type
 * @param data
 */
function debugModeConsoleLog(type = 'info', data) {
  if (isDebugMode()) {
    switch (type) {
      case 'info':
        // eslint-disable-next-line no-console
        console.info(data);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(data);
        break;
      default:
        // eslint-disable-next-line no-console
        console.log(data);
    }
  }
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
    debugModeConsoleLog('info', `decode ${JSON.stringify(bidId)}`);
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
      debugModeConsoleLog('info', `getId result 1:
      ${JSON.stringify(data)}`);
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
      let timeSpend = 0;
      const step = 50;
      const result = (callback) => {
        const data = getTrustpidFromStorage();
        if (!data.trustpid) {
          if (timeSpend > config.params.maxDelayTime) {
            debugModeConsoleLog('info', `getId result 3: null`);
            callback(null);
          } else {
            timeSpend += step;
            setTimeout(() => {
              result(callback);
            }, step);
          }
        } else {
          debugModeConsoleLog('info', `getId result 2:`,
            JSON.stringify({trustpid: data.trustpid + data.acr}));
          const dataToReturn = {trustpid: data.trustpid + data.acr};
          callback(dataToReturn);
        }
      };
      return {callback: result};
    }
  },
};

submodule('userId', trustpidSubmodule);
