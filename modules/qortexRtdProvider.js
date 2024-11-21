import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logWarn, mergeDeep, logMessage, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

const DEFAULT_API_URL = 'https://demand.qortex.ai';
const LOOKUP_RATE_LIMIT = 5000;
const qortexSessionInfo = {};

let lookupRateLimitTimeout;
let lookupAttemptDelay;

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
    if (config?.params?.enableBidEnrichment) {
      logMessage('Requesting Qortex group configuration')
      getGroupConfig()
        .then(groupConfig => {
          logMessage(['Received response for qortex group config', groupConfig])
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
        logMessage('Qortex analytics event sent')
      })
      .catch(e => logWarn(e.message))
  }
}

/**
 * determines whether to send a request to context api and does so if necessary
 * @returns {Promise} ortb Content object
 */
export function getContext () {
  if (qortexSessionInfo.currentSiteContext) {
    logMessage('Adding Content object from existing context data');
    return new Promise((resolve, reject) => resolve(qortexSessionInfo.currentSiteContext));
  } else if (lookupRateLimitTimeout !== null) {
    logMessage(`Content lookup attempted during rate limit waiting period of ${LOOKUP_RATE_LIMIT}ms.`);
    lookupAttemptDelay = true;
    return new Promise((resolve, reject) => reject(new Error(429)));
  } else {
    lookupRateLimitTimeout = setTimeout(resetRateLimitTimeout, LOOKUP_RATE_LIMIT);
    const pageUrlObject = { pageUrl: document.location.href ?? '' }
    logMessage('Requesting new context data');
    return new Promise((resolve, reject) => {
      const callbacks = {
        success(text, data) {
          const responseStatus = data.status;
          let result = null;
          if (responseStatus === 200) {
            qortexSessionInfo.pageAnalysisData.contextRetrieved = true
            result = JSON.parse(data.response)?.content;
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
  }
}

/**
 * Resets rate limit timeout for preventing overactive page content lookup
 * Will re-trigger requestContextData if page lookups had been previously delayed
 */
export function resetRateLimitTimeout() {
  lookupRateLimitTimeout = null;
  if (lookupAttemptDelay) {
    lookupAttemptDelay = false;
    if (!qortexSessionInfo.currentSiteContext) {
      requestContextData();
    }
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
 * Sends analytics events to Qortex
 * @returns {Promise}
 */
export function sendAnalyticsEvent(eventType, subType, data) {
  if (shouldSendAnalytics(data)) {
    const analtyicsEventObject = generateAnalyticsEventObject(eventType, subType, data)
    logMessage('Sending qortex analytics event');
    return new Promise((resolve, reject) => {
      const callbacks = {
        success() {
          resolve();
        },
        error(e, x) {
          reject(new Error('Returned error status code: ' + x.status));
        }
      }
      ajax(qortexSessionInfo.analyticsUrl, callbacks, JSON.stringify(analtyicsEventObject), {contentType: 'application/json'})
    })
  } else {
    return new Promise((resolve, reject) => reject(new Error('Current request did not meet analytics percentage threshold, cancelling sending event')));
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
 * Determines API host for Qortex
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
 */
export function addContextToRequests (reqBidsConfig) {
  if (qortexSessionInfo.currentSiteContext === null) {
    logWarn('No context data received at this time');
  } else {
    if (checkPercentageOutcome(qortexSessionInfo.groupConfig?.prebidBidEnrichmentPercentage)) {
      const fragment = { site: {content: qortexSessionInfo.currentSiteContext} }
      if (qortexSessionInfo.bidderArray?.length > 0) {
        qortexSessionInfo.bidderArray.forEach(bidder => mergeDeep(reqBidsConfig.ortb2Fragments.bidder, {[bidder]: fragment}))
        saveContextAdded(reqBidsConfig);
      } else if (!qortexSessionInfo.bidderArray) {
        mergeDeep(reqBidsConfig.ortb2Fragments.global, fragment);
        saveContextAdded(reqBidsConfig);
      } else {
        logWarn('Config contains an empty bidders array, unable to determine which bids to enrich');
      }
    } else {
      saveContextAdded(reqBidsConfig, true);
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
          logWarn(`Received invalid billable event due to ${!uid ? 'missing' : 'duplicate'} uid: qx-impression`)
          return;
        } else {
          logMessage('Received billable event: qx-impression')
          qortexSessionInfo.impressionIds.add(uid)
          billableEvent.transactionId = e.detail.uid;
          events.emit(EVENTS.BILLABLE_EVENT, billableEvent);
          break;
        }
      default:
        logWarn(`Received invalid billable event: ${e.detail?.type}`)
    }
  })

  loadExternalScript(src, MODULE_TYPE_RTD, code, undefined, undefined, attr);
}

/**
 * Request contextual data about page (after checking for allow) and begin listening for postMessages from publisher
 */
export function initializeBidEnrichment() {
  if (shouldAllowBidEnrichment()) {
    requestContextData()
  }
  addEventListener('message', windowPostMessageReceived);
}

/**
 * Call Qortex api for available contextual information about current environment
 */
export function requestContextData() {
  getContext()
    .then(contextData => {
      if (qortexSessionInfo.pageAnalysisData.contextRetrieved) {
        logMessage('Contextual record Received from Qortex API')
        setContextData(contextData)
      } else {
        logWarn('Contexual record is not yet complete at this time')
      }
    })
    .catch((e) => {
      logWarn('Returned error status code: ' + e.message)
      if (e.message == 404) {
        postBidEnrichmentMessage('NO-CONTEXT')
      }
    })
}

/**
 * Helper function to set initial values when they are obtained by init
 * @param {Object} config module config obtained during init
 */
export function initializeModuleData(config) {
  const {apiUrl, groupId, bidders, enableBidEnrichment} = config.params;
  const qortexUrlBase = apiUrl || DEFAULT_API_URL;
  const windowUrl = window.top.location.host;
  qortexSessionInfo.bidEnrichmentDisabled = enableBidEnrichment !== null ? !enableBidEnrichment : true;
  qortexSessionInfo.bidderArray = bidders;
  qortexSessionInfo.impressionIds = new Set();
  qortexSessionInfo.currentSiteContext = null;
  qortexSessionInfo.pageAnalysisData = {
    contextRetrieved: false,
    contextAdded: {}
  };
  qortexSessionInfo.sessionId = generateSessionId();
  qortexSessionInfo.groupId = groupId;
  qortexSessionInfo.groupConfigUrl = `${qortexUrlBase}/api/v1/prebid/group/configs/${groupId}/${windowUrl}`;
  qortexSessionInfo.contextUrl = `${qortexUrlBase}/api/v1/prebid/${groupId}/page/lookup`;
  qortexSessionInfo.analyticsUrl = generateAnalyticsHostUrl(qortexUrlBase);
  lookupRateLimitTimeout = null;
  lookupAttemptDelay = false;
  return qortexSessionInfo;
}

export function saveContextAdded(reqBids, skipped = false) {
  const id = reqBids.auctionId;
  const contextBidders = qortexSessionInfo.bidderArray ?? Array.from(new Set(reqBids.adUnits.flatMap(adunit => adunit.bids.map(bid => bid.bidder))))
  qortexSessionInfo.pageAnalysisData.contextAdded[id] = {
    bidders: contextBidders,
    contextSkipped: skipped
  };
}

export function setContextData(value) {
  qortexSessionInfo.currentSiteContext = value
}

export function setGroupConfigData(value) {
  qortexSessionInfo.groupConfig = value
}

export function getContextAddedEntry (id) {
  return qortexSessionInfo?.pageAnalysisData?.contextAdded[id]
}

function generateSessionId() {
  const randomInt = window.crypto.getRandomValues(new Uint32Array(1));
  const currentDateTime = Math.floor(Date.now() / 1000);
  return 'QX' + randomInt.toString() + 'X' + currentDateTime.toString()
}

function attachContextAnalytics (data) {
  const contextAddedEntry = getContextAddedEntry(data.auctionId);
  if (contextAddedEntry) {
    data.qortexContext = qortexSessionInfo.currentSiteContext ?? {};
    data.qortexContextBidders = contextAddedEntry?.bidders;
    data.qortexContextSkipped = contextAddedEntry?.contextSkipped;
    return data;
  } else {
    logMessage(`Auction ${data.auctionId} did not interact with qortex bid enrichment`)
    return null;
  }
}

function checkPercentageOutcome(percentageValue) {
  const analyticsPercentage = percentageValue ?? 0;
  const randomInt = Math.random().toFixed(5) * 100;
  return analyticsPercentage > randomInt;
}

function shouldSendAnalytics(data) {
  if (data) {
    return checkPercentageOutcome(qortexSessionInfo.groupConfig?.prebidReportingPercentage)
  } else {
    return false;
  }
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

/**
 * Passes message out to external page through postMessage method
 * @param {string} msg message string to be passed to CX-BID-ENRICH target on current page
 */
function postBidEnrichmentMessage(msg) {
  window.postMessage({
    target: 'CX-BID-ENRICH',
    message: msg
  }, window.location.protocol + '//' + window.location.host);
  logMessage('Message post :: Qortex contextuality has been not been indexed.')
}

/**
 * Receives messages passed through postMessage method to QORTEX-PREBIDJS-RTD-MODULE on current page
 * @param {Object} evt data object holding Event information
 */
export function windowPostMessageReceived(evt) {
  const data = evt.data;
  if (typeof data.target !== 'undefined' && data.target === 'QORTEX-PREBIDJS-RTD-MODULE') {
    if (data.message === 'CX-BID-ENRICH-INITIALIZED' && shouldAllowBidEnrichment()) {
      requestContextData()
    }
  }
}

export const qortexSubmodule = {
  name: 'qortex',
  init,
  getBidRequestData,
  onAuctionEndEvent
}

submodule('realTimeData', qortexSubmodule);
