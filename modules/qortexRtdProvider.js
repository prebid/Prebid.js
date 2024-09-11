import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logWarn, mergeDeep, logMessage, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';

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
    if (!config?.params?.disableBidEnrichment) {
      logMessage('Requesting Qortex group configuration')
      getGroupConfig()
        .then(groupConfig => {
          logMessage(['Recieved response for qortex group config', groupConfig])
          if (groupConfig?.active === true && groupConfig?.prebidBidEnrichment === true) {
            setGroupConfigData(groupConfig);
            initializeBidEnrichment();
          } else {
            logWarn('Group config is not configured for qortex bid enrichment')
            setGroupConfigData(groupConfig);
          }
        })
        .catch((e) => {
          const errorStatus = e.message;
          logWarn('Returned error status code: ' + errorStatus);
          if (errorStatus == 404) {
            logWarn('No Group Config found');
          }
        });
    } else {
      logWarn('Bid Enrichment Function has been disabled in module configuration')
    }
    if (config?.params?.tagConfig) {
      loadScriptTag(config)
    }
    return true;
  }
}

/**
 * Processess prebid request and attempts to add context to ort2b fragments
 * @param {Object} reqBidsConfig Bid request configuration object
 * @param {Function} callback Called on completion
 */
function getBidRequestData (reqBidsConfig, callback) {
  if (reqBidsConfig?.adUnits?.length > 0 && shouldAllowBidEnrichment()) {
    getContext()
      .then(contextData => {
        setContextData(contextData)
        addContextToRequests(reqBidsConfig)
        callback();
      })
      .catch(e => {
        logWarn('Returned error status code: ' + e.message);
        callback();
      });
  } else {
    logWarn('Module function is paused due to configuration \n Module Config: ' + JSON.stringify(reqBidsConfig) + `\n Group Config: ${JSON.stringify(qortexSessionInfo.groupConfig) ?? 'NO GROUP CONFIG'}`)
    callback();
  }
}

/**
 * Processess auction end events for Qortex reporting
 * @param {Object} data Auction end object
 */
function onAuctionEndEvent (data, config, t) {
  if (shouldAllowBidEnrichment()) {
    sendAnalyticsEvent('AUCTION', 'AUCTION_END', attachContextAnalytics(data))
      .then(result => {
        logMessage('Qortex anyalitics event sent')
      })
      .catch(e => logWarn(e?.message))
  }
}

/**
 * determines whether to send a request to context api and does so if necessary
 * @returns {Promise} ortb Content object
 */
export function getContext () {
  if (qortexSessionInfo.currentSiteContext === null) {
    const pageUrlObject = { pageUrl: qortexSessionInfo.indexData?.pageUrl ?? '' }
    logMessage('Requesting new context data');
    return new Promise((resolve, reject) => {
      const callbacks = {
        success(text, data) {
          const responseStatus = data.status;
          let result;
          if (responseStatus === 200) {
            qortexSessionInfo.pageAnalysisData.contextRetrieved = true
            result = JSON.parse(data.response)?.content;
          } else if (responseStatus === 202) {
            qortexSessionInfo.pageAnalysisData.analysisInProgress = true;
            result = null;
          }
          resolve(result);
        },
        error(e, x) {
          const responseStatus = x.status;
          reject(new Error(responseStatus));
        }
      }
      ajax(qortexSessionInfo.contextUrl, callbacks, JSON.stringify(pageUrlObject), {contentType: 'application/json'})
    })
  } else {
    logMessage('Adding Content object from existing context data');
    return new Promise((resolve, reject) => resolve(qortexSessionInfo.currentSiteContext));
  }
}

/**
 * Requests Qortex group configuration using group id
 * @returns {Promise} Qortex group configuration
 */
export function getGroupConfig () {
  return new Promise((resolve, reject) => {
    const callbacks = {
      success(text, data) {
        const result = data.status === 200 ? JSON.parse(data.response) : null;
        resolve(result);
      },
      error(e, x) {
        reject(new Error(x.status));
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
  qortexSessionInfo.indexData = generateIndexData();
  logMessage('Sending page data for context analysis');
  return new Promise((resolve, reject) => {
    const callbacks = {
      success(text, data) {
        const responseStatus = data.status;
        let resultMessage;
        if (responseStatus === 201) {
          qortexSessionInfo.pageAnalysisData.indexRequested = true;
          resultMessage = 'Successfully initiated Qortex page analysis';
        } else {
          resultMessage = 'No index record created at this time'
        }
        resolve(resultMessage);
      },
      error(e, x) {
        reject(new Error(x.status));
      }
    }
    ajax(qortexSessionInfo.pageAnalyisUrl, callbacks, JSON.stringify(qortexSessionInfo.indexData), {contentType: 'application/json'})
  })
}

/**
 * Sends analytics events to Qortex
 * @returns {Promise}
 */
export function sendAnalyticsEvent(eventType, subType, data) {
  if (qortexSessionInfo.analyticsUrl !== null) {
    if (shouldSendAnalytics()) {
      const analtyicsEventObject = generateAnalyticsEventObject(eventType, subType, data)
      logMessage('Sending qortex analytics event');
      return new Promise((resolve, reject) => {
        const callbacks = {
          success() {
            resolve();
          },
          error(error) {
            reject(new Error(error));
          }
        }
        ajax(qortexSessionInfo.analyticsUrl, callbacks, JSON.stringify(analtyicsEventObject), {contentType: 'application/json'})
      })
    } else {
      return new Promise((resolve, reject) => reject(new Error('Current request did not meet analytics percentage threshold, cancelling sending event')));
    }
  } else {
    return new Promise((resolve, reject) => reject(new Error('Analytics host not initialized')));
  }
}

/**
 * Creates analytics object for Qortex
 * @returns {Object} analytics object
 */
export function generateAnalyticsEventObject(eventType, subType, data) {
  return {
    sessionId: qortexSessionInfo.sessionId,
    groupId: qortexSessionInfo.groupId,
    eventType: eventType,
    subType: subType,
    eventOriginSource: 'RTD',
    data: data
  }
}

/**
 * Creates page index data for Qortex analysis
 * @param qortexUrlBase api url from config or default
 * @returns {string} Qortex analytics host url
 */
export function generateAnalyticsHostUrl(qortexUrlBase) {
  if (qortexUrlBase === DEFAULT_API_URL) {
    return 'https://events.qortex.ai/api/v1/player-event';
  } else if (qortexUrlBase.includes('stg-demand')) {
    return 'https://stg-events.qortex.ai/api/v1/player-event';
  } else {
    return 'https://dev-events.qortex.ai/api/v1/player-event';
  }
}

/**
 * Updates bidder configs with the response from Qortex context services
 * @param {Object} reqBidsConfig Bid request configuration object
 * @param {string[]} bidders Bidders specified in module's configuration
 */
export function addContextToRequests (reqBidsConfig) {
  if (qortexSessionInfo.currentSiteContext === null) {
    logWarn('No context data received at this time');
  } else {
    const fragment = { site: {content: qortexSessionInfo.currentSiteContext} }
    if (qortexSessionInfo.bidderArray?.length > 0) {
      qortexSessionInfo.bidderArray.forEach(bidder => mergeDeep(reqBidsConfig.ortb2Fragments.bidder, {[bidder]: fragment}))
      saveContextAdded(reqBidsConfig, qortexSessionInfo.bidderArray);
    } else if (!qortexSessionInfo.bidderArray) {
      mergeDeep(reqBidsConfig.ortb2Fragments.global, fragment);
      saveContextAdded(reqBidsConfig);
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
          events.emit(EVENTS.BILLABLE_EVENT, billableEvent);
          break;
        }
      default:
        logWarn(`Recieved invalid billable event: ${e.detail?.type}`)
    }
  })

  loadExternalScript(src, code, undefined, undefined, attr);
}

export function initializeBidEnrichment() {
  if (shouldAllowBidEnrichment()) {
    getContext()
      .then(contextData => {
        if (qortexSessionInfo.pageAnalysisData.contextRetrieved) {
          logMessage('Contextual record recieved from Qortex API')
          setContextData(contextData)
        } else {
          logWarn('Contexual record is not yet complete at this time')
        }
      })
      .catch(e => {
        const errorStatus = e.message;
        logWarn('Returned error status code: ' + errorStatus);
        if (errorStatus == 404) {
          initiatePageAnalysis()
            .then(message => {
              logMessage(message)
            })
            .catch(e => {
              logWarn(e);
            })
        }
      });
  }
}

/**
 * Helper function to set initial values when they are obtained by init
 * @param {Object} config module config obtained during init
 */
export function initializeModuleData(config) {
  const {apiUrl, groupId, bidders, disableBidEnrichment} = config.params;
  const qortexUrlBase = apiUrl || DEFAULT_API_URL;
  const windowUrl = window.top.location.host;
  qortexSessionInfo.bidEnrichmentDisabled = disableBidEnrichment !== null ? disableBidEnrichment : false;
  qortexSessionInfo.bidderArray = bidders;
  qortexSessionInfo.impressionIds = new Set();
  qortexSessionInfo.currentSiteContext = null;
  qortexSessionInfo.pageAnalysisData = {
    analysisInProgress: false,
    indexRequested: false,
    contextRetrieved: false,
    contextAdded: {}
  };
  qortexSessionInfo.sessionId = generateSessionId();
  qortexSessionInfo.groupId = groupId;
  qortexSessionInfo.groupConfigUrl = `${qortexUrlBase}/api/v1/prebid/group/configs/${groupId}/${windowUrl}`
  qortexSessionInfo.contextUrl = `${qortexUrlBase}/api/v1/prebid/${groupId}/page/lookup`
  qortexSessionInfo.pageAnalyisUrl = `${qortexUrlBase}/api/v1/prebid/${groupId}/page/index`;
  qortexSessionInfo.analyticsUrl = generateAnalyticsHostUrl(qortexUrlBase);
  return qortexSessionInfo;
}

export function saveContextAdded(reqBids, bidders = null) {
  const id = reqBids.auctionId;
  const contextBidders = bidders ?? Array.from(new Set(reqBids.adUnits.flatMap(adunit => adunit.bids.map(bid => bid.bidder))))
  qortexSessionInfo.pageAnalysisData.contextAdded[id] = contextBidders;
}

export function setContextData(value) {
  qortexSessionInfo.currentSiteContext = value
}

export function setGroupConfigData(value) {
  qortexSessionInfo.groupConfig = value
}

/**
 * Creates page index data for Qortex analysis
 * @returns {Object} page index object
 */
function generateIndexData () {
  return {
    pageUrl: document.location.href,
    title: document.title,
    text: Array.from(document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,p')).reduce((acc, elm)=>acc.concat(elm.textContent.trim()), []).join(' ').replaceAll(/\r?\n\s{2,}/gi, ' ').substr(0,5000),
    meta: Array.from(document.getElementsByTagName('meta')).reduce((acc, curr) => { const attr = curr.attributes; if (attr.length > 1) { acc[curr.attributes[0].value] = curr.attributes[1].value } return acc }, {}),
    videos: Array.from(document.getElementsByTagName('video')).reduce((acc, curr) => { const src = curr?.src; if (src != '') { acc.push(src) } return acc }, [])
  }
}

function generateSessionId() {
  const randomInt = window.crypto.getRandomValues(new Uint32Array(1));
  const currentDateTime = Math.floor(Date.now() / 1000);
  return 'QX' + randomInt.toString() + 'X' + currentDateTime.toString()
}

function attachContextAnalytics (data) {
  let qxData = {};
  let qxDataAdded = false;
  if (qortexSessionInfo?.pageAnalysisData?.contextAdded[data.auctionId]) {
    qxData = qortexSessionInfo.currentSiteContext;
    qxDataAdded = true;
  }
  data.qortexData = qxData;
  data.qortexDataAdded = qxDataAdded;
  return data;
}

function shouldSendAnalytics() {
  const analyticsPercentage = qortexSessionInfo.groupConfig?.prebidReportingPercentage ?? 0;
  const randomInt = Math.random().toFixed(5) * 100;
  return analyticsPercentage > randomInt;
}

function shouldAllowBidEnrichment() {
  if (qortexSessionInfo.bidEnrichmentDisabled) {
    logWarn('Bid enrichment disabled at prebid config')
    return false;
  } else if (!qortexSessionInfo.groupConfig?.prebidBidEnrichment) {
    logWarn('Bid enrichment disabled at group config')
    return false;
  }
  return true
}

export const qortexSubmodule = {
  name: 'qortex',
  init,
  getBidRequestData,
  onAuctionEndEvent
}

submodule('realTimeData', qortexSubmodule);
