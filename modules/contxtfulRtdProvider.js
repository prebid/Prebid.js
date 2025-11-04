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
  generateUUID,
  getWinDimensions,
  canAccessWindowTop,
  deepAccess,
  getSafeframeGeometry,
  getWindowSelf,
  getWindowTop,
  inIframe,
  isSafeFrameWindow,
} from '../src/utils.js';
import { loadExternalScript } from '../src/adloader.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

// Constants
const MODULE_NAME = 'contxtful';
const MODULE = `${MODULE_NAME}RtdProvider`;

const CONTXTFUL_HOSTNAME_DEFAULT = 'api.receptivity.io';
const CONTXTFUL_DEFER_DEFAULT = 0;

// Functions
let _sm;
function sm() {
  if (_sm == null) {
    _sm = generateUUID();
  }
  return _sm;
}

const storageManager = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

let rxApi = null;

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
  const sessionStorageValue = getItemFromSessionStorage(requester);
  if (!sessionStorageValue) {
    return null;
  }

  try {
    // Check expiration of the cached value
    const sessionStorageReceptivity = JSON.parse(sessionStorageValue);
    const expiration = parseInt(sessionStorageReceptivity?.exp);
    if (expiration < new Date().getTime()) {
      return null;
    }

    const rx = sessionStorageReceptivity?.rx;
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

  const loadScript = () => loadExternalScript(CONNECTOR_URL, MODULE_TYPE_RTD, MODULE_NAME, undefined, undefined, { 'data-sm': sm() });
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
      const config = await fetchConfig(tagId);
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

function getVisibilityStateElement(domElement, windowTop) {
  if ('checkVisibility' in domElement) {
    return domElement.checkVisibility();
  }

  const elementCss = windowTop.getComputedStyle(domElement, null);
  return elementCss.display !== 'none';
}

function getElementFromTopWindowRecurs(element, currentWindow) {
  try {
    if (getWindowTop() === currentWindow) {
      return element;
    } else {
      const frame = currentWindow.frameElement;
      const frameClientRect = getBoundingClientRect(frame);
      const elementClientRect = getBoundingClientRect(element);
      if (frameClientRect.width !== elementClientRect.width || frameClientRect.height !== elementClientRect.height) {
        return undefined;
      }
      return getElementFromTopWindowRecurs(frame, currentWindow.parent);
    }
  } catch (err) {
    logError(MODULE, err);
    return undefined;
  }
}

function getDivIdPosition(divId) {
  if (!isSafeFrameWindow() && !canAccessWindowTop()) {
    return {};
  }

  const position = {};

  if (isSafeFrameWindow()) {
    const { self } = getSafeframeGeometry() ?? {};

    if (!self) {
      return {};
    }

    position.x = Math.round(self.t);
    position.y = Math.round(self.l);
  } else {
    try {
      // window.top based computing
      const wt = getWindowTop();
      const d = wt.document;

      let domElement;

      if (inIframe() === true) {
        const ws = getWindowSelf();
        const currentElement = ws.document.getElementById(divId);
        domElement = getElementFromTopWindowRecurs(currentElement, ws);
      } else {
        domElement = wt.document.getElementById(divId);
      }

      if (!domElement) {
        return {};
      }

      const box = getBoundingClientRect(domElement);
      const docEl = d.documentElement;
      const body = d.body;
      const clientTop = (d.clientTop ?? body.clientTop) ?? 0;
      const clientLeft = (d.clientLeft ?? body.clientLeft) ?? 0;
      const scrollTop = (wt.scrollY ?? docEl.scrollTop) ?? body.scrollTop;
      const scrollLeft = (wt.scrollX ?? docEl.scrollLeft) ?? body.scrollLeft;

      position.visibility = getVisibilityStateElement(domElement, wt);
      position.x = Math.round(box.left + scrollLeft - clientLeft);
      position.y = Math.round(box.top + scrollTop - clientTop);
    } catch (err) {
      logError(MODULE, err);
      return {};
    }
  }

  return position;
}

function tryGetDivIdPosition(divIdMethod) {
  const divId = divIdMethod();
  if (divId) {
    const divIdPosition = getDivIdPosition(divId);
    if (divIdPosition.x !== undefined && divIdPosition.y !== undefined) {
      return divIdPosition;
    }
  }
  return undefined;
}

function tryMultipleDivIdPositions(adUnit) {
  const divMethods = [
    // ortb2\
    () => {
      adUnit.ortb2Imp = adUnit.ortb2Imp || {};
      const ortb2Imp = deepAccess(adUnit, 'ortb2Imp');
      return deepAccess(ortb2Imp, 'ext.data.divId');
    },
    // gpt
    () => getGptSlotInfoForAdUnitCode(adUnit.code).divId,
    // adunit code
    () => adUnit.code
  ];

  for (const divMethod of divMethods) {
    const divPosition = tryGetDivIdPosition(divMethod);
    if (divPosition) {
      return divPosition;
    }
  }
}

function tryGetAdUnitPosition(adUnit) {
  const adUnitPosition = {};
  adUnit.ortb2Imp = adUnit.ortb2Imp || {};

  // try to get position with the divId
  const divIdPosition = tryMultipleDivIdPositions(adUnit);
  if (divIdPosition) {
    adUnitPosition.p = { x: divIdPosition.x, y: divIdPosition.y };
    adUnitPosition.v = divIdPosition.visibility;
    adUnitPosition.t = 'div';
    return adUnitPosition;
  }

  // try to get IAB position
  const iabPos = adUnit?.mediaTypes?.banner?.pos;
  if (iabPos !== undefined) {
    adUnitPosition.p = iabPos;
    adUnitPosition.t = 'iab';
    return adUnitPosition;
  }

  return undefined;
}

function getAdUnitPositions(bidReqConfig) {
  const adUnits = bidReqConfig.adUnits || [];
  const adUnitPositions = {};

  for (const adUnit of adUnits) {
    const adUnitPosition = tryGetAdUnitPosition(adUnit);
    if (adUnitPosition) {
      adUnitPositions[adUnit.code] = adUnitPosition;
    }
  }

  return adUnitPositions;
}

/**
 * @param {Object} reqBidsConfigObj Bid request configuration object
 * @param {Function} onDone Called on completion
 * @param {Object} config Configuration for Contxtful RTD module
 * @param {Object} userConsent
 */
function getBidRequestData(reqBidsConfigObj, onDone, config, userConsent) {
  function onReturn() {
    onDone();
  }
  logInfo(MODULE, 'getBidRequestData');
  const bidders = config?.params?.bidders || [];
  if (isEmpty(bidders) || !isArray(bidders)) {
    onReturn();
    return;
  }

  let ortb2Fragment;
  const getContxtfulOrtb2Fragment = rxApi?.getOrtb2Fragment;
  if (typeof (getContxtfulOrtb2Fragment) === 'function') {
    ortb2Fragment = getContxtfulOrtb2Fragment(bidders, reqBidsConfigObj);
  } else {
    const adUnitsPositions = getAdUnitPositions(reqBidsConfigObj);

    const fromApi = rxApi?.receptivityBatched?.(bidders) || {};
    const fromStorage = prepareBatch(bidders, (bidder) => loadSessionReceptivity(`${config?.params?.customer}_${bidder}`));

    const sources = [fromStorage, fromApi];

    const rxBatch = Object.assign(...sources);

    const singlePointEvents = btoa(JSON.stringify({ ui: getUiEvents() }));
    ortb2Fragment = {};
    ortb2Fragment.bidder = Object.fromEntries(
      bidders
        .map(bidderCode => {
          return [bidderCode, {
            user: {
              data: [
                {
                  name: MODULE_NAME,
                  ext: {
                    rx: rxBatch[bidderCode],
                    events: singlePointEvents,
                    pos: btoa(JSON.stringify(adUnitsPositions)),
                    sm: sm(),
                    params: {
                      ev: config.params?.version,
                      ci: config.params?.customer,
                    },
                  },
                },
              ],
            },
          }
          ]
        }));
  }

  mergeDeep(reqBidsConfigObj.ortb2Fragments, ortb2Fragment);

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
    const { innerWidth, innerHeight } = getWinDimensions();

    const w = innerWidth;
    const h = innerHeight;

    if (w && h) {
      return [w, h];
    }
  }

  function getDocumentSize() {
    const windowDimensions = getWinDimensions();

    const w = windowDimensions.document.body.clientWidth;
    const h = windowDimensions.document.body.clientHeight;

    if (w && h) {
      return [w, h];
    }
  }

  // If we cannot access or cast the window dimensions, we get None.
  // If we cannot collect the size from the window we try to use the root document dimensions
  const [width, height] = getInnerSize() || getDocumentSize() || [0, 0];
  const topLeft = { x: window.scrollX, y: window.scrollY };

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
    const touch = event.touches.item(0);
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

const listeners = {};
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
