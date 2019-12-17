import { config } from './config';
import clone from 'just-clone';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';

const CONSTANTS = require('./constants');

export { default as deepAccess } from 'dlv/index';
export { default as deepSetValue } from 'dset';

var tArr = 'Array';
var tStr = 'String';
var tFn = 'Function';
var tNumb = 'Number';
var tObject = 'Object';
var tBoolean = 'Boolean';
var toString = Object.prototype.toString;
let consoleExists = Boolean(window.console);
let consoleLogExists = Boolean(consoleExists && window.console.log);
let consoleInfoExists = Boolean(consoleExists && window.console.info);
let consoleWarnExists = Boolean(consoleExists && window.console.warn);
let consoleErrorExists = Boolean(consoleExists && window.console.error);

// this allows stubbing of utility functions that are used internally by other utility functions
export const internal = {
  checkCookieSupport,
  createTrackPixelIframeHtml,
  getWindowSelf,
  getWindowTop,
  getWindowLocation,
  insertUserSyncIframe,
  insertElement,
  isFn,
  triggerPixel,
  logError,
  logWarn,
  logMessage,
  logInfo
};

var uniqueRef = {};
export let bind = function(a, b) { return b; }.bind(null, 1, uniqueRef)() === uniqueRef
  ? Function.prototype.bind
  : function(bind) {
    var self = this;
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
      return self.apply(bind, args.concat(Array.prototype.slice.call(arguments)));
    };
  };

/*
 *   Substitutes into a string from a given map using the token
 *   Usage
 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
 *   var map = {};
 *   map['replace'] = 'it was subbed';
 *   map['something'] = 'something else';
 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
 */
export function replaceTokenInString(str, map, token) {
  _each(map, function (value, key) {
    value = (value === undefined) ? '' : value;

    var keyString = token + key.toUpperCase() + token;
    var re = new RegExp(keyString, 'g');

    str = str.replace(re, value);
  });

  return str;
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
  if (paramsObj && paramsObj[key]) {
    return paramsObj[key];
  }

  return '';
}

export function tryAppendQueryString(existingUrl, key, value) {
  if (value) {
    return existingUrl += key + '=' + encodeURIComponent(value) + '&';
  }

  return existingUrl;
}

// parse a query string object passed in bid params
// bid params should be an object such as {key: "value", key1 : "value1"}
export function parseQueryStringParameters(queryObj) {
  let result = '';
  for (var k in queryObj) {
    if (queryObj.hasOwnProperty(k)) { result += k + '=' + encodeURIComponent(queryObj[k]) + '&'; }
  }

  return result;
}

// transform an AdServer targeting bids into a query string to send to the adserver
export function transformAdServerTargetingObj(targeting) {
  // we expect to receive targeting for a single slot at a time
  if (targeting && Object.getOwnPropertyNames(targeting).length > 0) {
    return getKeys(targeting)
      .map(key => `${key}=${encodeURIComponent(getValue(targeting, key))}`).join('&');
  } else {
    return '';
  }
}

/**
 * Read an adUnit object and return the sizes used in an [[728, 90]] format (even if they had [728, 90] defined)
 * Preference is given to the `adUnit.mediaTypes.banner.sizes` object over the `adUnit.sizes`
 * @param {object} adUnit one adUnit object from the normal list of adUnits
 * @returns {Array.<number[]>} array of arrays containing numeric sizes
 */
export function getAdUnitSizes(adUnit) {
  if (!adUnit) {
    return;
  }

  let sizes = [];
  if (adUnit.mediaTypes && adUnit.mediaTypes.banner && Array.isArray(adUnit.mediaTypes.banner.sizes)) {
    let bannerSizes = adUnit.mediaTypes.banner.sizes;
    if (Array.isArray(bannerSizes[0])) {
      sizes = bannerSizes;
    } else {
      sizes.push(bannerSizes);
    }
  // TODO - remove this else block when we're ready to deprecate adUnit.sizes for bidders
  } else if (Array.isArray(adUnit.sizes)) {
    if (Array.isArray(adUnit.sizes[0])) {
      sizes = adUnit.sizes;
    } else {
      sizes.push(adUnit.sizes);
    }
  }
  return sizes;
}

/**
 * Parse a GPT-Style general size Array like `[[300, 250]]` or `"300x250,970x90"` into an array of sizes `["300x250"]` or '['300x250', '970x90']'
 * @param  {(Array.<number[]>|Array.<number>)} sizeObj Input array or double array [300,250] or [[300,250], [728,90]]
 * @return {Array.<string>}  Array of strings like `["300x250"]` or `["300x250", "728x90"]`
 */
export function parseSizesInput(sizeObj) {
  var parsedSizes = [];

  // if a string for now we can assume it is a single size, like "300x250"
  if (typeof sizeObj === 'string') {
    // multiple sizes will be comma-separated
    var sizes = sizeObj.split(',');

    // regular expression to match strigns like 300x250
    // start of line, at least 1 number, an "x" , then at least 1 number, and the then end of the line
    var sizeRegex = /^(\d)+x(\d)+$/i;
    if (sizes) {
      for (var curSizePos in sizes) {
        if (hasOwn(sizes, curSizePos) && sizes[curSizePos].match(sizeRegex)) {
          parsedSizes.push(sizes[curSizePos]);
        }
      }
    }
  } else if (typeof sizeObj === 'object') {
    var sizeArrayLength = sizeObj.length;

    // don't process empty array
    if (sizeArrayLength > 0) {
      // if we are a 2 item array of 2 numbers, we must be a SingleSize array
      if (sizeArrayLength === 2 && typeof sizeObj[0] === 'number' && typeof sizeObj[1] === 'number') {
        parsedSizes.push(parseGPTSingleSizeArray(sizeObj));
      } else {
        // otherwise, we must be a MultiSize array
        for (var i = 0; i < sizeArrayLength; i++) {
          parsedSizes.push(parseGPTSingleSizeArray(sizeObj[i]));
        }
      }
    }
  }

  return parsedSizes;
}

// Parse a GPT style single size array, (i.e [300, 250])
// into an AppNexus style string, (i.e. 300x250)
export function parseGPTSingleSizeArray(singleSize) {
  if (isValidGPTSingleSize(singleSize)) {
    return singleSize[0] + 'x' + singleSize[1];
  }
}

// Parse a GPT style single size array, (i.e [300, 250])
// into OpenRTB-compatible (imp.banner.w/h, imp.banner.format.w/h, imp.video.w/h) object(i.e. {w:300, h:250})
export function parseGPTSingleSizeArrayToRtbSize(singleSize) {
  if (isValidGPTSingleSize(singleSize)) {
    return {w: singleSize[0], h: singleSize[1]};
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

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
export function logMessage() {
  if (debugTurnedOn() && consoleLogExists) {
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
}

export function logInfo() {
  if (debugTurnedOn() && consoleInfoExists) {
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
}

export function logWarn() {
  if (debugTurnedOn() && consoleWarnExists) {
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
}

export function logError() {
  if (debugTurnedOn() && consoleErrorExists) {
    console.error.apply(console, decorateLog(arguments, 'ERROR:'));
  }
}

function decorateLog(args, prefix) {
  args = [].slice.call(args);
  prefix && args.unshift(prefix);
  args.unshift('display: inline-block; color: #fff; background: #3b88c3; padding: 1px 4px; border-radius: 3px;');
  args.unshift('%cPrebid');
  return args;
}

export function hasConsoleLogger() {
  return consoleLogExists;
}

export function debugTurnedOn() {
  return !!config.getConfig('debug');
}

export function createInvisibleIframe() {
  var f = document.createElement('iframe');
  f.id = getUniqueIdentifierStr();
  f.height = 0;
  f.width = 0;
  f.border = '0px';
  f.hspace = '0';
  f.vspace = '0';
  f.marginWidth = '0';
  f.marginHeight = '0';
  f.style.border = '0';
  f.scrolling = 'no';
  f.frameBorder = '0';
  f.src = 'about:blank';
  f.style.display = 'none';
  return f;
}

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
export function getParameterByName(name) {
  var regexS = '[\\?&]' + name + '=([^&#]*)';
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if (results === null) {
    return '';
  }

  return decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * This function validates paramaters.
 * @param  {Object} paramObj          [description]
 * @param  {string[]} requiredParamsArr [description]
 * @return {boolean}                   Bool if paramaters are valid
 */
export function hasValidBidRequest(paramObj, requiredParamsArr, adapter) {
  var found = false;

  function findParam(value, key) {
    if (key === requiredParamsArr[i]) {
      found = true;
    }
  }

  for (var i = 0; i < requiredParamsArr.length; i++) {
    found = false;

    _each(paramObj, findParam);

    if (!found) {
      logError('Params are missing for bid request. One of these required paramaters are missing: ' + requiredParamsArr, adapter);
      return false;
    }
  }

  return true;
}

// Handle addEventListener gracefully in older browsers
export function addEventHandler(element, event, func) {
  if (element.addEventListener) {
    element.addEventListener(event, func, true);
  } else if (element.attachEvent) {
    element.attachEvent('on' + event, func);
  }
}
/**
 * Return if the object is of the
 * given type.
 * @param {*} object to test
 * @param {String} _t type string (e.g., Array)
 * @return {Boolean} if object is of type _t
 */
export function isA(object, _t) {
  return toString.call(object) === '[object ' + _t + ']';
}

export function isFn(object) {
  return isA(object, tFn);
}

export function isStr(object) {
  return isA(object, tStr);
}

export function isArray(object) {
  return isA(object, tArr);
}

export function isNumber(object) {
  return isA(object, tNumb);
}

export function isPlainObject(object) {
  return isA(object, tObject);
}

export function isBoolean(object) {
  return isA(object, tBoolean);
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

  for (var k in object) {
    if (hasOwnProperty.call(object, k)) return false;
  }

  return true;
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
 * @param {Function(value, key, object)} fn
 */
export function _each(object, fn) {
  if (isEmpty(object)) return;
  if (isFn(object.forEach)) return object.forEach(fn, this);

  var k = 0;
  var l = object.length;

  if (l > 0) {
    for (; k < l; k++) fn(object[k], k, object);
  } else {
    for (k in object) {
      if (hasOwnProperty.call(object, k)) fn.call(this, object[k], k);
    }
  }
}

export function contains(a, obj) {
  if (isEmpty(a)) {
    return false;
  }

  if (isFn(a.indexOf)) {
    return a.indexOf(obj) !== -1;
  }

  var i = a.length;
  while (i--) {
    if (a[i] === obj) {
      return true;
    }
  }

  return false;
}

export let indexOf = (function () {
  if (Array.prototype.indexOf) {
    return Array.prototype.indexOf;
  }

  // ie8 no longer supported
  // return polyfills.indexOf;
}());

/**
 * Map an array or object into another array
 * given a function
 * @param {Array|Object} object
 * @param {Function(value, key, object)} callback
 * @return {Array}
 */
export function _map(object, callback) {
  if (isEmpty(object)) return [];
  if (isFn(object.map)) return object.map(callback);
  var output = [];
  _each(object, function (value, key) {
    output.push(callback(value, key, object));
  });

  return output;
}

export function hasOwn(objectToCheck, propertyToCheckFor) {
  if (objectToCheck.hasOwnProperty) {
    return objectToCheck.hasOwnProperty(propertyToCheckFor);
  } else {
    return (typeof objectToCheck[propertyToCheckFor] !== 'undefined') && (objectToCheck.constructor.prototype[propertyToCheckFor] !== objectToCheck[propertyToCheckFor]);
  }
};

/*
* Inserts an element(elm) as targets child, by default as first child
* @param {HTMLElement} elm
* @param {HTMLElement} [doc]
* @param {HTMLElement} [target]
* @param {Boolean} [asLastChildChild]
* @return {HTMLElement}
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
      let insertBeforeEl = asLastChildChild ? null : parentEl.firstChild;
      return parentEl.insertBefore(elm, insertBeforeEl);
    }
  } catch (e) {}
}

/**
 * Inserts an image pixel with the specified `url` for cookie sync
 * @param {string} url URL string of the image pixel to load
 * @param  {function} [done] an optional exit callback, used when this usersync pixel is added during an async process
 */
export function triggerPixel(url, done) {
  const img = new Image();
  if (done && internal.isFn(done)) {
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  }
  img.src = url;
}

export function callBurl({ source, burl }) {
  if (source === CONSTANTS.S2S.SRC && burl) {
    internal.triggerPixel(burl);
  }
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

  let iframe = document.createElement('iframe');
  iframe.id = getUniqueIdentifierStr();
  iframe.width = 0;
  iframe.height = 0;
  iframe.hspace = '0';
  iframe.vspace = '0';
  iframe.marginWidth = '0';
  iframe.marginHeight = '0';
  iframe.style.display = 'none';
  iframe.style.height = '0px';
  iframe.style.width = '0px';
  iframe.scrolling = 'no';
  iframe.frameBorder = '0';
  iframe.allowtransparency = 'true';

  internal.insertElement(iframe, document, 'body');

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(htmlCode);
  iframe.contentWindow.document.close();
}

/**
 * Inserts empty iframe with the specified `url` for cookie sync
 * @param  {string} url URL to be requested
 * @param  {string} encodeUri boolean if URL should be encoded before inserted. Defaults to true
 * @param  {function} [done] an optional exit callback, used when this usersync pixel is added during an async process
 */
export function insertUserSyncIframe(url, done) {
  let iframeHtml = internal.createTrackPixelIframeHtml(url, false, 'allow-scripts allow-same-origin');
  let div = document.createElement('div');
  div.innerHTML = iframeHtml;
  let iframe = div.firstChild;
  if (done && internal.isFn(done)) {
    iframe.addEventListener('load', done);
    iframe.addEventListener('error', done);
  }
  internal.insertElement(iframe, document, 'html', true);
};

/**
 * Creates a snippet of HTML that retrieves the specified `url`
 * @param  {string} url URL to be requested
 * @return {string}     HTML snippet that contains the img src = set to `url`
 */
export function createTrackPixelHtml(url) {
  if (!url) {
    return '';
  }

  let escapedUrl = encodeURI(url);
  let img = '<div style="position:absolute;left:0px;top:0px;visibility:hidden;">';
  img += '<img src="' + escapedUrl + '"></div>';
  return img;
};

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

/**
 * Returns iframe document in a browser agnostic way
 * @param  {Object} iframe reference
 * @return {Object}        iframe `document` reference
 */
export function getIframeDocument(iframe) {
  if (!iframe) {
    return;
  }

  let doc;
  try {
    if (iframe.contentWindow) {
      doc = iframe.contentWindow.document;
    } else if (iframe.contentDocument.document) {
      doc = iframe.contentDocument.document;
    } else {
      doc = iframe.contentDocument;
    }
  } catch (e) {
    internal.logError('Cannot get iframe document', e);
  }

  return doc;
}

export function getValueString(param, val, defaultValue) {
  if (val === undefined || val === null) {
    return defaultValue;
  }
  if (isStr(val)) {
    return val;
  }
  if (isNumber(val)) {
    return val.toString();
  }
  internal.logWarn('Unsuported type for param: ' + param + ' required type: String');
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
  let bidRequest;
  bidderRequests.some(bidderRequest => {
    let result = find(bidderRequest.bids, bid => ['bidId', 'adId', 'bid_id'].some(type => bid[type] === id));
    if (result) {
      bidRequest = result;
    }
    return result;
  });
  return bidRequest;
}

export function getKeys(obj) {
  return Object.keys(obj);
}

export function getValue(obj, key) {
  return obj[key];
}

/**
 * Get the key of an object for a given value
 */
export function getKeyByValue(obj, value) {
  for (let prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      if (obj[prop] === value) {
        return prop;
      }
    }
  }
}

export function getBidderCodes(adUnits = $$PREBID_GLOBAL$$.adUnits) {
  // this could memoize adUnits
  return adUnits.map(unit => unit.bids.map(bid => bid.bidder)
    .reduce(flatten, [])).reduce(flatten).filter(uniques);
}

export function isGptPubadsDefined() {
  if (window.googletag && isFn(window.googletag.pubads) && isFn(window.googletag.pubads().getSlots)) {
    return true;
  }
}

// This function will get highest cpm value bid, in case of tie it will return the bid with lowest timeToRespond
export const getHighestCpm = getHighestCpmCallback('timeToRespond', (previous, current) => previous > current);

// This function will get the oldest hightest cpm value bid, in case of tie it will return the bid which came in first
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2448
export const getOldestHighestCpmBid = getHighestCpmCallback('responseTimestamp', (previous, current) => previous > current);

// This function will get the latest hightest cpm value bid, in case of tie it will return the bid which came in last
// Use case for tie: https://github.com/prebid/Prebid.js/issues/2539
export const getLatestHighestCpmBid = getHighestCpmCallback('responseTimestamp', (previous, current) => previous < current);

function getHighestCpmCallback(useTieBreakerProperty, tieBreakerCallback) {
  return (previous, current) => {
    if (previous.cpm === current.cpm) {
      return tieBreakerCallback(previous[useTieBreakerProperty], current[useTieBreakerProperty]) ? current : previous;
    }
    return previous.cpm < current.cpm ? current : previous;
  }
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
    let index = Math.floor(Math.random() * counter);

    // decrease counter by 1
    counter--;

    // and swap the last element with it
    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}

export function adUnitsFilter(filter, bid) {
  return includes(filter, bid && bid.adUnitCode);
}

/**
 * Check if parent iframe of passed document supports content rendering via 'srcdoc' property
 * @param {HTMLDocument} doc document to check support of 'srcdoc'
 */
export function isSrcdocSupported(doc) {
  // Firefox is excluded due to https://bugzilla.mozilla.org/show_bug.cgi?id=1265961
  return doc.defaultView && doc.defaultView.frameElement &&
    'srcdoc' in doc.defaultView.frameElement && !/firefox/i.test(navigator.userAgent);
}

export function deepClone(obj) {
  return clone(obj);
}

export function inIframe() {
  try {
    return internal.getWindowSelf() !== internal.getWindowTop();
  } catch (e) {
    return true;
  }
}

export function isSafariBrowser() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export function replaceAuctionPrice(str, cpm) {
  if (!str) return;
  return str.replace(/\$\{AUCTION_PRICE\}/g, cpm);
}

export function timestamp() {
  return new Date().getTime();
}

export function checkCookieSupport() {
  if (window.navigator.cookieEnabled || !!document.cookie.length) {
    return true;
  }
}
export function cookiesAreEnabled() {
  if (internal.checkCookieSupport()) {
    return true;
  }
  window.document.cookie = 'prebid.cookieTest';
  return window.document.cookie.indexOf('prebid.cookieTest') != -1;
}

export function getCookie(name) {
  let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
}

export function setCookie(key, value, expires, sameSite) {
  document.cookie = `${key}=${encodeURIComponent(value)}${(expires !== '') ? `; expires=${expires}` : ''}; path=/${sameSite ? `; SameSite=${sameSite}` : ''}`;
}

/**
 * @returns {boolean}
 */
export function localStorageIsEnabled () {
  try {
    localStorage.setItem('prebid.cookieTest', '1');
    return localStorage.getItem('prebid.cookieTest') === '1';
  } catch (error) {
    return false;
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
 * @param {int} numRequiredCalls The number of times which the returned function needs to be called before
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
 * @export
 * @param {array} xs
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
 * Returns content for a friendly iframe to execute a URL in script tag
 * @param {string} url URL to be executed in a script tag in a friendly iframe
 * <!--PRE_SCRIPT_TAG_MACRO--> and <!--POST_SCRIPT_TAG_MACRO--> are macros left to be replaced if required
 */
export function createContentToExecuteExtScriptInFriendlyFrame(url) {
  if (!url) {
    return '';
  }

  return `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd"><html><head><base target="_top" /><script>inDapIF=true;</script></head><body><!--PRE_SCRIPT_TAG_MACRO--><script src="${url}"></script><!--POST_SCRIPT_TAG_MACRO--></body></html>`;
}

/**
 * Build an object consisting of only defined parameters to avoid creating an
 * object with defined keys and undefined values.
 * @param {Object} object The object to pick defined params out of
 * @param {string[]} params An array of strings representing properties to look for in the object
 * @returns {Object} An object containing all the specified values that are defined
 */
export function getDefinedParams(object, params) {
  return params
    .filter(param => object[param])
    .reduce((bid, param) => Object.assign(bid, { [param]: object[param] }), {});
}

/**
 * @typedef {Object} MediaTypes
 * @property {Object} banner banner configuration
 * @property {Object} native native configuration
 * @property {Object} video video configuration
 */

/**
 * Validates an adunit's `mediaTypes` parameter
 * @param {MediaTypes} mediaTypes mediaTypes parameter to validate
 * @return {boolean} If object is valid
 */
export function isValidMediaTypes(mediaTypes) {
  const SUPPORTED_MEDIA_TYPES = ['banner', 'native', 'video'];
  const SUPPORTED_STREAM_TYPES = ['instream', 'outstream', 'adpod'];

  const types = Object.keys(mediaTypes);

  if (!types.every(type => includes(SUPPORTED_MEDIA_TYPES, type))) {
    return false;
  }

  if (mediaTypes.video && mediaTypes.video.context) {
    return includes(SUPPORTED_STREAM_TYPES, mediaTypes.video.context);
  }

  return true;
}

export function getBidderRequest(bidRequests, bidder, adUnitCode) {
  return find(bidRequests, request => {
    return request.bids
      .filter(bid => bid.bidder === bidder && bid.adUnitCode === adUnitCode).length > 0;
  }) || { start: null, auctionId: null };
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
    .map((adUnit) => adUnit.bids)
    .reduce(flatten, [])
    .filter((bidderData) => bidderData.bidder === bidder)
    .map((bidderData) => bidderData.params || {});
}
/**
 * Returns the origin
 */
export function getOrigin() {
  // IE10 does not have this property. https://gist.github.com/hbogs/7908703
  if (!window.location.origin) {
    return window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
  } else {
    return window.location.origin;
  }
}

/**
 * Returns Do Not Track state
 */
export function getDNT() {
  return navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.msDoNotTrack === '1' || navigator.doNotTrack === 'yes';
}

const compareCodeAndSlot = (slot, adUnitCode) => slot.getAdUnitPath() === adUnitCode || slot.getSlotElementId() === adUnitCode;

/**
 * Returns filter function to match adUnitCode in slot
 * @param {Object} slot GoogleTag slot
 * @return {function} filter function
 */
export function isAdUnitCodeMatchingSlot(slot) {
  return (adUnitCode) => compareCodeAndSlot(slot, adUnitCode);
}

/**
 * Returns filter function to match adUnitCode in slot
 * @param {string} adUnitCode AdUnit code
 * @return {function} filter function
 */
export function isSlotMatchingAdUnitCode(adUnitCode) {
  return (slot) => compareCodeAndSlot(slot, adUnitCode);
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
 * Delete property from object
 * @param {Object} object
 * @param {string} prop
 * @return {Object} object
 */
export function deletePropertyFromObject(object, prop) {
  let result = Object.assign({}, object);
  delete result[prop];
  return result;
}

/**
 * Checks input is integer or not
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
 * @param {*} value
 */
export function isInteger(value) {
  if (Number.isInteger) {
    return Number.isInteger(value);
  } else {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  }
}

/**
 * Converts a string value in camel-case to underscore eg 'placementId' becomes 'placement_id'
 * @param {string} value string value to convert
 */
export function convertCamelToUnderscore(value) {
  return value.replace(/(?:^|\.?)([A-Z])/g, function (x, y) { return '_' + y.toLowerCase() }).replace(/^_/, '');
}

/**
 * Returns a new object with undefined properties removed from given object
 * @param obj the object to clean
 */
export function cleanObj(obj) {
  return Object.keys(obj).reduce((newObj, key) => {
    if (typeof obj[key] !== 'undefined') {
      newObj[key] = obj[key];
    }
    return newObj;
  }, {})
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
    let match = prop.match(/^(.+?)\sas\s(.+?)$/i);

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

/**
 * Converts an object of arrays (either strings or numbers) into an array of objects containing key and value properties
 * normally read from bidder params
 * eg { foo: ['bar', 'baz'], fizz: ['buzz'] }
 * becomes [{ key: 'foo', value: ['bar', 'baz']}, {key: 'fizz', value: ['buzz']}]
 * @param {Object} keywords object of arrays representing keyvalue pairs
 * @param {string} paramName name of parent object (eg 'keywords') containing keyword data, used in error handling
 */
export function transformBidderParamKeywords(keywords, paramName = 'keywords') {
  let arrs = [];

  _each(keywords, (v, k) => {
    if (isArray(v)) {
      let values = [];
      _each(v, (val) => {
        val = getValueString(paramName + '.' + k, val);
        if (val || val === '') { values.push(val); }
      });
      v = values;
    } else {
      v = getValueString(paramName + '.' + k, v);
      if (isStr(v)) {
        v = [v];
      } else {
        return;
      } // unsuported types - don't send a key
    }
    arrs.push({key: k, value: v});
  });

  return arrs;
}

/**
 * Try to convert a value to a type.
 * If it can't be done, the value will be returned.
 *
 * @param {string} typeToConvert The target type. e.g. "string", "number", etc.
 * @param {*} value The value to be converted into typeToConvert.
 */
function tryConvertType(typeToConvert, value) {
  if (typeToConvert === 'string') {
    return value && value.toString();
  } else if (typeToConvert === 'number') {
    return Number(value);
  } else {
    return value;
  }
}

export function convertTypes(types, params) {
  Object.keys(types).forEach(key => {
    if (params[key]) {
      if (isFn(types[key])) {
        params[key] = types[key](params[key]);
      } else {
        params[key] = tryConvertType(types[key], params[key]);
      }

      // don't send invalid values
      if (isNaN(params[key])) {
        delete params.key;
      }
    }
  });
  return params;
}

export function setDataInLocalStorage(key, value) {
  if (hasLocalStorage()) {
    window.localStorage.setItem(key, value);
  }
}

export function getDataFromLocalStorage(key) {
  if (hasLocalStorage()) {
    return window.localStorage.getItem(key);
  }
}

export function removeDataFromLocalStorage(key) {
  if (hasLocalStorage()) {
    window.localStorage.removeItem(key);
  }
}

export function hasLocalStorage() {
  try {
    return !!window.localStorage;
  } catch (e) {
    logError('Local storage api disabled');
  }
}

export function isArrayOfNums(val, size) {
  return (isArray(val)) && ((size) ? val.length === size : true) && (val.every(v => isInteger(v)));
}

/**
 * Creates an array of n length and fills each item with the given value
 */
export function fill(value, length) {
  let newArray = [];

  for (let i = 0; i < length; i++) {
    let valueToPush = isPlainObject(value) ? deepClone(value) : value;
    newArray.push(valueToPush);
  }

  return newArray;
}

/**
 * http://npm.im/chunk
 * Returns an array with *size* chunks from given array
 *
 * Example:
 * ['a', 'b', 'c', 'd', 'e'] chunked by 2 =>
 * [['a', 'b'], ['c', 'd'], ['e']]
 */
export function chunk(array, size) {
  let newArray = [];

  for (let i = 0; i < Math.ceil(array.length / size); i++) {
    let start = i * size;
    let end = start + size;
    newArray.push(array.slice(start, end));
  }

  return newArray;
}

export function getMinValueFromArray(array) {
  return Math.min(...array);
}

export function getMaxValueFromArray(array) {
  return Math.max(...array);
}

/**
 * This function will create compare function to sort on object property
 * @param {string} property
 * @returns {function} compare function to be used in sorting
 */
export function compareOn(property) {
  return function compare(a, b) {
    if (a[property] < b[property]) {
      return 1;
    }
    if (a[property] > b[property]) {
      return -1;
    }
    return 0;
  }
}
