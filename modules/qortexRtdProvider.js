import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { logWarn, mergeDeep, logMessage, generateUUID } from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';

let requestUrl;
let bidderArray;
let impressionIds;
let currentSiteContext;

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
      ajax(requestUrl, callbacks)
    })
  } else {
    logMessage('Adding Content object from existing context data');
    return new Promise(resolve => resolve(currentSiteContext));
  }
}

/**
 * Updates bidder configs with the response from Qortex context services
 * @param {Object} reqBidsConfig Bid request configuration object
 * @param {string[]} bidders Bidders specified in module's configuration
 */
export function addContextToRequests (reqBidsConfig) {
  if (currentSiteContext === null) {
    logWarn('No context data received at this time');
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
          logWarn(`received invalid billable event due to ${!uid ? 'missing' : 'duplicate'} uid: qx-impression`)
          return;
        } else {
          logMessage('received billable event: qx-impression')
          impressionIds.add(uid)
          billableEvent.transactionId = e.detail.uid;
          events.emit(EVENTS.BILLABLE_EVENT, billableEvent);
          break;
        }
      default:
        logWarn(`received invalid billable event: ${e.detail?.type}`)
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
  requestUrl = `${apiUrl || DEFAULT_API_URL}/api/v1/analyze/${groupId}/prebid`;
  bidderArray = bidders;
  impressionIds = new Set();
  currentSiteContext = null;
}

export function setContextData(value) {
  currentSiteContext = value
}

export const qortexSubmodule = {
  name: 'qortex',
  init,
  getBidRequestData
}

submodule('realTimeData', qortexSubmodule);
