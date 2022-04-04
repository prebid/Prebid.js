import includes from 'core-js-pure/features/array/includes.js';
import { logError, logWarn, insertElement, isArray } from './utils.js';

const _requestCache = {};
// The below list contains modules or vendors whom Prebid allows to load external JS.
const _approvedLoadExternalJSList = [
  'adloox',
  'criteo',
  'outstream',
  'adagio',
  'browsi'
]

/**
 * Loads external javascript. Can only be used if external JS is approved by Prebid. See https://github.com/prebid/prebid-js-external-js-template#policy
 * Each unique URL will be loaded at most 1 time.
 * @param {string} url the url to load
 * @param {string} moduleCode bidderCode or module code of the module requesting this resource
 * @param {function} [callback] callback function to be called after the script is loaded.
 */
export function loadExternalScript(url, moduleCode, callback, context) {
  if (!moduleCode || !url) {
    logError('cannot load external script without url and moduleCode');
    return;
  }
  if (!includes(_approvedLoadExternalJSList, moduleCode)) {
    logError(`${moduleCode} not whitelisted for loading external JavaScript`);
    return;
  }
  // only load each asset once
  const storedCachedObject = getCacheObject(url, context);
  if (storedCachedObject) {
    if (callback && typeof callback === 'function') {
      if (storedCachedObject.loaded) {
        // invokeCallbacks immediately
        callback();
      } else {
        // queue the callback
        storedCachedObject.callbacks.push(callback);
      }
    }
    return storedCachedObject.tag;
  }
  if (!isArray(_requestCache[url])) {
    _requestCache[url] = [];
  }
  const cacheObject = {
    loaded: false,
    tag: null,
    callbacks: []
  };
  _requestCache[url].push(cacheObject);
  if (callback && typeof callback === 'function') {
    cacheObject.callbacks.push(callback);
  }

  logWarn(`module ${moduleCode} is loading external JavaScript`);
  return requestResource(url, function () {
    cacheObject.loaded = true;
    try {
      for (let i = 0; i < cacheObject.callbacks.length; i++) {
        cacheObject.callbacks[i]();
      }
    } catch (e) {
      logError('Error executing callback', 'adloader.js:loadExternalScript', e);
    }
  }, context);

  function requestResource(tagSrc, callback, context) {
    if (!context) {
      context = document;
    }
    var jptScript = context.createElement('script');
    jptScript.type = 'text/javascript';
    jptScript.async = true;

    const cacheObject = getCacheObject(url, context);
    if (cacheObject) {
      cacheObject.tag = jptScript;
    }

    if (jptScript.readyState) {
      jptScript.onreadystatechange = function () {
        if (jptScript.readyState === 'loaded' || jptScript.readyState === 'complete') {
          jptScript.onreadystatechange = null;
          callback();
        }
      };
    } else {
      jptScript.onload = function () {
        callback();
      };
    }

    jptScript.src = tagSrc;

    // add the new script tag to the page
    insertElement(jptScript, context);

    return jptScript;
  }
  function getCacheObject(url, context) {
    if(_requestCache[url]) {
      for (let i = 0; i < _requestCache[url].length; i++) {
        if (_requestCache[url][i].context === context) {
          return _requestCache[url][i];
        }
      }
    }
    return null; // return new cache object?
  }
};
