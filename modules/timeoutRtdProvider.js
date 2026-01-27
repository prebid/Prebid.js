import { submodule } from '../src/hook.js';
import * as ajax from '../src/ajax.js';
import { logInfo, deepAccess, logError } from '../src/utils.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { bidderTimeoutFunctions } from '../libraries/bidderTimeoutUtils/bidderTimeoutUtils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

const SUBMODULE_NAME = 'timeout';

// this allows the stubbing of functions during testing
export const timeoutRtdFunctions = {
  handleTimeoutIncrement
};

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
  const timeoutModifier = bidderTimeoutFunctions.calculateTimeoutModifier(adUnits, rules);
  const bidderTimeout = reqBidsConfigObj.timeout || getGlobal().getConfig('bidderTimeout');
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
