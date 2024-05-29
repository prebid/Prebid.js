/**
 * Contxtful Technologies Inc.
 * This RTD module provides receptivity that can be accessed using the
 * getTargetingData and getBidRequestData functions. The receptivity enriches ad units
 * and bid requests.
 */

import { submodule } from '../src/hook.js';
import {
  logInfo,
  logError,
  isStr,
  mergeDeep,
  isEmptyStr,
  isEmpty,
  buildUrl,
  isArray,
} from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';

const MODULE_NAME = 'contxtful';
const MODULE = `${MODULE_NAME}RtdProvider`;

const CONTXTFUL_RECEPTIVITY_DOMAIN = 'api.receptivity.io';

let rxApi = null;
let isFirstBidRequestCall = true;

/**
 * Return current receptivity value for the requester.
 * @param { String } requester
 * @return { { Object } }
 */
function getRxEngineReceptivity(requester) {
  return rxApi?.receptivity(requester);
}

function loadSessionReceptivity(requester) {
  let sessionStorageValue = sessionStorage.getItem(requester);
  if (!sessionStorageValue) {
    return null;
  }

  try {
    // Check expiration of the cached value
    let sessionStorageReceptivity = JSON.parse(sessionStorageValue);
    let expiration = parseInt(sessionStorageReceptivity?.exp);
    if (expiration < new Date().getTime()) {
      return null;
    }

    let rx = sessionStorageReceptivity?.rx;
    return rx;
  } catch {
    return null;
  }
};

/**
 * Prepare a receptivity batch
 * @param {Array.<String>} requesters
 * @param {Function} method
 * @returns A batch
 */
function prepareBatch(requesters, method) {
  return requesters.reduce((acc, requester) => {
    const receptivity = method(requester);
    if (!isEmpty(receptivity)) {
      return { ...acc, [requester]: receptivity };
    } else {
      return acc;
    }
  }, {});
}

/**
 * Init function used to start sub module
 * @param { { params: { version: String, customer: String, hostname: String } } } config
 * @return { Boolean }
 */
function init(config) {
  logInfo(MODULE, 'init', config);
  rxApi = null;

  try {
    const { version, customer, hostname } = extractParameters(config);
    initCustomer(version, customer, hostname);
    return true;
  } catch (error) {
    logError(MODULE, error);
    return false;
  }
}

/**
 * Extract required configuration for the sub module.
 * validate that all required configuration are present and are valid.
 * Throws an error if any config is missing of invalid.
 * @param { { params: { version: String, customer: String, hostname: String } } } config
 * @return { { version: String, customer: String, hostname: String } }
 * @throws params.{name} should be a non-empty string
 */
export function extractParameters(config) {
  const version = config?.params?.version;
  if (!isStr(version) || isEmptyStr(version)) {
    throw Error(`${MODULE}: params.version should be a non-empty string`);
  }

  const customer = config?.params?.customer;
  if (!isStr(customer) || isEmptyStr(customer)) {
    throw Error(`${MODULE}: params.customer should be a non-empty string`);
  }

  const hostname = config?.params?.hostname || CONTXTFUL_RECEPTIVITY_DOMAIN;

  return { version, customer, hostname };
}

/**
 * Initialize sub module for a customer.
 * This will load the external resources for the sub module.
 * @param { String } version
 * @param { String } customer
 * @param { String } hostname
 */
function initCustomer(version, customer, hostname) {
  const CONNECTOR_URL = buildUrl({
    protocol: 'https',
    host: hostname,
    pathname: `/${version}/prebid/${customer}/connector/rxConnector.js`,
  });

  const externalScript = loadExternalScript(CONNECTOR_URL, MODULE_NAME);
  addExternalScriptEventListener(externalScript, customer);
}

/**
 * Add event listener to the script tag for the expected events from the external script.
 * @param { HTMLScriptElement } script
 */
function addExternalScriptEventListener(script, tagId) {
  script.addEventListener(
    'rxConnectorIsReady',
    async ({ detail: rxConnector }) => {
      // Fetch the customer configuration
      const { rxApiBuilder, fetchConfig } = rxConnector;
      let config = await fetchConfig(tagId);
      if (!config) {
        return;
      }
      rxApi = await rxApiBuilder(config);
    }
  );
}

/**
 * Set targeting data for ad server
 * @param { [String] } adUnits
 * @param {*} config
 * @param {*} _userConsent
 * @return {{ code: { ReceptivityState: String } }}
 */
function getTargetingData(adUnits, config, _userConsent) {
  try {
    if (String(config?.params?.adServerTargeting) === 'false') {
      return {};
    }
    logInfo(MODULE, 'getTargetingData');

    const requester = config?.params?.customer;
    const rx = getRxEngineReceptivity(requester) ||
      loadSessionReceptivity(requester) || {};
    if (isEmpty(rx)) {
      return {};
    }

    return adUnits.reduce((targets, code) => {
      targets[code] = rx;
      return targets;
    }, {});
  } catch (error) {
    logError(MODULE, error);
    return {};
  }
}

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} onDone Called on completion
 * @param {Object} config Configuration for Contxtful RTD module
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, onDone, config, userConsent) {
  function onReturn() {
    if (isFirstBidRequestCall) {
      isFirstBidRequestCall = false;
    };
    onDone();
  }
  logInfo(MODULE, 'getBidRequestData');
  const bidders = config?.params?.bidders || [];
  if (isEmpty(bidders) || !isArray(bidders)) {
    onReturn();
    return;
  }

  let fromApiBatched = () => rxApi?.receptivityBatched?.(bidders);
  let fromApiSingle = () => prepareBatch(bidders, getRxEngineReceptivity);
  let fromStorage = () => prepareBatch(bidders, loadSessionReceptivity);

  function tryMethods(methods) {
    for (let method of methods) {
      try {
        let batch = method();
        if (!isEmpty(batch)) {
          return batch;
        }
      } catch (error) { }
    }
    return {};
  }
  let rxBatch = {};
  try {
    if (isFirstBidRequestCall) {
      rxBatch = tryMethods([fromStorage, fromApiBatched, fromApiSingle]);
    } else {
      rxBatch = tryMethods([fromApiBatched, fromApiSingle, fromStorage])
    }
  } catch (error) { }

  if (isEmpty(rxBatch)) {
    onReturn();
    return;
  }

  bidders
    .map((bidderCode) => ({ bidderCode, rx: rxBatch[bidderCode] }))
    .filter(({ rx }) => !isEmpty(rx))
    .forEach(({ bidderCode, rx }) => {
      const ortb2 = {
        user: {
          data: [
            {
              name: MODULE_NAME,
              ext: {
                rx,
                params: {
                  ev: config.params?.version,
                  ci: config.params?.customer,
                },
              },
            },
          ],
        },
      };
      mergeDeep(reqBidsConfigObj.ortb2Fragments?.bidder, {
        [bidderCode]: ortb2,
      });
    });

  onReturn();
};

export const contxtfulSubmodule = {
  name: MODULE_NAME,
  init,
  getTargetingData,
  getBidRequestData,
};

submodule('realTimeData', contxtfulSubmodule);
