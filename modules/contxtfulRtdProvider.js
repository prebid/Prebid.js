/**
 * Contxtful Technologies Inc
 * This RTD module provides receptivity feature that can be accessed using the
 * getReceptivity() function. The value returned by this function enriches the ad-units
 * that are passed within the `getTargetingData` functions and GAM.
 */

import { submodule } from '../src/hook.js';
import {
  logInfo,
  logError,
  isStr,
  isEmptyStr,
  buildUrl,
} from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';

const MODULE_NAME = 'contxtful';
const MODULE = `${MODULE_NAME}RtdProvider`;

const CONTXTFUL_RECEPTIVITY_DOMAIN = 'api.receptivity.io';

let initialReceptivity = null;
let contxtfulModule = null;

/**
 * Init function used to start sub module
 * @param { { params: { version: String, customer: String, hostname: String } } } config
 * @return { Boolean }
 */
function init(config) {
  logInfo(MODULE, 'init', config);
  initialReceptivity = null;
  contxtfulModule = null;

  try {
    const {version, customer, hostname} = extractParameters(config);
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
function extractParameters(config) {
  const version = config?.params?.version;
  if (!isStr(version) || isEmptyStr(version)) {
    throw Error(`${MODULE}: params.version should be a non-empty string`);
  }

  const customer = config?.params?.customer;
  if (!isStr(customer) || isEmptyStr(customer)) {
    throw Error(`${MODULE}: params.customer should be a non-empty string`);
  }

  const hostname = config?.params?.hostname || CONTXTFUL_RECEPTIVITY_DOMAIN;

  return {version, customer, hostname};
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
    pathname: `/${version}/prebid/${customer}/connector/p.js`,
  });

  const externalScript = loadExternalScript(CONNECTOR_URL, MODULE_NAME);
  addExternalScriptEventListener(externalScript);
}

/**
 * Add event listener to the script tag for the expected events from the external script.
 * @param { HTMLScriptElement } script
 */
function addExternalScriptEventListener(script) {
  if (!script) {
    return;
  }

  script.addEventListener('initialReceptivity', ({ detail }) => {
    let receptivityState = detail?.ReceptivityState;
    if (isStr(receptivityState) && !isEmptyStr(receptivityState)) {
      initialReceptivity = receptivityState;
    }
  });

  script.addEventListener('rxEngineIsReady', ({ detail: api }) => {
    contxtfulModule = api;
  });
}

/**
 * Return current receptivity.
 * @return { { ReceptivityState: String } }
 */
function getReceptivity() {
  return {
    ReceptivityState: contxtfulModule?.GetReceptivity()?.ReceptivityState || initialReceptivity
  };
}

/**
 * Set targeting data for ad server
 * @param { [String] } adUnits
 * @param {*} _config
 * @param {*} _userConsent
 *  @return {{ code: { ReceptivityState: String } }}
 */
function getTargetingData(adUnits, _config, _userConsent) {
  logInfo(MODULE, 'getTargetingData');
  if (!adUnits) {
    return {};
  }

  const receptivity = getReceptivity();
  if (!receptivity?.ReceptivityState) {
    return {};
  }

  return adUnits.reduce((targets, code) => {
    targets[code] = receptivity;
    return targets;
  }, {});
}

export const contxtfulSubmodule = {
  name: MODULE_NAME,
  init,
  extractParameters,
  getTargetingData,
};

submodule('realTimeData', contxtfulSubmodule);
