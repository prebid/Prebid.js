import { submodule } from '../src/hook.js';
import { fetch, sendBeacon } from '../src/ajax.js';
import { loadExternalScript } from '../src/adloader.js';
import {
  mergeDeep,
  prefixLog,
} from '../src/utils.js';

// Constants
const REAL_TIME_MODULE = 'realTimeData';
const MODULE_NAME = 'wurfl';

// WURFL_JS_HOST is the host for the WURFL service endpoints
const WURFL_JS_HOST = 'https://prebid.wurflcloud.com';
// WURFL_JS_ENDPOINT_PATH is the path for the WURFL.js endpoint used to load WURFL data
const WURFL_JS_ENDPOINT_PATH = '/wurfl.js';
// STATS_ENDPOINT_PATH is the path for the stats endpoint used to send analytics data
const STATS_ENDPOINT_PATH = '/v1/prebid/stats';

const logger = prefixLog('[WURFL RTD Submodule]');

// enrichedBidders holds a list of prebid bidder names, of bidders which have been
// injected with WURFL data
const enrichedBidders = new Set();

/**
 * init initializes the WURFL RTD submodule
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Object} userConsent User consent data
 */
const init = (config, userConsent) => {
  logger.logMessage('initialized');
  return true;
}

/**
 * getBidRequestData enriches the OpenRTB 2.0 device data with WURFL data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} callback Called on completion
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Object} userConsent User consent data
 */
const getBidRequestData = (reqBidsConfigObj, callback, config, userConsent) => {
  const altHost = config.params?.altHost ?? null;
  const isDebug = config.params?.debug ?? false;

  const bidders = new Set();
  reqBidsConfigObj.adUnits.forEach(adUnit => {
    adUnit.bids.forEach(bid => {
      bidders.add(bid.bidder);
    });
  });

  let host = WURFL_JS_HOST;
  if (altHost) {
    host = altHost;
  }

  const url = new URL(host);
  url.pathname = WURFL_JS_ENDPOINT_PATH;

  if (isDebug) {
    url.searchParams.set('debug', 'true')
  }

  url.searchParams.set('mode', 'prebid')
  logger.logMessage('url', url.toString());

  try {
    loadExternalScript(url.toString(), MODULE_NAME, () => {
      logger.logMessage('script injected');
      window.WURFLPromises.complete.then((res) => {
        logger.logMessage('received data', res);
        if (!res.wurfl_pbjs) {
          logger.logError('invalid WURFL.js for Prebid response');
        } else {
          enrichBidderRequests(reqBidsConfigObj, bidders, res);
        }
        callback();
      });
    });
  } catch (err) {
    logger.logError(err);
    callback();
  }
}

/**
 * enrichBidderRequests enriches the OpenRTB 2.0 device data with WURFL data for Business Edition
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Array} bidders List of bidders
 * @param {Object} wjsResponse WURFL.js response
 */
function enrichBidderRequests(reqBidsConfigObj, bidders, wjsResponse) {
  const authBidders = wjsResponse.wurfl_pbjs?.authorized_bidders ?? {};
  const caps = wjsResponse.wurfl_pbjs?.caps ?? [];

  bidders.forEach((bidderCode) => {
    if (bidderCode in authBidders) {
      // inject WURFL data
      enrichedBidders.add(bidderCode);
      const data = bidderData(wjsResponse.WURFL, caps, authBidders[bidderCode]);
      logger.logMessage(`injecting data for ${bidderCode}: `, data);
      enrichBidderRequest(reqBidsConfigObj, bidderCode, data);
      return;
    }
    // inject WURFL low entropy data
    const data = lowEntropyData(wjsResponse.WURFL, wjsResponse.wurfl_pbjs?.low_entropy_caps);
    logger.logMessage(`injecting low entropy data for ${bidderCode}: `, data);
    enrichBidderRequest(reqBidsConfigObj, bidderCode, data);
  });
}

/**
 * bidderData returns the WURFL data for a bidder
 * @param {Object} wurflData WURFL data
 * @param {Array} caps Capability list
 * @param {Array} filter Filter list
 * @returns {Object} Bidder data
 */
export const bidderData = (wurflData, caps, filter) => {
  const data = {};
  caps.forEach((cap, index) => {
    if (!filter.includes(index)) {
      return;
    }
    if (cap in wurflData) {
      data[cap] = wurflData[cap];
    }
  });
  return data;
}

/**
 * lowEntropyData returns the WURFL low entropy data
 * @param {Object} wurflData WURFL data
 * @param {Array} lowEntropyCaps Low entropy capability list
 * @returns {Object} Bidder data
 */
export const lowEntropyData = (wurflData, lowEntropyCaps) => {
  const data = {};
  lowEntropyCaps.forEach((cap, _) => {
    let value = wurflData[cap];
    if (cap == 'complete_device_name') {
      value = value.replace(/Apple (iP(hone|ad|od)).*/, 'Apple iP$2');
    }
    data[cap] = value;
  });
  return data;
}

/**
 * enrichBidderRequest enriches the bidder request with WURFL data
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {String} bidderCode Bidder code
 * @param {Object} wurflData WURFL data
 */
export const enrichBidderRequest = (reqBidsConfigObj, bidderCode, wurflData) => {
  const ortb2data = {
    'device': {
      'ext': {
        'wurfl': wurflData,
      }
    },
  };
  mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, { [bidderCode]: ortb2data });
}

/**
 * onAuctionEndEvent is called when the auction ends
 * @param {Object} auctionDetails Auction details
 * @param {Object} config Configuration for WURFL RTD submodule
 * @param {Object} userConsent User consent data
 */
function onAuctionEndEvent(auctionDetails, config, userConsent) {
  const altHost = config.params?.altHost ?? null;

  let host = WURFL_JS_HOST;
  if (altHost) {
    host = altHost;
  }

  const url = new URL(host);
  url.pathname = STATS_ENDPOINT_PATH;

  if (enrichedBidders.size === 0) {
    return;
  }

  var payload = JSON.stringify({ bidders: [...enrichedBidders] });
  const sentBeacon = sendBeacon(url.toString(), payload);
  if (sentBeacon) {
    return;
  }

  fetch(url.toString(), {
    method: 'POST',
    body: payload,
    mode: 'no-cors',
    keepalive: true
  });
}

// The WURFL submodule
export const wurflSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
  onAuctionEndEvent,
}

// Register the WURFL submodule as submodule of realTimeData
submodule(REAL_TIME_MODULE, wurflSubmodule);
