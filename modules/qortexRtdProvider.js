import { submodule } from '../src/hook.js';
import { logWarn, mergeDeep, logMessage, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

const qortexSessionInfo = {};
const QX_IN_MESSAGE = {
  BID_ENRICH_INITIALIZED: 'CX-BID-ENRICH-INITIALIZED',
  DISPATCH_CONTEXT: 'DISPATCH-CONTEXT'
}
const QX_OUT_MESSAGE = {
  AUCTION_END: 'AUCTION-END',
  NO_CONTEXT: 'NO-CONTEXT',
  RTD_INITIALIZED: 'RTD-INITIALIZED',
  REQUEST_CONTEXT: 'REQUEST-CONTEXT'
}

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
      initializeBidEnrichment();
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
    addContextToRequests(reqBidsConfig);
  } else {
    logWarn('Module function is paused due to configuration \n Module Config: ' + JSON.stringify(reqBidsConfig));
  }
  callback();
}

/**
 * Processess auction end events for Qortex reporting
 * @param {Object} data Auction end object
 */
function onAuctionEndEvent (data, config, t) {
  logMessage('Auction ended: ', JSON.stringify(data));
  if (shouldAllowBidEnrichment()) {
    if (!qortexSessionInfo.auctionsEnded) {
      qortexSessionInfo.auctionsEnded = [];
    }
    qortexSessionInfo.auctionsEnded.push(JSON.stringify(data));
    postBidEnrichmentMessage(QX_OUT_MESSAGE.AUCTION_END, JSON.stringify(data));
  }
}

/**
 * Updates bidder configs with the response from Qortex context services
 * @param {Object} reqBidsConfig Bid request configuration object
 */
export function addContextToRequests (reqBidsConfig) {
  if (qortexSessionInfo.currentSiteContext === null) {
    logWarn('No context data received at this time');
    requestContextData();
  } else {
    if (checkPercentageOutcome(qortexSessionInfo.groupConfig?.prebidBidEnrichmentPercentage)) {
      const fragment = { site: {content: qortexSessionInfo.currentSiteContext} }
      if (qortexSessionInfo.bidderArray?.length > 0) {
        qortexSessionInfo.bidderArray.forEach(bidder => mergeDeep(reqBidsConfig.ortb2Fragments.bidder, {[bidder]: fragment}));
      } else if (!qortexSessionInfo.bidderArray) {
        mergeDeep(reqBidsConfig.ortb2Fragments.global, fragment);
      } else {
        logWarn('Config contains an empty bidders array, unable to determine which bids to enrich');
      }
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
 * Call Qortex code on page for available contextual information about current environment
 */
export function requestContextData() {
  if (qortexSessionInfo.currentSiteContext) {
    logMessage('Context data already retrieved.');
  } else {
    postBidEnrichmentMessage(QX_OUT_MESSAGE.REQUEST_CONTEXT);
  }
}

/**
 * Helper function to set initial values when they are obtained by init
 * @param {Object} config module config obtained during init
 */
export function initializeModuleData(config) {
  const {groupId, bidders, enableBidEnrichment} = config.params;
  qortexSessionInfo.bidEnrichmentDisabled = enableBidEnrichment !== null ? !enableBidEnrichment : true;
  qortexSessionInfo.bidderArray = bidders;
  qortexSessionInfo.impressionIds = new Set();
  qortexSessionInfo.currentSiteContext = null;
  qortexSessionInfo.sessionId = generateSessionId();
  qortexSessionInfo.groupId = groupId;
  return qortexSessionInfo;
}

/**
 * Allows setting of contextual data
 */
export function setContextData(value) {
  qortexSessionInfo.currentSiteContext = value
}

/**
 * Allows setting of group configuration data
 */
export function setGroupConfigData(value) {
  qortexSessionInfo.groupConfig = value
}

/**
 * Unique id generator creating an identifier through datetime and random number
 * @returns {string}
 */
function generateSessionId() {
  const randomInt = window.crypto.getRandomValues(new Uint32Array(1));
  const currentDateTime = Math.floor(Date.now() / 1000);
  return 'QX' + randomInt.toString() + 'X' + currentDateTime.toString()
}

/**
 * Check for a random value to be above given percentage threshold
 * @param {number} percentageValue 0-100 number for percentage check.
 * @returns {Boolean}
 */
function checkPercentageOutcome(percentageValue) {
  return (percentageValue ?? 0) > (Math.random() * 100);
}

/**
 * Check for allowing functionality of bid enrichment capabilities.
 * @returns {Boolean}
 */
function shouldAllowBidEnrichment() {
  if (qortexSessionInfo.bidEnrichmentDisabled) {
    logWarn('Bid enrichment disabled at prebid config')
    return false;
  }
  return true
}

/**
 * Passes message out to external page through postMessage method
 * @param {string} msg message string to be passed to CX-BID-ENRICH target on current page
 * @param {Object} data optional parameter object with additional data to send with post
 */
function postBidEnrichmentMessage(msg, data = null) {
  window.postMessage({
    target: 'CX-BID-ENRICH',
    message: msg,
    params: data
  }, window.location.protocol + '//' + window.location.host);
  logMessage('Dispatching window postMessage: ' + msg);
}

/**
 * Receives messages passed through postMessage method to QORTEX-PREBIDJS-RTD-MODULE on current page
 * @param {Object} evt data object holding Event information
 */
export function windowPostMessageReceived(evt) {
  const data = evt.data;
  if (typeof data.target !== 'undefined' && data.target === 'QORTEX-PREBIDJS-RTD-MODULE') {
    if (shouldAllowBidEnrichment()) {
      if (data.message === QX_IN_MESSAGE.BID_ENRICH_INITIALIZED) {
        if (Boolean(data.params) && Boolean(data.params?.groupConfig)) {
          setGroupConfigData(data.params.groupConfig);
        }
        postBidEnrichmentMessage(QX_OUT_MESSAGE.RTD_INITIALIZED);
        if (qortexSessionInfo?.auctionsEnded?.length > 0) {
          qortexSessionInfo.auctionsEnded.forEach(data => postBidEnrichmentMessage(QX_OUT_MESSAGE.AUCTION_END, data));
        }
        requestContextData();
      } else if (data.message === QX_IN_MESSAGE.DISPATCH_CONTEXT) {
        if (data.params?.context) {
          setContextData(data.params.context);
        }
      }
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
