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
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';

const MODULE_NAME = 'contxtful';
const MODULE = `${MODULE_NAME}RtdProvider`;

const CONTXTFUL_HOSTNAME_DEFAULT = 'api.receptivity.io';
const CONTXTFUL_DEFER_DEFAULT = 0;

const storageManager = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

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

function getItemFromSessionStorage(key) {
  try {
    return storageManager.getDataFromSessionStorage(key);
  } catch (error) {
    logError(MODULE, error);
  }
}

function loadSessionReceptivity(requester) {
  let sessionStorageValue = getItemFromSessionStorage(requester);
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
}

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
    initCustomer(config);

    observeLastCursorPosition();

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

  const hostname = config?.params?.hostname || CONTXTFUL_HOSTNAME_DEFAULT;
  const defer = config?.params?.defer || CONTXTFUL_DEFER_DEFAULT;

  return { version, customer, hostname, defer };
}

/**
 * Initialize sub module for a customer.
 * This will load the external resources for the sub module.
 * @param { String } config
 */
function initCustomer(config) {
  const { version, customer, hostname, defer } = extractParameters(config);
  const CONNECTOR_URL = buildUrl({
    protocol: 'https',
    host: hostname,
    pathname: `/${version}/prebid/${customer}/connector/rxConnector.js`,
  });

  addConnectorEventListener(customer, config);

  const loadScript = () => loadExternalScript(CONNECTOR_URL, MODULE_TYPE_RTD, MODULE_NAME);
  // Optionally defer the loading of the script
  if (Number.isFinite(defer) && defer > 0) {
    setTimeout(loadScript, defer);
  } else {
    loadScript();
  }
}

/**
 * Add event listener to the script tag for the expected events from the external script.
 * @param { String } tagId
 * @param { String } prebidConfig
 */
function addConnectorEventListener(tagId, prebidConfig) {
  window.addEventListener(
    'rxConnectorIsReady',
    async ({ detail: { [tagId]: rxConnector } }) => {
      if (!rxConnector) {
        return;
      }
      // Fetch the customer configuration
      const { rxApiBuilder, fetchConfig } = rxConnector;
      let config = await fetchConfig(tagId);
      if (!config) {
        return;
      }
      config['prebid'] = prebidConfig || {};
      rxApi = await rxApiBuilder(config);

      // Remove listener now that we can use rxApi.
      removeListeners();
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
    const rx =
      getRxEngineReceptivity(requester) ||
      loadSessionReceptivity(requester) ||
      {};

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
    }
    onDone();
  }

  logInfo(MODULE, 'getBidRequestData');
  const bidders = config?.params?.bidders || [];
  if (isEmpty(bidders) || !isArray(bidders)) {
    onReturn();
    return;
  }

  let fromApi = rxApi?.receptivityBatched?.(bidders) || {};
  let fromStorage = prepareBatch(bidders, (bidder) => loadSessionReceptivity(`${config?.params?.customer}_${bidder}`));

  let sources = [fromStorage, fromApi];
  if (isFirstBidRequestCall) {
    sources.reverse();
  }

  let rxBatch = Object.assign(...sources);

  let singlePointEvents;
  if (isEmpty(rxBatch)) {
    singlePointEvents = btoa(JSON.stringify({ ui: getUiEvents() }));
  }

  bidders
    .forEach(bidderCode => {
      const ortb2 = {
        user: {
          data: [
            {
              name: MODULE_NAME,
              ext: {
                rx: rxBatch[bidderCode],
                events: singlePointEvents,
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
}

function getUiEvents() {
  return {
    position: lastCursorPosition,
    screen: getScreen(),
  };
}

function getScreen() {
  function getInnerSize() {
    let w = window?.innerWidth;
    let h = window?.innerHeight;

    if (w && h) {
      return [w, h];
    }
  }

  function getDocumentSize() {
    let body = window?.document?.body;
    let w = body.clientWidth;
    let h = body.clientHeight;

    if (w && h) {
      return [w, h];
    }
  }

  // If we cannot access or cast the window dimensions, we get None.
  // If we cannot collect the size from the window we try to use the root document dimensions
  let [width, height] = getInnerSize() || getDocumentSize() || [0, 0];
  let topLeft = { x: window.scrollX, y: window.scrollY };

  return {
    topLeft,
    width,
    height,
    timestampMs: performance.now(),
  };
}

let lastCursorPosition;

function observeLastCursorPosition() {
  function pointerEventToPosition(event) {
    lastCursorPosition = {
      x: event.clientX,
      y: event.clientY,
      timestampMs: performance.now()
    };
  }

  function touchEventToPosition(event) {
    let touch = event.touches.item(0);
    if (!touch) {
      return;
    }

    lastCursorPosition = {
      x: touch.clientX,
      y: touch.clientY,
      timestampMs: performance.now()
    };
  }

  addListener('pointermove', pointerEventToPosition);
  addListener('touchmove', touchEventToPosition);
}

let listeners = {};
function addListener(name, listener) {
  listeners[name] = listener;

  window.addEventListener(name, listener);
}

function removeListeners() {
  for (const name in listeners) {
    window.removeEventListener(name, listeners[name]);
    delete listeners[name];
  }
}

export const contxtfulSubmodule = {
  name: MODULE_NAME,
  init,
  getTargetingData,
  getBidRequestData,
};

submodule('realTimeData', contxtfulSubmodule);
