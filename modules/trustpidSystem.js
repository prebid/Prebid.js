/**
 * This module adds trustpid to the User ID module
 * The {@link module:modules/userId} module is required
 * @module modules/trustpidSystem
 * @requires module:modules/userId
 */
import {submodule} from '../src/hook.js'

const MODULE_NAME = 'trustpid'

let mnoAcronym = ''
let mnoDomain = ''

/**
 * Handle an event for an iframe.
 * Takes the body.url parameter from event and returns the string domain.
 * i.e.: "fc.vodafone.de"
 * @param event
 */
function messageHandler(event) {
  let msg
  try {
    msg = JSON.parse(event.data)
  } catch (e) {
    debugModeConsoleLog('error', e)
    return
  }
  if (msg.msgType === 'MNOSELECTOR') {
    if (typeof msg.body.url !== 'undefined' && msg.body.url) {
      let URL = msg.body.url.split('//')
      let domainURL = URL[1].split('/')
      mnoDomain = domainURL[0]
      debugModeConsoleLog('info', `messageHandler - set domain as: ${mnoDomain}`)
      const prefix = '-'
      switch (mnoDomain) {
        case 'tmi.mno.link':
          mnoAcronym = prefix + 'ndye'
          break
        case 'tmi.vodafone.de':
          mnoAcronym = prefix + 'pqnx'
          break
        case 'tmi.telekom.de':
          mnoAcronym = prefix + 'avgw'
          break
        case 'tmi.tmid.es':
          mnoAcronym = prefix + 'kjws'
          break
        case 'uat.mno.link':
          mnoAcronym = prefix + 'xxxx'
          break
        case 'es.tmiservice.orange.com':
          mnoAcronym = prefix + 'aplw'
          break
        default:
          return 'none'
      }
    }
  }
}

// Set a listener to handle the iframe response message.
window.addEventListener('message', messageHandler, false)

/**
 * Get the "umid" from html5 local storage to make it available for Trustpid module.
 * @param config
 * @returns {{trustpid: (*|string), acr: (string)}}
 */
function getTrustpidFromStorage(config) {
  const fcIdConnectDomain = JSON.parse(window.localStorage.getItem('fcIdConnectDomain'))
  let domain = fcIdConnectDomain || mnoDomain
  if (!domain &&
    typeof config.params !== 'undefined' &&
    typeof config.params.mnoDomainFallback !== 'undefined') {
    domain = config.params.mnoDomainFallback
  }
  let acronym = mnoAcronym;
  if (!acronym &&
    typeof config.params !== 'undefined' &&
    typeof config.params.acrFallback !== 'undefined') {
    acronym = config.params.acrFallback
  }
  if (!domain) {
    debugModeConsoleLog('info', 'getTrustpid - no domain')
    return {
      trustpid: undefined,
      acr: acronym,
    }
  }
  let fcIdConnectObject
  let fcIdConnectData = JSON.parse(window.localStorage.getItem('fcIdConnectData'))
  debugModeConsoleLog('info', `getTrustpid - fcIdConnectData result: ${fcIdConnectData}`)
  if (fcIdConnectData &&
    fcIdConnectData.connectId &&
    Array.isArray(fcIdConnectData.connectId.idGraph) &&
    fcIdConnectData.connectId.idGraph.length > 0) {
    fcIdConnectObject = fcIdConnectData.connectId.idGraph.find(item => {
      return item.domain === domain
    })
  }
  debugModeConsoleLog('info', `getTrustpid - fcIdConnectData.idGraph match for fcIdConnectDomain result: ${fcIdConnectObject}`)
  return {
    trustpid: (fcIdConnectObject && fcIdConnectObject.umid !== undefined)
      ? fcIdConnectObject.umid
      : undefined,
    acr: acronym,
  }
}

function isDebugMode() {
  return (window.location.href.indexOf('?debug=true') > -1) || window.location.href.indexOf('&debug=true') > -1
}

function debugModeConsoleLog(type = 'info', data) {
  if (isDebugMode()) {
    /* eslint-disable */
    switch (type) {
      case 'info':
        console.info(data)
        break
      case 'error':
        console.error(data)
        break
      default:
        console.log(data)
    }
    /* eslint-enable */
  }
}

/** @type {Submodule} */
export const trustpidSubmodule = {
  /**
   * used to link submodule with config
   * @type {string}
   */
  name: MODULE_NAME,
  /**
   * Decodes the stored id value for passing to bid requests.
   * @function
   * @returns {{trustpid: string} | undefined}
   */
  decode(bidId) {
    debugModeConsoleLog('info', `decode - bidId result: ${JSON.stringify(bidId)}`)
    return bidId.trustpid ? bidId : undefined
  },
  /**
   * Get the id from helper function and initiate a new user sync.
   * @param config
   * @returns {{callback: result}|{id: {trustpid: string}}}
   */
  getId: function (config) {
    const data = getTrustpidFromStorage(config);
    if (typeof data.trustpid !== 'undefined') {
      debugModeConsoleLog('info', `getId - step 1 result: ${JSON.stringify({id: {trustpid: data.trustpid + data.acr}})}`);
      return {id: {trustpid: data.trustpid + data.acr}}
    } else {
      if (!config) {
        config = {};
      }
      if (!config.params) {
        config.params = {};
      }
      if (typeof config.params.maxDelayTime === 'undefined') {
        config.params.maxDelayTime = 1000;
      }
      const step = 50;
      let timeSpend = 0;
      const result = (callback) => {
        const data = getTrustpidFromStorage(config);
        debugModeConsoleLog('info', `getTrustPid - result: ${JSON.stringify(data)}`);
        if (typeof data.trustpid === 'undefined') {
          if (timeSpend > config.params.maxDelayTime) {
            debugModeConsoleLog('info', `getId - step 3 result: undefined`);
            callback(undefined);
          } else {
            timeSpend += step;
            setTimeout(() => {
              result(callback);
            }, step)
          }
        } else {
          debugModeConsoleLog('info', `getId - step 2 result: ${JSON.stringify({trustpid: data.trustpid + data.acr})}`);
          callback(Object.create({trustpid: data.trustpid + data.acr}));
        }
      };
      return {callback: result};
    }
  }
}

submodule('userId', trustpidSubmodule);
