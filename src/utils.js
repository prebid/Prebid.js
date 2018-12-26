import { config } from './config';
import clone from 'just-clone';
import find from 'core-js/library/fn/array/find';
import includes from 'core-js/library/fn/array/includes';
import { parse } from './url';
const CONSTANTS = require('./constants');

var _loggingChecked = false;

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

/*
 *   Substitutes into a string from a given map using the token
 *   Usage
 *   var str = 'text %%REPLACE%% this text with %%SOMETHING%%';
 *   var map = {};
 *   map['replace'] = 'it was subbed';
 *   map['something'] = 'something else';
 *   console.log(replaceTokenInString(str, map, '%%')); => "text it was subbed this text with something else"
 */
exports.replaceTokenInString = function (str, map, token) {
  exports._each(map, function (value, key) {
    value = (value === undefined) ? '' : value;

    var keyString = token + key.toUpperCase() + token;
    var re = new RegExp(keyString, 'g');

    str = str.replace(re, value);
  });

  return str;
};

/* utility method to get incremental integer starting from 1 */
var getIncrementalInteger = (function () {
  var count = 0;
  return function () {
    count++;
    return count;
  };
})();

function _getUniqueIdentifierStr() {
  return getIncrementalInteger() + Math.random().toString(16).substr(2);
}

// generate a random string (to be used as a dynamic JSONP callback)
exports.getUniqueIdentifierStr = _getUniqueIdentifierStr;

/**
 * Returns a random v4 UUID of the form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx,
 * where each x is replaced with a random hexadecimal digit from 0 to f,
 * and y is replaced with a random hexadecimal digit from 8 to b.
 * https://gist.github.com/jed/982883 via node-uuid
 */
exports.generateUUID = function generateUUID(placeholder) {
  return placeholder
    ? (placeholder ^ _getRandomData() >> placeholder / 4).toString(16)
    : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, generateUUID);
};

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

exports.getBidIdParameter = function (key, paramsObj) {
  if (paramsObj && paramsObj[key]) {
    return paramsObj[key];
  }

  return '';
};

exports.tryAppendQueryString = function (existingUrl, key, value) {
  if (value) {
    return existingUrl += key + '=' + encodeURIComponent(value) + '&';
  }

  return existingUrl;
};

// parse a query string object passed in bid params
// bid params should be an object such as {key: "value", key1 : "value1"}
exports.parseQueryStringParameters = function (queryObj) {
  var result = '';
  for (var k in queryObj) {
    if (queryObj.hasOwnProperty(k)) { result += k + '=' + encodeURIComponent(queryObj[k]) + '&'; }
  }

  return result;
};

// transform an AdServer targeting bids into a query string to send to the adserver
exports.transformAdServerTargetingObj = function (targeting) {
  // we expect to receive targeting for a single slot at a time
  if (targeting && Object.getOwnPropertyNames(targeting).length > 0) {
    return getKeys(targeting)
      .map(key => `${key}=${encodeURIComponent(getValue(targeting, key))}`).join('&');
  } else {
    return '';
  }
};

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

// parse a GPT style sigle size array, (i.e [300,250])
// into an AppNexus style string, (i.e. 300x250)
export function parseGPTSingleSizeArray(singleSize) {
  // if we aren't exactly 2 items in this array, it is invalid
  if (exports.isArray(singleSize) && singleSize.length === 2 && (!isNaN(singleSize[0]) && !isNaN(singleSize[1]))) {
    return singleSize[0] + 'x' + singleSize[1];
  }
}

/**
 * @deprecated This function will be removed soon. Use http://prebid.org/dev-docs/bidder-adaptor.html#referrers
 */
exports.getTopWindowLocation = function() {
  if (exports.inIframe()) {
    let loc;
    try {
      loc = exports.getAncestorOrigins() || exports.getTopFrameReferrer();
    } catch (e) {
      logInfo('could not obtain top window location', e);
    }
    if (loc) return parse(loc, {'decodeSearchAsString': true});
  }
  return exports.getWindowLocation();
};

/**
 * @deprecated This function will be removed soon. Use http://prebid.org/dev-docs/bidder-adaptor.html#referrers
 */
exports.getTopFrameReferrer = function () {
  try {
    // force an exception in x-domain environments. #1509
    window.top.location.toString();
    let referrerLoc = '';
    let currentWindow;
    do {
      currentWindow = currentWindow ? currentWindow.parent : window;
      if (currentWindow.document && currentWindow.document.referrer) {
        referrerLoc = currentWindow.document.referrer;
      }
    }
    while (currentWindow !== window.top);
    return referrerLoc;
  } catch (e) {
    return window.document.referrer;
  }
};

/**
 * @deprecated This function will be removed soon. Use http://prebid.org/dev-docs/bidder-adaptor.html#referrers
 */
exports.getAncestorOrigins = function () {
  if (window.document.location && window.document.location.ancestorOrigins &&
    window.document.location.ancestorOrigins.length >= 1) {
    return window.document.location.ancestorOrigins[window.document.location.ancestorOrigins.length - 1];
  }
};

exports.getWindowTop = function () {
  return window.top;
};

exports.getWindowSelf = function () {
  return window.self;
};

exports.getWindowLocation = function () {
  return window.location;
};

/**
 * @deprecated This function will be removed soon. Use http://prebid.org/dev-docs/bidder-adaptor.html#referrers
 */
exports.getTopWindowUrl = function () {
  let href;
  try {
    href = exports.getTopWindowLocation().href;
  } catch (e) {
    href = '';
  }
  return href;
};

/**
 * @deprecated This function will be removed soon. Use http://prebid.org/dev-docs/bidder-adaptor.html#referrers
 */
exports.getTopWindowReferrer = function() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return document.referrer;
  }
};

/**
 * Wrappers to console.(log | info | warn | error). Takes N arguments, the same as the native methods
 */
exports.logMessage = function () {
  if (debugTurnedOn() && consoleLogExists) {
    console.log.apply(console, decorateLog(arguments, 'MESSAGE:'));
  }
};

exports.logInfo = function () {
  if (debugTurnedOn() && consoleInfoExists) {
    console.info.apply(console, decorateLog(arguments, 'INFO:'));
  }
};

exports.logWarn = function () {
  if (debugTurnedOn() && consoleWarnExists) {
    console.warn.apply(console, decorateLog(arguments, 'WARNING:'));
  }
};

exports.logError = function () {
  if (debugTurnedOn() && consoleErrorExists) {
    console.error.apply(console, decorateLog(arguments, 'ERROR:'));
  }
};

function decorateLog(args, prefix) {
  args = [].slice.call(args);
  prefix && args.unshift(prefix);
  args.unshift('display: inline-block; color: #fff; background: #3b88c3; padding: 1px 4px; border-radius: 3px;');
  args.unshift('%cPrebid');
  return args;
}

function hasConsoleLogger() {
  return consoleLogExists;
}

exports.hasConsoleLogger = hasConsoleLogger;

var debugTurnedOn = function () {
  if (config.getConfig('debug') === false && _loggingChecked === false) {
    const debug = getParameterByName(CONSTANTS.DEBUG_MODE).toUpperCase() === 'TRUE';
    config.setConfig({ debug });
    _loggingChecked = true;
  }

  return !!config.getConfig('debug');
};

exports.debugTurnedOn = debugTurnedOn;

exports.createInvisibleIframe = function _createInvisibleIframe() {
  var f = document.createElement('iframe');
  f.id = _getUniqueIdentifierStr();
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
};

/*
 *   Check if a given parameter name exists in query string
 *   and if it does return the value
 */
var getParameterByName = function (name) {
  var regexS = '[\\?&]' + name + '=([^&#]*)';
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if (results === null) {
    return '';
  }

  return decodeURIComponent(results[1].replace(/\+/g, ' '));
};

exports.getParameterByName = getParameterByName;

/**
 * This function validates paramaters.
 * @param  {Object} paramObj          [description]
 * @param  {string[]} requiredParamsArr [description]
 * @return {boolean}                   Bool if paramaters are valid
 */
exports.hasValidBidRequest = function (paramObj, requiredParamsArr, adapter) {
  var found = false;

  function findParam(value, key) {
    if (key === requiredParamsArr[i]) {
      found = true;
    }
  }

  for (var i = 0; i < requiredParamsArr.length; i++) {
    found = false;

    exports._each(paramObj, findParam);

    if (!found) {
      exports.logError('Params are missing for bid request. One of these required paramaters are missing: ' + requiredParamsArr, adapter);
      return false;
    }
  }

  return true;
};

// Handle addEventListener gracefully in older browsers
exports.addEventHandler = function (element, event, func) {
  if (element.addEventListener) {
    element.addEventListener(event, func, true);
  } else if (element.attachEvent) {
    element.attachEvent('on' + event, func);
  }
};
/**
 * Return if the object is of the
 * given type.
 * @param {*} object to test
 * @param {String} _t type string (e.g., Array)
 * @return {Boolean} if object is of type _t
 */
exports.isA = function (object, _t) {
  return toString.call(object) === '[object ' + _t + ']';
};

exports.isFn = function (object) {
  return exports.isA(object, tFn);
};

exports.isStr = function (object) {
  return exports.isA(object, tStr);
};

exports.isArray = function (object) {
  return exports.isA(object, tArr);
};

exports.isNumber = function(object) {
  return exports.isA(object, tNumb);
};

exports.isPlainObject = function(object) {
  return exports.isA(object, tObject);
};

exports.isBoolean = function(object) {
  return exports.isA(object, tBoolean);
};

/**
 * Return if the object is "empty";
 * this includes falsey, no keys, or no items at indices
 * @param {*} object object to test
 * @return {Boolean} if object is empty
 */
exports.isEmpty = function (object) {
  if (!object) return true;
  if (exports.isArray(object) || exports.isStr(object)) {
    return !(object.length > 0);
  }

  for (var k in object) {
    if (hasOwnProperty.call(object, k)) return false;
  }

  return true;
};

/**
 * Return if string is empty, null, or undefined
 * @param str string to test
 * @returns {boolean} if string is empty
 */
exports.isEmptyStr = function(str) {
  return exports.isStr(str) && (!str || str.length === 0);
};

/**
 * Iterate object with the function
 * falls back to es5 `forEach`
 * @param {Array|Object} object
 * @param {Function(value, key, object)} fn
 */
exports._each = function (object, fn) {
  if (exports.isEmpty(object)) return;
  if (exports.isFn(object.forEach)) return object.forEach(fn, this);

  var k = 0;
  var l = object.length;

  if (l > 0) {
    for (; k < l; k++) fn(object[k], k, object);
  } else {
    for (k in object) {
      if (hasOwnProperty.call(object, k)) fn.call(this, object[k], k);
    }
  }
};

exports.contains = function (a, obj) {
  if (exports.isEmpty(a)) {
    return false;
  }

  if (exports.isFn(a.indexOf)) {
    return a.indexOf(obj) !== -1;
  }

  var i = a.length;
  while (i--) {
    if (a[i] === obj) {
      return true;
    }
  }

  return false;
};

exports.indexOf = (function () {
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
exports._map = function (object, callback) {
  if (exports.isEmpty(object)) return [];
  if (exports.isFn(object.map)) return object.map(callback);
  var output = [];
  exports._each(object, function (value, key) {
    output.push(callback(value, key, object));
  });

  return output;
};

var hasOwn = function (objectToCheck, propertyToCheckFor) {
  if (objectToCheck.hasOwnProperty) {
    return objectToCheck.hasOwnProperty(propertyToCheckFor);
  } else {
    return (typeof objectToCheck[propertyToCheckFor] !== 'undefined') && (objectToCheck.constructor.prototype[propertyToCheckFor] !== objectToCheck[propertyToCheckFor]);
  }
};

exports.insertElement = function(elm, doc, target) {
  doc = doc || document;
  let elToAppend;
  const head = doc.getElementsByTagName('head');
  if (target) {
    elToAppend = doc.getElementsByTagName(target);
  } else {
    elToAppend = head;
  }
  try {
    elToAppend = elToAppend.length ? elToAppend : doc.getElementsByTagName('body');
    if (elToAppend.length) {
      elToAppend = elToAppend[0];
      const refChild = head && head[0] === elToAppend ? null : elToAppend.firstChild;
      return elToAppend.insertBefore(elm, refChild);
    }
  } catch (e) {}
};

exports.triggerPixel = function (url) {
  const img = new Image();
  img.src = url;
};

exports.callBurl = function({ source, burl }) {
  if (source === CONSTANTS.S2S.SRC && burl) {
    exports.triggerPixel(burl);
  }
};

/**
 * Inserts an empty iframe with the specified `html`, primarily used for tracking purposes
 * (though could be for other purposes)
 * @param {string} htmlCode snippet of HTML code used for tracking purposes
 */
exports.insertHtmlIntoIframe = function(htmlCode) {
  if (!htmlCode) {
    return;
  }

  let iframe = document.createElement('iframe');
  iframe.id = exports.getUniqueIdentifierStr();
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

  exports.insertElement(iframe, document, 'body');

  iframe.contentWindow.document.open();
  iframe.contentWindow.document.write(htmlCode);
  iframe.contentWindow.document.close();
}

/**
 * Inserts empty iframe with the specified `url` for cookie sync
 * @param  {string} url URL to be requested
 * @param  {string} encodeUri boolean if URL should be encoded before inserted. Defaults to true
 */
exports.insertUserSyncIframe = function(url) {
  let iframeHtml = exports.createTrackPixelIframeHtml(url, false, 'allow-scripts allow-same-origin');
  let div = document.createElement('div');
  div.innerHTML = iframeHtml;
  let iframe = div.firstChild;
  exports.insertElement(iframe);
};

/**
 * Creates a snippet of HTML that retrieves the specified `url`
 * @param  {string} url URL to be requested
 * @return {string}     HTML snippet that contains the img src = set to `url`
 */
exports.createTrackPixelHtml = function (url) {
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
exports.createTrackPixelIframeHtml = function (url, encodeUri = true, sandbox = '') {
  if (!url) {
    return '';
  }
  if (encodeUri) {
    url = encodeURI(url);
  }
  if (sandbox) {
    sandbox = `sandbox="${sandbox}"`;
  }

  return `<iframe ${sandbox} id="${exports.getUniqueIdentifierStr()}"
      frameborder="0"
      allowtransparency="true"
      marginheight="0" marginwidth="0"
      width="0" hspace="0" vspace="0" height="0"
      style="height:0px;width:0px;display:none;"
      scrolling="no"
      src="${url}">
    </iframe>`;
};

/**
 * Returns iframe document in a browser agnostic way
 * @param  {Object} iframe reference
 * @return {Object}        iframe `document` reference
 */
exports.getIframeDocument = function (iframe) {
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
    exports.logError('Cannot get iframe document', e);
  }

  return doc;
};

exports.getValueString = function(param, val, defaultValue) {
  if (val === undefined || val === null) {
    return defaultValue;
  }
  if (exports.isStr(val)) {
    return val;
  }
  if (exports.isNumber(val)) {
    return val.toString();
  }
  exports.logWarn('Unsuported type for param: ' + param + ' required type: String');
};

export function uniques(value, index, arry) {
  return arry.indexOf(value) === index;
}

export function flatten(a, b) {
  return a.concat(b);
}

export function getBidRequest(id, bidderRequests) {
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

export function getBidderCodes(adUnits = $$PREBID_GLOBAL$$.adUnits) {
  // this could memoize adUnits
  return adUnits.map(unit => unit.bids.map(bid => bid.bidder)
    .reduce(flatten, [])).reduce(flatten).filter(uniques);
}

export function isGptPubadsDefined() {
  if (window.googletag && exports.isFn(window.googletag.pubads) && exports.isFn(window.googletag.pubads().getSlots)) {
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
    return exports.getWindowSelf() !== exports.getWindowTop();
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
  if (exports.checkCookieSupport()) {
    return true;
  }
  window.document.cookie = 'prebid.cookieTest';
  return window.document.cookie.indexOf('prebid.cookieTest') != -1;
}

export function getCookie(name) {
  let m = window.document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]*)\\s*(;|$)');
  return m ? decodeURIComponent(m[2]) : null;
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
      func.apply(null, arguments);
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
 * deepAccess utility function useful for doing safe access (will not throw exceptions) of deep object paths.
 * @param {Object} obj The object containing the values you would like to access.
 * @param {string|number} path Object path to the value you would like to access.  Non-strings are coerced to strings.
 * @returns {*} The value found at the specified object path, or undefined if path is not found.
 */
export function deepAccess(obj, path) {
  if (!obj) {
    return;
  }
  path = String(path).split('.');
  for (let i = 0; i < path.length; i++) {
    obj = obj[path[i]];
    if (typeof obj === 'undefined') {
      return;
    }
  }
  return obj;
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
  const SUPPORTED_STREAM_TYPES = ['instream', 'outstream'];

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
 * Delete requestId from external bid object.
 * @param {Object} bid
 * @return {Object} bid
 */
export function removeRequestId(bid) {
  return exports.deletePropertyFromObject(bid, 'requestId');
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
 * Converts an object of arrays (either strings or numbers) into an array of objects containing key and value properties
 * normally read from bidder params
 * eg { foo: ['bar', 'baz'], fizz: ['buzz'] }
 * becomes [{ key: 'foo', value: ['bar', 'baz']}, {key: 'fizz', value: ['buzz']}]
 * @param {Object} keywords object of arrays representing keyvalue pairs
 * @param {string} paramName name of parent object (eg 'keywords') containing keyword data, used in error handling
 */
export function transformBidderParamKeywords(keywords, paramName = 'keywords') {
  let arrs = [];

  exports._each(keywords, (v, k) => {
    if (exports.isArray(v)) {
      let values = [];
      exports._each(v, (val) => {
        val = exports.getValueString(paramName + '.' + k, val);
        if (val || val === '') { values.push(val); }
      });
      v = values;
    } else {
      v = exports.getValueString(paramName + '.' + k, v);
      if (exports.isStr(v)) {
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
      if (exports.isFn(types[key])) {
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
