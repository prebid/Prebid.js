
import { submodule } from '../src/hook.js';
import * as ajax from '../src/ajax.js';
import { logInfo, deepAccess, logError } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';

const SUBMODULE_NAME = 'timeout';

// this allows the stubbing of functions during testing
export const timeoutRtdFunctions = {
  getDeviceType,
  getConnectionSpeed,
  checkVideo,
  calculateTimeoutModifier,
  handleTimeoutIncrement
};

const entries = Object.entries || function(obj) {
  const ownProps = Object.keys(obj);
  let i = ownProps.length;
  let resArray = new Array(i);
  while (i--) { resArray[i] = [ownProps[i], obj[ownProps[i]]]; }
  return resArray;
};

function getDeviceType() {
  const userAgent = window.navigator.userAgent.toLowerCase();
  if ((/ipad|android 3.0|xoom|sch-i800|playbook|tablet|kindle/i.test(userAgent))) {
    return 5; // tablet
  }
  if ((/iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent))) {
    return 4; // mobile
  }
  return 2; // personal computer
}

function checkVideo(adUnits) {
  return adUnits.some((adUnit) => {
    return adUnit.mediaTypes && adUnit.mediaTypes.video;
  });
}

function getConnectionSpeed() {
  const connection = window.navigator.connection || window.navigator.mozConnection || window.navigator.webkitConnection || {}
  const connectionType = connection.type || connection.effectiveType;

  switch (connectionType) {
    case 'slow-2g':
    case '2g':
      return 'slow';

    case '3g':
      return 'medium';

    case 'bluetooth':
    case 'cellular':
    case 'ethernet':
    case 'wifi':
    case 'wimax':
    case '4g':
      return 'fast';
  }

  return 'unknown';
}
/**
 * Calculate the time to be added to the timeout
 * @param {Array} adUnits
 * @param {Object} rules
 * @return {int}
 */
function calculateTimeoutModifier(adUnits, rules) {
  logInfo('Timeout rules', rules);
  let timeoutModifier = 0;
  let toAdd = 0;

  if (rules.includesVideo) {
    const hasVideo = timeoutRtdFunctions.checkVideo(adUnits);
    toAdd = rules.includesVideo[hasVideo] || 0;
    logInfo(`Adding ${toAdd} to timeout for includesVideo ${hasVideo}`)
    timeoutModifier += toAdd;
  }

  if (rules.numAdUnits) {
    const numAdUnits = adUnits.length;
    if (rules.numAdUnits[numAdUnits]) {
      timeoutModifier += rules.numAdUnits[numAdUnits];
    } else {
      for (const [rangeStr, timeoutVal] of entries(rules.numAdUnits)) {
        const [lowerBound, upperBound] = rangeStr.split('-');
        if (parseInt(lowerBound) <= numAdUnits && numAdUnits <= parseInt(upperBound)) {
          logInfo(`Adding ${timeoutVal} to timeout for numAdUnits ${numAdUnits}`)
          timeoutModifier += timeoutVal;
          break;
        }
      }
    }
  }

  if (rules.deviceType) {
    const deviceType = timeoutRtdFunctions.getDeviceType();
    toAdd = rules.deviceType[deviceType] || 0;
    logInfo(`Adding ${toAdd} to timeout for deviceType ${deviceType}`)
    timeoutModifier += toAdd;
  }

  if (rules.connectionSpeed) {
    const connectionSpeed = timeoutRtdFunctions.getConnectionSpeed();
    toAdd = rules.connectionSpeed[connectionSpeed] || 0;
    logInfo(`Adding ${toAdd} to timeout for connectionSpeed ${connectionSpeed}`)
    timeoutModifier += toAdd;
  }

  logInfo('timeout Modifier calculated', timeoutModifier);
  return timeoutModifier;
}

/**
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {Object} config
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  logInfo('Timeout rtd config', config);
  const timeoutUrl = deepAccess(config, 'params.endpoint.url');
  if (timeoutUrl) {
    logInfo('Timeout url', timeoutUrl);
    ajax.ajaxBuilder()(timeoutUrl, {
      success: function(response) {
        try {
          const rules = JSON.parse(response);
          timeoutRtdFunctions.handleTimeoutIncrement(reqBidsConfigObj, rules);
        } catch (e) {
          logError('Error parsing json response from timeout provider.')
        }
        callback();
      },
      error: function(errorStatus) {
        logError('Timeout request error!', errorStatus);
        callback();
      }
    });
  } else if (deepAccess(config, 'params.rules')) {
    timeoutRtdFunctions.handleTimeoutIncrement(reqBidsConfigObj, deepAccess(config, 'params.rules'));
    callback();
  } else {
    logInfo('No timeout endpoint or timeout rules found. Exiting timeout rtd module');
    callback();
  }
}

/**
 * Gets the timeout modifier, adds it to the bidder timeout, and sets it to reqBidsConfigObj
 * @param {Object} reqBidsConfigObj
 * @param {Object} rules
 */
function handleTimeoutIncrement(reqBidsConfigObj, rules) {
  const adUnits = reqBidsConfigObj.adUnits || getGlobal().adUnits;
  const timeoutModifier = timeoutRtdFunctions.calculateTimeoutModifier(adUnits, rules);
  const bidderTimeout = getGlobal().getConfig('bidderTimeout');
  reqBidsConfigObj.timeout = bidderTimeout + timeoutModifier;
}

/** @type {RtdSubmodule} */
export const timeoutSubmodule = {
  /**
   * used to link submodule with realTimeData
   * @type {string}
   */
  name: SUBMODULE_NAME,
  init: () => true,
  getBidRequestData,
};

function registerSubModule() {
  submodule('realTimeData', timeoutSubmodule);
}

registerSubModule();
