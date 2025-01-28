/**
 * This module adds humansecurity provider to the real time data module
 *
 * The {@link module:modules/realTimeData} module is required
 * The module will inject the HUMAN Security script into the context where Prebid.js is initialized, enriching bid requests with specific data to provide advanced protection against ad fraud and spoofing.
 * @module modules/humansecurityRtdProvider
 * @requires module:modules/realTimeData
 */

import { submodule } from '../src/hook.js';
import {
  prefixLog,
  mergeDeep,
  generateUUID,
  getWindowSelf,
} from '../src/utils.js';
import { getRefererInfo } from '../src/refererDetection.js';
import { getGlobal } from '../src/prebidGlobal.js';
import { loadExternalScript } from '../src/adloader.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 * @typedef {import('../modules/rtdModule/index.js').SubmoduleConfig} SubmoduleConfig
 * @typedef {import('../modules/rtdModule/index.js').UserConsentData} UserConsentData
 */

const SUBMODULE_NAME = 'humansecurity';
const SCRIPT_URL = 'https://sonar.script.ac/prebid/rtd.js';

const { logInfo, logWarn, logError } = prefixLog(`[${SUBMODULE_NAME}]:`);

/** @type {string} */
let clientId = '';

/** @type {boolean} */
let verbose = false;

/** @type {string} */
let sessionId = '';

/** @type {Object} */
let hmnsData = { };

/**
 * Submodule registration
 */
function main() {
  submodule('realTimeData', /** @type {RtdSubmodule} */ ({
    name: SUBMODULE_NAME,

    //
    init: (config, userConsent) => {
      try {
        load(config);
        return true;
      } catch (err) {
        logError('init', err.message);
        return false;
      }
    },

    getBidRequestData: onGetBidRequestData
  }));
}

/**
 * Injects HUMAN Security script on the page to facilitate pre-bid signal collection.
 * @param {SubmoduleConfig} config
 */
function load(config) {
  // By default, this submodule loads the generic implementation script
  // only identified by the referrer information. In the future, if publishers
  // want to have analytics where their websites are grouped, they can request
  // Client ID from HUMAN, pass it here, and it will enable advanced reporting
  clientId = config?.params?.clientId || '';
  if (clientId && (typeof clientId !== 'string' || !/^\w{3,16}$/.test(clientId))) {
    throw new Error(`The 'clientId' parameter must be a short alphanumeric string`);
  }

  // Load/reset the state
  verbose = !!config?.params?.verbose;
  sessionId = generateUUID();
  hmnsData = {};

  // We rely on prebid implementation to get the best domain possible here
  // In some cases, it still might be null, though
  const refDomain = getRefererInfo().domain || '';

  // Once loaded, the implementation script will publish an API using
  // the session ID value it was given in data attributes
  const scriptAttrs = { 'data-sid': sessionId };
  const scriptUrl = `${SCRIPT_URL}?r=${refDomain}${clientId ? `&c=${clientId}` : ''}`;

  loadExternalScript(scriptUrl, SUBMODULE_NAME, onImplLoaded, null, scriptAttrs);
}

/**
 * The callback to loadExternalScript
 * Establishes the bridge between this RTD submodule and the loaded implementation
 */
function onImplLoaded() {
  // We then get a hold on this script using the knowledge of this session ID
  const wnd = getWindowSelf();
  const impl = wnd[`sonar_${sessionId}`];
  if (typeof impl !== 'object' || typeof impl.connect !== 'function') {
    verbose && logWarn('onload', 'Unable to access the implementation script');
    return;
  }

  // And set up a bridge between the RTD submodule and the implementation.
  // The first argument is used to identify the caller.
  // The callback might be called multiple times to update the signals
  // once more precise information is available.
  impl.connect(getGlobal(), onImplMessage);
}

/**
 * The bridge function will be called by the implementation script
 * to update the token information or report errors
 * @param {Object} msg
 */
function onImplMessage(msg) {
  if (typeof msg !== 'object') {
    return;
  }

  switch (msg.type) {
    case 'hmns': {
      hmnsData = mergeDeep({}, msg.data || {});
      break;
    }
    case 'error': {
      logError('impl', msg.data || '');
      break;
    }
    case 'warn': {
      verbose && logWarn('impl', msg.data || '');
      break;
    }
    case 'info': {
      verbose && logInfo('impl', msg.data || '');
      break;
    }
  }
}

/**
 * onGetBidRequestData is called once per auction.
 * Update the `ortb2Fragments` object with the data from the injected script.
 *
 * @param {Object} reqBidsConfigObj
 * @param {function} callback
 * @param {SubmoduleConfig} config
 * @param {UserConsentData} userConsent
 */
function onGetBidRequestData(reqBidsConfigObj, callback, config, userConsent) {
  // Add device.ext.hmns to the global ORTB data for all vendors to use
  // At the time of writing this submodule, "hmns" is an object defined
  // internally by humansecurity, and it currently contains "v1" field
  // with a token that contains collected signals about this session.
  mergeDeep(reqBidsConfigObj.ortb2Fragments.global, { device: { ext: { hmns: hmnsData } } });
  callback();
}

/**
 * Exporting local (and otherwise encapsulated to this module) functions
 * for testing purposes
 */
export const __TEST__ = {
  SUBMODULE_NAME,
  SCRIPT_URL,
  main,
  load,
  onImplLoaded,
  onImplMessage,
  onGetBidRequestData
};

main();
