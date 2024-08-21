import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logWarn, mergeDeep, logMessage, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';


const DEFAULT_API_URL = 'https://demand.qortex.ai';

const qortexSessionInfo = {}

/**
 * Init if module configuration is valid
 * @param {Object} config Module configuration
 * @returns {Boolean}
 */
function init (config) {
  if (!config?.params?.groupId?.length > 0) {
    logWarn('Qortex RTD module config does not contain valid groupId parameter. Config params: ' + JSON.stringify(config.params))
    return false;
  } else {
    initializeModuleData(config);
  }
  if (config?.params?.tagConfig) {
    loadScriptTag(config)
  }
  return true;
}

/**
 * Processess prebid request and attempts to add context to ort2b fragments
 * @param {Object} reqBidsConfig Bid request configuration object
 * @param {Function} callback Called on completion
 */
function getBidRequestData (reqBidsConfig, callback) {
  if (reqBidsConfig?.adUnits?.length > 0) {
    getContext()
      .then(contextData => {
        setContextData(contextData)
        addContextToRequests(reqBidsConfig)
        callback();
      })
      .catch((e) => {
        logWarn(e?.message);
        callback();
      });
  } else {
    logWarn('No adunits found on request bids configuration: ' + JSON.stringify(reqBidsConfig))
    callback();
  }
}

/**
 * Processess auction end events for Qortex reporting
 * @param {Object} data Auction end object
 */
function onAuctionEndEvent (data, config, t) {
  sendAnalyticsEvent("AUCTION", "AUCTION_END", data)
    .then(result => logMessage(result))
    .catch(e => logWarn(e?.message))
}

/**
 * determines whether to send a request to context api and does so if necessary
 * @returns {Promise} ortb Content object
 */
export function getContext () {
  if (!qortexSessionInfo.currentSiteContext) {
    logMessage('Requesting new context data');
    return new Promise((resolve, reject) => {
      const callbacks = {
        success(text, data) {
          const result = data.status === 200 ? JSON.parse(data.response)?.content : null;
          resolve(result);
        },
        error(error) {
          reject(new Error(error));
        }
      }
      ajax(qortexSessionInfo.contextUrl, callbacks)
    })
  } else {
    logMessage('Adding Content object from existing context data');
    return new Promise(resolve => resolve(qortexSessionInfo.currentSiteContext));
  }
}

/**
 * Requests Qortex group configuration using group id
 * @returns {Promise} Qortex group configuration
 */
export function getGroupConfig () {
  logMessage('Requesting group config');
  return new Promise((resolve, reject) => {
    const callbacks = {
      success(text, data) {
        const result = data.status === 200 ? JSON.parse(data.response) : null;
        resolve(result);
      },
      error(error) {
        reject(new Error(error));
      }
    }
    ajax(qortexSessionInfo.groupConfigUrl, callbacks)
  })
}

/**
 * Initiates page analysis from Qortex
 * @returns {Promise}
 */
export function initiatePageAnalysis () {
  const indexData = generateIndexData();
  logMessage('Sending page data for context analysis');
    return new Promise((resolve, reject) => {
      const callbacks = {
        success() {
          qortexSessionInfo.pageAnalysisdata.requestSuccessful = true;
          resolve("Successfully initiated Qortex page analysis");
        },
        error(error) {
          qortexSessionInfo.pageAnalysisdata.requestSuccessful = false;
          reject(new Error(error));
        }
      }
      ajax(qortexSessionInfo.pageAnalyisUrl, callbacks, JSON.stringify(indexData), {contentType: 'application/json'})
    })
}

/**
 * Sends analytics events to Qortex
 * @returns {Promise}
 */
export function sendAnalyticsEvent(eventType, subType, data) {
  if(qortexSessionInfo.analyticsUrl !== null) {
    const analtyicsEventObject = generateAnaltyicsEventObject(subType, data)
    logMessage('Sending qortex analytics event');
      return new Promise((resolve, reject) => {
        const callbacks = {
          success() {
            resolve([`Qortex analytics event \n eventType: ${eventType} \n subType: ${subType}`, data]);
          },
          error(error) {
            reject(new Error(error));
          }
        }
        ajax(qortexSessionInfo.analyticsUrl, callbacks, JSON.stringify(analtyicsEventObject), {contentType: 'application/json'})
      })
  } else {
    return new Promise((resolve, reject) => reject(new Error("Analytics host not initialized")));

  }
}

/**
 * Creates analytics object for Qortex
 * @returns {Object} analytics object
 */
export function generateAnaltyicsEventObject(eventType, subType, data) {
  return {
    sessionId: qortexSessionInfo.sessionId,
    groupId: qortexSessionInfo.groupId,
    eventType: eventType,
    subType: subType,
    eventOriginSource: "RTD",
    data: data
  }
}

/**
 * Creates page index data for Qortex analysis
 * @returns {Object} page index object
 */
export function generateIndexData () {
  return {
    url: document.location.href,
    title: document.title,
    text: document.body.innerText.replaceAll(/\r?\n/gi, " "),
    meta: Array.from(document.getElementsByTagName('meta')).reduce((acc, curr) => { const attr = curr.attributes; if(attr.length > 1) {acc[curr.attributes[0].value] = curr.attributes[1].value} return acc}, {}),
    videos: Array.from(document.getElementsByTagName('video')).reduce((acc, curr) => {src = curr.src; if(src != ''){acc.push(src)} return acc}, [])
  }
}

/**
 * Creates page index data for Qortex analysis
 * @param qortexUrlBase api url from config or default
 * @returns {string} Qortex analytics host url
 */
export function generateAnalyticsHostUrl(qortexUrlBase) {
  if (qortexUrlBase === DEFAULT_API_URL) {
    return "https://events.qortex.ai/api/v1/player-event";
  } else if (qortexUrlBase.includes("stg-demand")) {
    return "https://stg-events.qortex.ai/api/v1/player-event";
  } else {
    return "https://dev-events.qortex.ai/api/v1/player-event";
  } 
}

/**
 * Updates bidder configs with the response from Qortex context services
 * @param {Object} reqBidsConfig Bid request configuration object
 * @param {string[]} bidders Bidders specified in module's configuration
 */
export function addContextToRequests (reqBidsConfig) {
  if (qortexSessionInfo.currentSiteContext === null) {
    logWarn('No context data recieved at this time');
  } else {
    const fragment = { site: {content: qortexSessionInfo.currentSiteContext} }
    if (qortexSessionInfo.bidderArray?.length > 0) {
      qortexSessionInfo.bidderArray.forEach(bidder => mergeDeep(reqBidsConfig.ortb2Fragments.bidder, {[bidder]: fragment}))
    } else if (!qortexSessionInfo.bidderArray) {
      mergeDeep(reqBidsConfig.ortb2Fragments.global, fragment);
    } else {
      logWarn('Config contains an empty bidders array, unable to determine which bids to enrich');
    }
  }
}

/**
 * Loads Qortex header tag using data passed from module config object
 * @param {Object} config module config obtained during init
 */
export function loadScriptTag(config) {
  const code = 'qortex';
  const groupId = config.params.groupId;
  const src = 'https://tags.qortex.ai/bootstrapper'
  const attr = {'data-group-id': groupId}
  const tc = config.params.tagConfig

  Object.keys(tc).forEach(p => {
    attr[`data-${p.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`)}`] = tc[p]
  })

  addEventListener('qortex-rtd', (e) => {
    const billableEvent = {
      vendor: code,
      billingId: generateUUID(),
      type: e?.detail?.type,
      accountId: groupId
    }
    switch (e?.detail?.type) {
      case 'qx-impression':
        const {uid} = e.detail;
        if (!uid || qortexSessionInfo.impressionIds.has(uid)) {
          logWarn(`Recieved invalid billable event due to ${!uid ? 'missing' : 'duplicate'} uid: qx-impression`)
          return;
        } else {
          logMessage('Recieved billable event: qx-impression')
          qortexSessionInfo.impressionIds.add(uid)
          billableEvent.transactionId = e.detail.uid;
          events.emit(CONSTANTS.EVENTS.BILLABLE_EVENT, billableEvent);
          break;
        }
      default:
        logWarn(`Recieved invalid billable event: ${e.detail?.type}`)
    }
  })

  loadExternalScript(src, code, undefined, undefined, attr);
}

/**
 * Helper function to set initial values when they are obtained by init
 * @param {Object} config module config obtained during init
 */
export function initializeModuleData(config) {
  initializeQortexSessionData(config);
  getGroupConfig()
      .then(groupConfig => {
        logMessage(["Recieved response for qortex group config", groupConfig])
        if (!groupConfig?.active || !groupConfig?.prebidBidEnrichment){
          logMessage("Group config is not configured for qortex RTD module")
          return false
        } else {
          setGroupConfigData(groupConfig)
        }
      })
      .catch((e) => {
        logWarn(e?.message);
      });
  initiatePageAnalysis()
    .then(successMessage => {
      logMessage(successMessage)
    })
    .catch((e) => {
      logWarn(e?.message);
    });
}

/**
 * Populates Qortex session data objet
 */
export function initializeQortexSessionData(config) {
  const {apiUrl, groupId, bidders} = config.params;
  const qortexUrlBase = apiUrl || DEFAULT_API_URL;
  const windowUrl = window.top.location.host;
  qortexSessionInfo.bidderArray = bidders;
  qortexSessionInfo.impressionIds = new Set();
  qortexSessionInfo.currentSiteContext = null;
  qortexSessionInfo.pageAnalysisdata = {
    requestSuccessful: null,
    analysisGenerated: false,
    analysisData: null
  };
  qortexSessionInfo.sessionId = generateSessionId();
  qortexSessionInfo.groupId = groupId;
  qortexSessionInfo.groupConfigUrl = `${qortexUrlBase}/api/v1/prebid/group/configs/${groupId}/${windowUrl}`
  qortexSessionInfo.contextUrl = `${qortexUrlBase}/api/v1/prebid/${groupId}/page/lookup`
  qortexSessionInfo.pageAnalyisUrl = `${qortexUrlBase}/api/v1/prebid/${groupId}/page/index`;
  qortexSessionInfo.analyticsUrl = generateAnalyticsHostUrl(qortexUrlBase);
}

/**
 * Creates unique session id for Qortex
 * @returns {string} session id string
 */
export function generateSessionId() {
  const randomInt = Math.floor(Math.random() * 2147483647);
  const currentDateTime = Math.floor(Date.now() / 1000);
  return "QX" + randomInt.toString() + "X" + currentDateTime.toString()
}

export function setContextData(value) {
  qortexSessionInfo.currentSiteContext = value
}

export function setGroupConfigData(value) {
  qortexSessionInfo.groupConfig = value
}

export const qortexSubmodule = {
  name: 'qortex',
  init,
  getBidRequestData,
  onAuctionEndEvent
}

submodule('realTimeData', qortexSubmodule);