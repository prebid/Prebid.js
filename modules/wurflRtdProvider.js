import { submodule } from '../src/hook.js';
import { fetch, sendBeacon } from '../src/ajax.js';
import { loadExternalScript } from '../src/adloader.js';
import {
  mergeDeep,
  prefixLog,
} from '../src/utils.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

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
  url.searchParams.set('wurfl_id', 'true')

  try {
    loadExternalScript(url.toString(), MODULE_TYPE_RTD, MODULE_NAME, () => {
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
      data['enrich_device'] = true;
      enrichBidderRequest(reqBidsConfigObj, bidderCode, data);
      return;
    }
    // inject WURFL low entropy data
    const data = lowEntropyData(wjsResponse.WURFL, wjsResponse.wurfl_pbjs?.low_entropy_caps);
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
  if ('wurfl_id' in wurflData) {
    data['wurfl_id'] = wurflData.wurfl_id;
  }
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
    if (cap === 'complete_device_name') {
      value = value.replace(/Apple (iP(hone|ad|od)).*/, 'Apple iP$2');
    }
    data[cap] = value;
  });
  if ('model_name' in wurflData) {
    data['model_name'] = wurflData.model_name.replace(/(iP(hone|ad|od)).*/, 'iP$2');
  }
  if ('brand_name' in wurflData) {
    data['brand_name'] = wurflData.brand_name;
  }
  if ('wurfl_id' in wurflData) {
    data['wurfl_id'] = wurflData.wurfl_id;
  }
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
      'ext': {},
    },
  };

  const device = reqBidsConfigObj.ortb2Fragments.global.device;
  enrichOrtb2DeviceData('make', wurflData.brand_name, device, ortb2data);
  enrichOrtb2DeviceData('model', wurflData.model_name, device, ortb2data);
  if (wurflData.enrich_device) {
    delete wurflData.enrich_device;
    enrichOrtb2DeviceData('devicetype', makeOrtb2DeviceType(wurflData), device, ortb2data);
    enrichOrtb2DeviceData('os', wurflData.advertised_device_os, device, ortb2data);
    enrichOrtb2DeviceData('osv', wurflData.advertised_device_os_version, device, ortb2data);
    enrichOrtb2DeviceData('hwv', wurflData.model_name, device, ortb2data);
    enrichOrtb2DeviceData('h', wurflData.resolution_height, device, ortb2data);
    enrichOrtb2DeviceData('w', wurflData.resolution_width, device, ortb2data);
    enrichOrtb2DeviceData('ppi', wurflData.pixel_density, device, ortb2data);
    enrichOrtb2DeviceData('pxratio', toNumber(wurflData.density_class), device, ortb2data);
    enrichOrtb2DeviceData('js', toNumber(wurflData.ajax_support_javascript), device, ortb2data);
  }
  ortb2data.device.ext['wurfl'] = wurflData
  mergeDeep(reqBidsConfigObj.ortb2Fragments.bidder, { [bidderCode]: ortb2data });
}

/**
 * makeOrtb2DeviceType returns the ortb2 device type based on WURFL data
 * @param {Object} wurflData WURFL data
 * @returns {Number} ortb2 device type
 * @see https://www.scientiamobile.com/how-to-populate-iab-openrtb-device-object/
 */
export function makeOrtb2DeviceType(wurflData) {
  if (wurflData.is_mobile) {
    if (!('is_phone' in wurflData) || !('is_tablet' in wurflData)) {
      return undefined;
    }
    if (wurflData.is_phone || wurflData.is_tablet) {
      return 1;
    }
    return 6;
  }
  if (wurflData.is_full_desktop) {
    return 2;
  }
  if (wurflData.is_connected_tv) {
    return 3;
  }
  if (wurflData.is_phone) {
    return 4;
  }
  if (wurflData.is_tablet) {
    return 5;
  }
  if (wurflData.is_ott) {
    return 7;
  }
  return undefined;
}

/**
 * enrichOrtb2DeviceData enriches the ortb2data device data with WURFL data.
 * Note: it does not overrides properties set by Prebid.js
 * @param {String} key the device property key
 * @param {any} value the value of the device property
 * @param {Object} device the ortb2 device object from Prebid.js
 * @param {Object} ortb2data the ortb2 device data enrchiced with WURFL data
 */
function enrichOrtb2DeviceData(key, value, device, ortb2data) {
  if (device?.[key] !== undefined) {
    // value already defined by Prebid.js, do not overrides
    return;
  }
  if (value === undefined) {
    return;
  }
  ortb2data.device[key] = value;
}

/**
 * toNumber converts a given value to a number.
 * Returns `undefined` if the conversion results in `NaN`.
 * @param {any} value - The value to convert to a number.
 * @returns {number|undefined} The converted number, or `undefined` if the conversion fails.
 */
export function toNumber(value) {
  if (value === '' || value === null) {
    return undefined;
  }
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
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
