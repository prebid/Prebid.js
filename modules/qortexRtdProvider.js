import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logWarn, mergeDeep, logMessage, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import CONSTANTS from '../src/constants.json';

let bidderArray;
let impressionIds;
let currentSiteContext;
let currentGroupConfig;

const qortexApiUrls = {
  analyis: '',
  context: '',
  groupConfig: ''
}, 
pageAnalysisdata = {
  requestSuccessful: null,
  indexData: null,
  analysisGenerated: false,
  analysisData: null
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
 * determines whether to send a request to context api and does so if necessary
 * @returns {Promise} ortb Content object
 */
export function getContext () {
  if (!currentSiteContext) {
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
      ajax(qortexApiUrls.context, callbacks)
    })
  } else {
    logMessage('Adding Content object from existing context data');
    return new Promise(resolve => resolve(currentSiteContext));
  }
}

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
    ajax(qortexApiUrls.groupConfig, callbacks)
  })
}

export function requestPageAnalysis () {
  const indexData = generateIndexData();
  logMessage('sending page data for context analysis');
    return new Promise((resolve, reject) => {
      const callbacks = {
        success() {
          analysisData.requestSuccessful = true;
          resolve();
        },
        error(error) {
          analysisData.requestSuccessful = false;
          reject(new Error(error));
        }
      }
      ajax(pageAnalysisUrl, callbacks, JSON.stringify(indexData), {contentType: 'application/json'})
    })
}

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
 * Updates bidder configs with the response from Qortex context services
 * @param {Object} reqBidsConfig Bid request configuration object
 * @param {string[]} bidders Bidders specified in module's configuration
 */
export function addContextToRequests (reqBidsConfig) {
  if (currentSiteContext === null) {
    logWarn('No context data recieved at this time');
  } else {
    const fragment = { site: {content: currentSiteContext} }
    if (bidderArray?.length > 0) {
      bidderArray.forEach(bidder => mergeDeep(reqBidsConfig.ortb2Fragments.bidder, {[bidder]: fragment}))
    } else if (!bidderArray) {
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
        if (!uid || impressionIds.has(uid)) {
          logWarn(`recieved invalid billable event due to ${!uid ? 'missing' : 'duplicate'} uid: qx-impression`)
          return;
        } else {
          logMessage('recieved billable event: qx-impression')
          impressionIds.add(uid)
          billableEvent.transactionId = e.detail.uid;
          events.emit(CONSTANTS.EVENTS.BILLABLE_EVENT, billableEvent);
          break;
        }
      default:
        logWarn(`recieved invalid billable event: ${e.detail?.type}`)
    }
  })

  loadExternalScript(src, code, undefined, undefined, attr);
}

/**
 * Helper function to set initial values when they are obtained by init
 * @param {Object} config module config obtained during init
 */
export function initializeModuleData(config) {
  const DEFAULT_API_URL = 'https://demand.qortex.ai';
  const {apiUrl, groupId, bidders} = config.params;
  const windowUrl = window.top.location.host;
  const qortexUrlBase = apiUrl || DEFAULT_API_URL;
  bidderArray = bidders;
  impressionIds = new Set();
  currentSiteContext = null;
  qortexApiUrls.groupConfig = `${qortexUrlBase}/api/v1/group/configs/${groupId}/${windowUrl}/prebid`
  qortexApiUrls.context = `${qortexUrlBase}/api/v1/analyze/${groupId}/prebid`
  qortexApiUrls.analyis = `${qortexUrlBase}/api/v1/prebid/${groupId}/page/index`;
  
  requestPageAnalysis()
    .then(() => {
      logMessage("successfully initiated Qortex page analysis")
    })
    .catch((e) => {
      logWarn(e?.message);
    });
  getGroupConfig()
      .then(configData => {
        logMessage("recieved response for qortex group config")
        setGroupConfigData(configData)
      })
      .catch((e) => {
        logWarn(e?.message);
      });
}

export function setContextData(value) {
  currentSiteContext = value
}

export function setGroupConfigData(value) {
  currentGroupConfig = value
}

export const qortexSubmodule = {
  name: 'qortex',
  init,
  getBidRequestData
}

submodule('realTimeData', qortexSubmodule);
