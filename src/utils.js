import {config} from './config.js';

import {EVENTS} from './constants.js';
import {PbPromise} from './utils/promise.js';
import deepAccess from 'dlv/index.js';
import {isArray, isFn, isStr, isPlainObject} from './utils/objects.js';

export { deepAccess };
export { dset as deepSetValue } from 'dset';
export * from './utils/objects.js'
export {getWinDimensions, resetWinDimensions, getScreenOrientation} from './utils/winDimensions.js';
const consoleExists = Boolean(window.console);
const consoleLogExists = Boolean(consoleExists && window.console.log);
const consoleInfoExists = Boolean(consoleExists && window.console.info);
const consoleWarnExists = Boolean(consoleExists && window.console.warn);
const consoleErrorExists = Boolean(consoleExists && window.console.error);

let eventEmitter;

export function _setEventEmitter(emitFn) {
  // called from events.js - this hoop is to avoid circular imports
  eventEmitter = emitFn;
}

function emitEvent(...args) {
  if (eventEmitter != null) {
    eventEmitter(...args);
  }
}

// this allows stubbing of utility functions that are used internally by other utility functions
export const internal = {
  checkCookieSupport,
  createTrackPixelIframeHtml,
  getWindowSelf,
  getWindowTop,
  canAccessWindowTop,
  getWindowLocation,
  insertUserSyncIframe,
  insertElement,
  isFn,
  triggerPixel,
  logError,
  logWarn,
  logMessage,
  logInfo,
  parseQS,
  formatQS,
  deepEqual,
};

const prebidInternal = {};
/**
 * Returns object that is used as internal prebid namespace
 */
export function getPrebidInternal() {
  return prebidInternal;
}

/* utility method to get incremental integer starting from 1 */
var getIncrementalInteger = (function () {
  var count = 0;
  return function () {
    count++;
    return count;
  };
})();

// generate a random string (to be used as a dynamic JSONP callback)
export function getUniqueIdentifierStr() {
  return getIncrementalInteger() + Math.random().toString(16).substr(2);
}

/**
 * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
 * where each x is replaced with a random hexadecimal digit from 0 to f,
 * and y is replaced with a random hexadecimal digit from 8 to b.
 * https://gist.github.com/jed/982883 via node-uuid
 */
export function generateUUID(placeholder) {
  return placeholder
    ? (placeholder ^ _getRandomData() >> placeholder / 4).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
}

/**
 * Returns random data using the Crypto API if available and Math.random if not
 * Method is from https://gist.github.com/jed/982883 like generateUUID, direct link https://gist.github.com/jed/982883#gistcomment-45104
 */
function _getRandomData() {
  if (window && window.crypto && window.crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(1))[0] % 16;
  } else {
    return Math.random() * 16;
  }
}

export function getBidIdParameter(key, paramsObj) {
  return paramsObj?.[key] || '';
}

// parse a query string object passed in bid params
// bid params should be an object such as {key: "value", key1 : "value1"}
// aliases to formatQS
export function parseQueryStringParameters(queryObj) {
  let result = '';
  for (var k in queryObj) {
    if (queryObj.hasOwnProperty(k)) { result += k + '=' + encodeURIComponent(queryObj[k]) + '&'; }
  }
  result = result.replace(/&$/, '');
  return result;
}

// transform an AdServer targeting bids into a query string to send to the adserver
export function transformAdServerTargetingObj(targeting) {
  // we expect to receive targeting for a single slot at a time
  if (targeting && Object.getOwnPropertyNames(targeting).length > 0) {
    return Object.keys(targeting)
      .map(key => `${key}=${encodeURIComponent(targeting[key])}`).join('&');
  } else {
    return '';
  }
}

/**
 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of width, height tuples `[[300, 250]]` or '[[300,250], [970,90]]'
 */
export function sizesToSizeTuples(sizes) {
  if (typeof sizes === 'string') {
    // multiple sizes will be comma-separated
    return sizes
      .split(/\s*,\s*/)
      .map(sz => sz.match(/^(\d+)x(\d+)$/i))
      .filter(match => match)
      .map(([_, w, h]) => [parseInt(w, 10), parseInt(h, 10)])
  } else if (Array.isArray(sizes)) {
    if (isValidGPTSingleSize(sizes)) {
      return [sizes]
    }
    return sizes.filter(isValidGPTSingleSize);
  }
  return [];
}

/**
 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of sizes `["300x250"]` or '['300x250', '970x90']'
 * @param  {(Array.<number[]>|Array.<number>)} sizeObj Input array or double array [300,250] or [[300,250], [728,90]]
 * @return {Array.<string>}  Array of strings like `["300x250"]` or `["300x250", "728x90"]`
 */
export function parseSizesInput(sizeObj) {
  return sizesToSizeTuples(sizeObj).map(sizeTupleToSizeString);
}

export function sizeTupleToSizeString(size) {
  return size[0] + 'x' + size[1]
}

// Parse a GPT style single size array, (i.e [300, 250])
// into an AppNexus style string, (i.e. 300x250)
export function parseGPTSingleSizeArray(singleSize) {
  if (isValidGPTSingleSize(singleSize)) {
    return sizeTupleToSizeString(singleSize);
  }
}

export function sizeTupleToRtbSize(size) {
  return {w: size[0], h: size[1]};
}

// Parse a GPT style single size array, (i.e [300, 250])
// into OpenRTB-compatible (imp.banner.w/h, imp.banner.format.w/h, imp.video.w/h) object(i.e. {w:300, h:250})
export function parseGPTSingleSizeArrayToRtbSize(singleSize) {
  if (isValidGPTSingleSize(singleSize)) {
    return sizeTupleToRtbSize(singleSize)
  }
}

function isValidGPTSingleSize(singleSize) {
  // if we aren't exactly 2 items in this array, it is invalid
  return isArray(singleSize) && singleSize.length === 2 && (!isNaN(singleSize[0]) && !isNaN(singleSize[1]));
}

export function getWindowTop() {
  return window.top;
}

export function getWindowSelf() {
  return window.self;
}

export function getWindowLocation() {
  return window.location;
}

export function getDocument() {
  return document;
}

export function canAccessWindowTop() {
  try {
    if (internal.getWindowTop().location.href) {
      return true;
    }
  } catch (e) {
    return false;
  }
}

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
// eslint-disable-next-line no-restricted-syntax
export function logMessage() {
  if (debugTurnedOn() && consoleLogExists) {
    // eslint-disable-next-line no-console
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
}

// eslint-disable-next-line no-restricted-syntax
export function logInfo() {
  if (debugTurnedOn() && consoleInfoExists) {
    // eslint-disable-next-line no-console
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
}

// eslint-disable-next-line no-restricted-syntax
export function logWarn() {
  if (debugTurnedOn() && consoleWarnExists) {
    // eslint-disable-next-line no-console
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
  emitEvent(EVENTS.AUCTION_DEBUG, { type: 'WARNING', arguments: arguments });
}

// eslint-disable-next-line no-restricted-syntax
export function logError() {
  if (debugTurnedOn() && consoleErrorExists) {
    // eslint-disable-next-line no-console
    console.error.apply(console, decorateLog(arguments, 'ERROR:'));
  }
  emitEvent(EVENTS.AUCTION_DEBUG, { type: 'ERROR', arguments: arguments });
}

export function prefixLog(prefix) {
  function decorate(fn) {
    return function (...args) {
      fn(prefix, ...args);
    }
  }
  return {
    logError: decorate(logError),
    logWarn: decorate(logWarn),
    logMessage: decorate(logMessage),
    logInfo: decorate(logInfo),
  }
}

function decorateLog(args, prefix) {
  args = [].slice.call(args);
  const bidder = config.getCurrentBidder();

  prefix && args.unshift(prefix);
  if (bidder) {
    args.unshift(label('#aaa'));
  }
  args.unshift(label('#3b88c3'));
  args.unshift('%cPrebid' + (bidder ? `%c${bidder}` : ''));
  return args;

  function label(color) {
    return `display: inline-block; color: #fff; background: ${color}; padding: 1px 4px; border-radius: 3px;`
  }
}

export function hasConsoleLogger() {
  return consoleLogExists;
}

export function debugTurnedOn() {
  return !!config.getConfig('debug');
}

export const createIframe = (() => {
  const DEFAULTS = {
    border: '0px',
    hspace: '0',
    vspace: '0',
    marginWidth: '0',
    marginHeight: '0',
    scrolling: 'no',
    frameBorder: '0',
    allowtransparency: 'true'
  }
  return (doc, attrs, style = {}) => {
    const f = doc.createElement('iframe');
    Object.assign(f, Object.assign({}, DEFAULTS, attrs));
    Object.assign(f.style, style);
    return f;
  }
})();

export function createInvisibleIframe() {
  return createIframe(document, {
    id: getUniqueIdentifierStr(),
    width: 0,
    height: 0,
    src: 'about:blank'
  }, {
    display: 'none',
    height: '0px',
    width: '0px',
    border: '0px'
  });
}

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
export function getParameterByName(name) {
  return parseQS(getWindowLocation().search)[name] || '';
}

/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */
export function isEmpty(object) {
  if (!object) return true;
  if (isArray(object) || isStr(object)) {
    return !(object.length > 0);
  }
  return Object.keys(object).length <= 0;
}

/**
 * Return if string is empty, null, or undefined
 * @param str string to test
 * @returns {boolean} if string is empty
 */
export function isEmptyStr(str) {
  return isStr(str) && (!str || str.length === 0);
}

/**
 * Iterate object with the function
 * falls back to es5 `forEach`
 * @param {Array|Object} object
 * @param {Function} fn - The function to execute for each element. It receives three arguments: value, key, and the original object.
 * @returns {void}
 */
export function _each(object, fn) {
  if (isFn(object?.forEach)) return object.forEach(fn, this);
  Object.entries(object || {}).forEach(([k, v]) => fn.call(this, v, k));
}

export function contains(a, obj) {
  return isFn(a?.includes) && a.includes(obj);
}

/**
 * Map an array or object into another array
 * given a function
 * @param {Array|Object} object
 * @param {Function} callback - The function to execute for each element. It receives three arguments: value, key, and the original object.
 * @return {Array}
 */
export function _map(object, callback) {
  if (isFn(object?.map)) return object.map(callback);
  return Object.entries(object || {}).map(([k, v]) => callback(v, k, object))
}

/*
* Inserts an element(elm) as targets child, by default as first child
* @param {HTMLElement} elm
* @param {HTMLElement} [doc]
* @param {HTMLElement} [target]
* @param {Boolean} [asLastChildChild]
* @return {HTML Element}
*/
export function insertElement(elm, doc, target, asLastChildChild) {
  doc = doc || document;
  let parentEl;
  if (target) {
    parentEl = doc.getElementsByTagName(target);
  } else {
    parentEl = doc.getElementsByTagName('head');
  }
  try {
    parentEl = parentEl.length ? parentEl : doc.getElementsByTagName('body');
    if (parentEl.length) {
      parentEl = parentEl[0];
      const insertBeforeEl = asLastChildChild ? null : parentEl.firstChild;
      return parentEl.insertBefore(elm, insertBeforeEl);
    }
  } catch (e) {}
}

/**
 * Returns a promise that completes when the given element triggers a 'load' or 'error' DOM event, or when
 * `timeout` milliseconds have elapsed.
 *
 * @param {HTMLElement} element
 * @param {Number} [timeout]
 * @returns {Promise}
 */
export function waitForElementToLoad(element, timeout) {
  let timer = null;
  return new PbPromise((resolve) => {
    const onLoad = function() {
      element.removeEventListener('load', onLoad);
      element.removeEventListener('error', onLoad);
      if (timer != null) {
        window.clearTimeout(timer);
      }
      resolve();
    };
    element.addEventListener('load', onLoad);
    element.addEventListener('error', onLoad);
    if (timeout != null) {
      timer = window.setTimeout(onLoad, timeout);
    }
  });
}

/**
 * Inserts an image pixel with the specified `url` for cookie sync
 * @param {string} url URL string of the image pixel to load
 * @param  {function} [done] an optional exit callback, used when this usersync pixel is added during an async process
 * @param  {Number} [timeout] an optional timeout in milliseconds for the image to load before calling `done`
 */
export function triggerPixel(url, done, timeout) {
  const img = new Image();
  if (done && internal.isFn(done)) {
    waitForElementToLoad(img, timeout).then(done);
  }
  img.src = url;
}

/**
 * Inserts an empty iframe with the specified `html`, primarily used for tracking purposes
 * (though could be for other purposes)
 * @param {string} htmlCode snippet of HTML code used for tracking purposes
 */
export function insertHtmlIntoIframe(htmlCode) {
  if (!htmlCode) {
    return;
  }
  const iframe = createInvisibleIframe();
  internal.insertElement(iframe, document, 'body');

  ((doc) => {
    doc.open();
    doc.write(htmlCode);
    doc.close();
  })(iframe.contentWindow.document);
}

/**
 * Inserts empty iframe with the specified `url` for cookie sync
 * @param  {string} url URL to be requested
 * @param  {function} [done] an optional exit callback, used when this usersync pixel is added during an async process
 * @param  {Number} [timeout] an optional timeout in milliseconds for the iframe to load before calling `done`
 */
export function insertUserSyncIframe(url, done, timeout) {
  const iframeHtml = internal.createTrackPixelIframeHtml(url, false, 'allow-scripts allow-same-origin');
  const div = document.createElement('div');
  div.innerHTML = iframeHtml;
  const iframe = div.firstChild;
  if (done && internal.isFn(done)) {
    waitForElementToLoad(iframe, timeout).then(done);
  }
  internal.insertElement(iframe, document, 'html', true);
}

/**
 * Creates a snippet of HTML that retrieves the specified `url`
 * @param  {string} url URL to be requested
 * @param encode
 * @return {string}     HTML snippet that contains the img src = set to `url`
 */
export function createTrackPixelHtml(url, encode = encodeURI) {
  if (!url) {
    return '';
  }

  const escapedUrl = encode(url);
  let img = '<div style="position:absolute;left:0px;top:0px;visibility:hidden;">';
  img += '<img src="' + escapedUrl + '"></div>';
  return img;
};

/**
 * encodeURI, but preserves macros of the form '${MACRO}' (e.g. '${AUCTION_PRICE}')
 * @param url
 * @return {string}
 */
export function encodeMacroURI(url) {
  const macros = Array.from(url.matchAll(/\$({[^}]+})/g)).map(match => match[1]);
  return macros.reduce((str, macro) => {
    return str.replace('$' + encodeURIComponent(macro), '$' + macro)
  }, encodeURI(url))
}

/**
 * Creates a snippet of Iframe HTML that retrieves the specified `url`
 * @param  {string} url plain URL to be requested
 * @param  {string} encodeUri boolean if URL should be encoded before inserted. Defaults to true
 * @param  {string} sandbox string if provided the sandbox attribute will be included with the given value
 * @return {string}     HTML snippet that contains the iframe src = set to `url`
 */
export function createTrackPixelIframeHtml(url, encodeUri = true, sandbox = '') {
  if (!url) {
    return '';
  }
  if (encodeUri) {
    url = encodeURI(url);
  }
  if (sandbox) {
    sandbox = `sandbox="${sandbox}"`;
  }

  return `<iframe ${sandbox} id="${getUniqueIdentifierStr()}"
      frameborder="0"
      allowtransparency="true"
      marginheight="0" marginwidth="0"
      width="0" hspace="0" vspace="0" height="0"
      style="height:0px;width:0px;display:none;"
      scrolling="no"
      src="${url}">
    </iframe>`;
}

export function uniques(value, index, arry) {
  return arry.indexOf(value) === index;
}

export function flatten(a, b) {
  return a.concat(b);
}

export function getBidRequest(id, bidderRequests) {
  if (!id) {
    return;
  }
  return bidderRequests.flatMap(br => br.bids)
    .find(bid => ['bidId', 'adId', 'bid_id'].some(prop => bid[prop] === id))
}

export function getValue(obj, key) {
  return obj[key];
}

export function getBidderCodes(adUnits) {
  // this could memoize adUnits
  return adUnits.map(unit => unit.bids.map(bid => bid.bidder)
    .reduce(flatten, [])).reduce(flatten, []).filter((bidder) => typeof bidder !== 'undefined').filter(uniques);
}

export function isGptPubadsDefined() {
  if (window.googletag && isFn(window.googletag.pubads) && isFn(window.googletag.pubads().getSlots)) {
    return true;
  }
}

export function isApnGetTagDefined() {
  if (window.apntag && isFn(window.apntag.getTag)) {
    return true;
  }
}

export const sortByHighestCpm = (a, b) => {
  return b.cpm - a.cpm;
}

/**
 * Fisher–Yates shuffle
 * http://stackoverflow.com/a/6274398
 * https://bost.ocks.org/mike/shuffle/
 * istanbul ignore next
 */
export function shuffle(array) {
  let counter = array.length;

  // while there are elements in the array
  while (counter > 0) {
    // pick a random index
    const index = Math.floor(Math.random() * counter);

    // decrease counter by 1
    counter--;

    // and swap the last element with it
    const temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

export function inIframe() {
  try {
    return internal.getWindowSelf() !== internal.getWindowTop();
  } catch (e) {
    return true;
  }
}

/**
 * https://iabtechlab.com/wp-content/uploads/2016/03/SafeFrames_v1.1_final.pdf
 */
export function isSafeFrameWindow() {
  if (!inIframe()) {
    return false;
  }

  const ws = internal.getWindowSelf();
  return !!(ws.$sf && ws.$sf.ext);
}

/**
 * Returns the result of calling the function $sf.ext.geom() if it exists
 * @see https://iabtechlab.com/wp-content/uploads/2016/03/SafeFrames_v1.1_final.pdf — 5.4 Function $sf.ext.geom
 * @returns {Object | undefined} geometric information about the container
 */
export function getSafeframeGeometry() {
  try {
    const ws = getWindowSelf();
    return (typeof ws.$sf.ext.geom === 'function') ? ws.$sf.ext.geom() : undefined;
  } catch (e) {
    logError('Error getting SafeFrame geometry', e);
    return undefined;
  }
}

export function isSafariBrowser() {
  return /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
}

export function replaceMacros(str, subs) {
  if (!str) return;
  return Object.entries(subs).reduce((str, [key, val]) => {
    return str.replace(new RegExp('\\$\\{' + key + '\\}', 'g'), val || '');
  }, str);
}

export function replaceAuctionPrice(str, cpm) {
  return replaceMacros(str, {AUCTION_PRICE: cpm})
}

export function replaceClickThrough(str, clicktag) {
  if (!str || !clicktag || typeof clicktag !== 'string') return;
  return str.replace(/\${CLICKTHROUGH}/g, clicktag);
}

export function timestamp() {
  return new Date().getTime();
}

/**
 * The returned value represents the time elapsed since the time origin. @see https://developer.mozilla.org/en-US/docs/Web/API/Performance/now
 * @returns {number}
 */
export function getPerformanceNow() {
  return (window.performance && window.performance.now && window.performance.now()) || 0;
}

/**
 * Retuns the difference between `timing.domLoading` and `timing.navigationStart`.
 * This function uses the deprecated `Performance.timing` API and should be removed in future.
 * It has not been updated yet because it is still used in some modules.
 * @deprecated
 * @param {Window} w The window object used to perform the api call. default to window.self
 * @returns {number}
 */
export function getDomLoadingDuration(w) {
  let domLoadingDuration = -1;

  w = w || getWindowSelf();

  const performance = w.performance;

  if (w.performance?.timing) {
    if (w.performance.timing.navigationStart > 0) {
      const val = performance.timing.domLoading - performance.timing.navigationStart;
      if (val > 0) {
        domLoadingDuration = val;
      }
    }
  }

  return domLoadingDuration;
}

/**
 * When the deviceAccess flag config option is false, no cookies should be read or set
 * @returns {boolean}
 */
export function hasDeviceAccess() {
  return config.getConfig('deviceAccess') !== false;
}

/**
 * @returns {(boolean|undefined)}
 */
export function checkCookieSupport() {
  // eslint-disable-next-line no-restricted-properties
  if (window.navigator.cookieEnabled || !!document.cookie.length) {
    return true;
  }
}

/**
 * Given a function, return a function which only executes the original after
 * it's been called numRequiredCalls times.
 *
 * Note that the arguments from the previous calls will *not* be forwarded to the original function.
 * Only the final call's arguments matter.
 *
 * @param {function} func The function which should be executed, once the returned function has been executed
 *   numRequiredCalls times.
 * @param {number} numRequiredCalls The number of times which the returned function needs to be called before
 *   func is.
 */
export function delayExecution(func, numRequiredCalls) {
  if (numRequiredCalls < 1) {
    throw new Error(`numRequiredCalls must be a positive number. Got ${numRequiredCalls}`);
  }
  let numCalls = 0;
  return function () {
    numCalls++;
    if (numCalls === numRequiredCalls) {
      func.apply(this, arguments);
    }
  }
}

/**
 * https://stackoverflow.com/a/34890276/428704
 * @param {Array} xs
 * @param {string} key
 * @returns {Object} {${key_value}: ${groupByArray}, key_value: {groupByArray}}
 */
export function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
}

/**
 * Validates an adunit's `mediaTypes` parameter
 * @param mediaTypes mediaTypes parameter to validate
 * @return If object is valid
 */
export function isValidMediaTypes(mediaTypes) {
  const SUPPORTED_MEDIA_TYPES = ['banner', 'native', 'video', 'audio'];
  const SUPPORTED_STREAM_TYPES = ['instream', 'outstream', 'adpod'];

  const types = Object.keys(mediaTypes);

  if (!types.every(type => SUPPORTED_MEDIA_TYPES.includes(type))) {
    return false;
  }

  if (FEATURES.VIDEO && mediaTypes.video && mediaTypes.video.context) {
    return SUPPORTED_STREAM_TYPES.includes(mediaTypes.video.context);
  }

  return true;
}

/**
 * Returns user configured bidder params from adunit
 * @param {Object} adUnits
 * @param {string} adUnitCode code
 * @param {string} bidder code
 * @return {Array} user configured param for the given bidder adunit configuration
 */
export function getUserConfiguredParams(adUnits, adUnitCode, bidder) {
  return adUnits
    .filter(adUnit => adUnit.code === adUnitCode)
    .flatMap((adUnit) => adUnit.bids)
    .filter((bidderData) => bidderData.bidder === bidder)
    .map((bidderData) => bidderData.params || {});
}

export const compareCodeAndSlot = (slot, adUnitCode) => slot.getAdUnitPath() === adUnitCode || slot.getSlotElementId() === adUnitCode;

/**
 * Returns filter function to match adUnitCode in slot
 * @param slot GoogleTag slot
 * @return filter function
 */
export function isAdUnitCodeMatchingSlot(slot) {
  return (adUnitCode) => compareCodeAndSlot(slot, adUnitCode);
}

/**
 * Constructs warning message for when unsupported bidders are dropped from an adunit
 * @param {Object} adUnit ad unit from which the bidder is being dropped
 * @param {string} bidder bidder code that is not compatible with the adUnit
 * @return {string} warning message to display when condition is met
 */
export function unsupportedBidderMessage(adUnit, bidder) {
  const mediaType = Object.keys(adUnit.mediaTypes || {'banner': 'banner'}).join(', ');

  return `
    ${adUnit.code} is a ${mediaType} ad unit
    containing bidders that don't support ${mediaType}: ${bidder}.
    This bidder won't fetch demand.
  `;
}

/**
 * Returns a new object with undefined properties removed from given object
 * @param obj the object to clean
 */
export function cleanObj(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => typeof v !== 'undefined'))
}

/**
 * Create a new object with selected properties.  Also allows property renaming and transform functions.
 * @param obj the original object
 * @param properties An array of desired properties
 */
export function pick(obj, properties) {
  if (typeof obj !== 'object') {
    return {};
  }
  return properties.reduce((newObj, prop, i) => {
    if (typeof prop === 'function') {
      return newObj;
    }

    let newProp = prop;
    const match = prop.match(/^(.+?)\sas\s(.+?)$/i);

    if (match) {
      prop = match[1];
      newProp = match[2];
    }

    let value = obj[prop];
    if (typeof properties[i + 1] === 'function') {
      value = properties[i + 1](value, newObj);
    }
    if (typeof value !== 'undefined') {
      newObj[newProp] = value;
    }

    return newObj;
  }, {});
}

export function parseQS(query) {
  return !query ? {} : query
    .replace(/^\?/, '')
    .split('&')
    .reduce((acc, criteria) => {
      let [k, v] = criteria.split('=');
      if (/\[\]$/.test(k)) {
        k = k.replace('[]', '');
        acc[k] = acc[k] || [];
        acc[k].push(v);
      } else {
        acc[k] = v || '';
      }
      return acc;
    }, {});
}

export function formatQS(query) {
  return Object
    .keys(query)
    .map(k => Array.isArray(query[k])
      ? query[k].map(v => `${k}[]=${v}`).join('&')
      : `${k}=${query[k]}`)
    .join('&');
}

export function parseUrl(url, options) {
  const parsed = document.createElement('a');
  if (options && 'noDecodeWholeURL' in options && options.noDecodeWholeURL) {
    parsed.href = url;
  } else {
    parsed.href = decodeURIComponent(url);
  }
  // in window.location 'search' is string, not object
  const qsAsString = (options && 'decodeSearchAsString' in options && options.decodeSearchAsString);
  return {
    href: parsed.href,
    protocol: (parsed.protocol || '').replace(/:$/, ''),
    hostname: parsed.hostname,
    port: +parsed.port,
    pathname: parsed.pathname.replace(/^(?!\/)/, '/'),
    search: (qsAsString) ? parsed.search : internal.parseQS(parsed.search || ''),
    hash: (parsed.hash || '').replace(/^#/, ''),
    host: parsed.host || window.location.host
  };
}

export function buildUrl(obj) {
  return (obj.protocol || 'http') + '://' +
    (obj.host ||
      obj.hostname + (obj.port ? `:${obj.port}` : '')) +
    (obj.pathname || '') +
    (obj.search ? `?${internal.formatQS(obj.search || '')}` : '') +
    (obj.hash ? `#${obj.hash}` : '');
}

/**
 * This function deeply compares two objects checking for their equivalence.
 * @param {Object} obj1
 * @param {Object} obj2
 * @param {Object} [options] - Options for comparison.
 * @param {boolean} [options.checkTypes=false] - If set, two objects with identical properties but different constructors will *not* be considered equivalent.
 * @returns {boolean} - Returns `true` if the objects are equivalent, `false` otherwise.
 */
export function deepEqual(obj1, obj2, { checkTypes = false } = {}) {
  // Quick reference check
  if (obj1 === obj2) return true;

  // If either is null or not an object, do a direct equality check
  if (
    typeof obj1 !== 'object' || obj1 === null ||
    typeof obj2 !== 'object' || obj2 === null
  ) {
    return false;
  }
  // Cache the Array checks
  const isArr1 = Array.isArray(obj1);
  const isArr2 = Array.isArray(obj2);
  // Special case: both are arrays
  if (isArr1 && isArr2) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!deepEqual(obj1[i], obj2[i], { checkTypes })) {
        return false;
      }
    }
    return true;
  } else if (isArr1 || isArr2) {
    return false;
  }

  // If we’re checking types, compare constructors (e.g., plain object vs. Date)
  if (checkTypes && obj1.constructor !== obj2.constructor) {
    return false;
  }

  // Compare object keys. Cache keys for both to avoid repeated calls.
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    // If `obj2` doesn't have this key or sub-values aren't equal, bail out.
    if (!Object.prototype.hasOwnProperty.call(obj2, key)) {
      return false;
    }
    if (!deepEqual(obj1[key], obj2[key], { checkTypes })) {
      return false;
    }
  }

  return true;
}

export function mergeDeep(target, ...sources) {
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    if (!isPlainObject(source)) {
      continue;
    }
    mergeDeepHelper(target, source);
  }
  return target;
}

function mergeDeepHelper(target, source) {
  // quick check
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return;
  }

  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key === '__proto__' || key === 'constructor') {
      continue;
    }
    const val = source[key];

    if (isPlainObject(val)) {
      if (!target[key]) {
        target[key] = {};
      }
      mergeDeepHelper(target[key], val);
    } else if (Array.isArray(val)) {
      if (!Array.isArray(target[key])) {
        target[key] = [...val];
      } else {
        // deduplicate
        val.forEach(obj => {
          if (!target[key].some(item => deepEqual(item, obj))) {
            target[key].push(obj);
          }
        });
      }
    } else {
      // direct assignment
      target[key] = val;
    }
  }
}

/**
 * returns a hash of a string using a fast algorithm
 * source: https://stackoverflow.com/a/52171480/845390
 * @param str
 * @param seed (optional)
 * @returns {string}
 */
export function cyrb53Hash(str, seed = 0) {
  // IE doesn't support imul
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/imul#Polyfill
  const imul = function(opA, opB) {
    if (isFn(Math.imul)) {
      return Math.imul(opA, opB);
    } else {
      opB |= 0; // ensure that opB is an integer. opA will automatically be coerced.
      // floating points give us 53 bits of precision to work with plus 1 sign bit
      // automatically handled for our convienence:
      // 1. 0x003fffff /*opA & 0x000fffff*/ * 0x7fffffff /*opB*/ = 0x1fffff7fc00001
      //    0x1fffff7fc00001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
      var result = (opA & 0x003fffff) * opB;
      // 2. We can remove an integer coersion from the statement above because:
      //    0x1fffff7fc00001 + 0xffc00000 = 0x1fffffff800001
      //    0x1fffffff800001 < Number.MAX_SAFE_INTEGER /*0x1fffffffffffff*/
      if (opA & 0xffc00000) result += (opA & 0xffc00000) * opB | 0;
      return result | 0;
    }
  };

  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = imul(h1 ^ ch, 2654435761);
    h2 = imul(h2 ^ ch, 1597334677);
  }
  h1 = imul(h1 ^ (h1 >>> 16), 2246822507) ^ imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = imul(h2 ^ (h2 >>> 16), 2246822507) ^ imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString();
}

/**
 * returns the result of `JSON.parse(data)`, or undefined if that throws an error.
 * @param data
 * @returns {any}
 */
export function safeJSONParse(data) {
  try {
    return JSON.parse(data);
  } catch (e) {}
}

export function safeJSONEncode(data) {
  try {
    return JSON.stringify(data);
  } catch (e) {
    return '';
  }
}

/**
 * Returns a memoized version of `fn`.
 *
 * @param fn
 * @param key cache key generator, invoked with the same arguments passed to `fn`.
 *        By default, the first argument is used as key.
 * @return {*}
 */
export function memoize(fn, key = function (arg) { return arg; }) {
  const cache = new Map();
  const memoized = function () {
    const cacheKey = key.apply(this, arguments);
    if (!cache.has(cacheKey)) {
      cache.set(cacheKey, fn.apply(this, arguments));
    }
    return cache.get(cacheKey);
  }
  memoized.clear = cache.clear.bind(cache);
  return memoized;
}

/**
 * Returns a Unix timestamp for given time value and unit.
 * @param {number} timeValue numeric value, defaults to 0 (which means now)
 * @param {string} timeUnit defaults to days (or 'd'), use 'm' for minutes. Any parameter that isn't 'd' or 'm' will return Date.now().
 * @returns {number}
 */
export function getUnixTimestampFromNow(timeValue = 0, timeUnit = 'd') {
  const acceptableUnits = ['m', 'd'];
  if (acceptableUnits.indexOf(timeUnit) < 0) {
    return Date.now();
  }
  const multiplication = timeValue / (timeUnit === 'm' ? 1440 : 1);
  return Date.now() + (timeValue && timeValue > 0 ? (1000 * 60 * 60 * 24 * multiplication) : 0);
}

/**
 * Converts given object into an array, so {key: 1, anotherKey: 'fred', third: ['fred']} is turned
 * into [{key: 1}, {anotherKey: 'fred'}, {third: ['fred']}]
 * @param {Object} obj the object
 * @returns {Array}
 */
export function convertObjectToArray(obj) {
  return Object.keys(obj).map(key => {
    return {[key]: obj[key]};
  });
}

/**
 * Sets dataset attributes on a script
 * @param {HTMLScriptElement} script
 * @param {object} attributes
 */
export function setScriptAttributes(script, attributes) {
  Object.entries(attributes).forEach(([k, v]) => script.setAttribute(k, v))
}

/**
 * Perform a binary search for `el` on an ordered array `arr`.
 *
 * @returns the lowest nonnegative integer I that satisfies:
 *   key(arr[i]) >= key(el) for each i between I and arr.length
 *
 *   (if one or more matches are found for `el`, returns the index of the first;
 *   if the element is not found, return the index of the first element that's greater;
 *   if no greater element exists, return `arr.length`)
 */
export function binarySearch(arr, el, key = (el) => el) {
  let left = 0;
  let right = arr.length && arr.length - 1;
  const target = key(el);
  while (right - left > 1) {
    const middle = left + Math.round((right - left) / 2);
    if (target > key(arr[middle])) {
      left = middle;
    } else {
      right = middle;
    }
  }
  while (arr.length > left && target > key(arr[left])) {
    left++;
  }
  return left;
}

/**
 * Checks if an object has non-serializable properties.
 * Non-serializable properties are functions and RegExp objects.
 *
 * @param {Object} obj - The object to check.
 * @param {Set} checkedObjects - A set of properties that have already been checked.
 * @returns {boolean} - Returns true if the object has non-serializable properties, false otherwise.
 */
export function hasNonSerializableProperty(obj, checkedObjects = new Set()) {
  for (const key in obj) {
    const value = obj[key];
    const type = typeof value;

    if (
      value === undefined ||
      type === 'function' ||
      type === 'symbol' ||
      value instanceof RegExp ||
      value instanceof Map ||
      value instanceof Set ||
      value instanceof Date ||
      (value !== null && type === 'object' && value.hasOwnProperty('toJSON'))
    ) {
      return true;
    }
    if (value !== null && type === 'object' && value.constructor === Object) {
      if (checkedObjects.has(value)) {
        // circular reference, means we have a non-serializable property
        return true;
      }
      checkedObjects.add(value);
      if (hasNonSerializableProperty(value, checkedObjects)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Returns the value of a nested property in an array of objects.
 *
 * @param {Array} collection - Array of objects.
 * @param {String} key - Key of nested property.
 * @returns {any|undefined} - Value of nested property.
 */
export function setOnAny(collection, key) {
  for (let i = 0, result; i < collection.length; i++) {
    result = deepAccess(collection[i], key);
    if (result) {
      return result;
    }
  }
  return undefined;
}

export function extractDomainFromHost(pageHost) {
  let domain = null;
  try {
    const domains = /[-\w]+\.([-\w]+|[-\w]{3,}|[-\w]{1,3}\.[-\w]{2})$/i.exec(pageHost);
    if (domains != null && domains.length > 0) {
      domain = domains[0];
      for (let i = 1; i < domains.length; i++) {
        if (domains[i].length > domain.length) {
          domain = domains[i];
        }
      }
    }
  } catch (e) {
    domain = null;
  }
  return domain;
}

export function triggerNurlWithCpm(bid, cpm) {
  if (isStr(bid.nurl) && bid.nurl !== '') {
    bid.nurl = bid.nurl.replace(
      /\${AUCTION_PRICE}/,
      cpm
    );
    triggerPixel(bid.nurl);
  }
}

// To ensure that isGzipCompressionSupported() doesn’t become an overhead, we have used memoization to cache the result after the first execution.
// This way, even if the function is called multiple times, it will only perform the actual check once and return the cached result in subsequent calls.
export const isGzipCompressionSupported = (function () {
  let cachedResult; // Store the result

  return function () {
    if (cachedResult !== undefined) {
      return cachedResult; // Return cached result if already computed
    }

    try {
      if (typeof window.CompressionStream === 'undefined') {
        cachedResult = false;
      } else {
        (() => new window.CompressionStream('gzip'))();
        cachedResult = true;
      }
    } catch (error) {
      cachedResult = false;
    }

    return cachedResult;
  };
})();

// Make sure to use isGzipCompressionSupported before calling this function
export async function compressDataWithGZip(data) {
  if (typeof data !== 'string') { // TextEncoder (below) expects a string
    data = JSON.stringify(data);
  }

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const compressedStream = new Blob([encodedData])
    .stream()
    .pipeThrough(new window.CompressionStream('gzip'));

  const compressedBlob = await new Response(compressedStream).blob();
  const compressedArrayBuffer = await compressedBlob.arrayBuffer();
  return new Uint8Array(compressedArrayBuffer);
}
