import includes from 'core-js/library/fn/array/includes.js';
import * as utils from './utils.js';

const _requestCache = {};
// The below list contains modules or vendors whom Prebid allows to load external JS.
const _approvedLoadExternalJSList = [
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
export function loadExternalScript(url, moduleCode, callback) {
  if (!moduleCode || !url) {
    utils.logError('cannot load external script without url and moduleCode');
    return;
  }
  if (!includes(_approvedLoadExternalJSList, moduleCode)) {
    utils.logError(`${moduleCode} not whitelisted for loading external JavaScript`);
    return;
  }
  // only load each asset once
  if (_requestCache[url]) {
    if (callback && typeof callback === 'function') {
      if (_requestCache[url].loaded) {
        // invokeCallbacks immediately
        callback();
      } else {
        // queue the callback
        _requestCache[url].callbacks.push(callback);
      }
    }
    return _requestCache[url].tag;
  }
  _requestCache[url] = {
    loaded: false,
    tag: null,
    callbacks: []
  };
  if (callback && typeof callback === 'function') {
    _requestCache[url].callbacks.push(callback);
  }

  utils.logWarn(`module ${moduleCode} is loading external JavaScript`);
  return requestResource(url, function () {
    _requestCache[url].loaded = true;
    try {
      for (let i = 0; i < _requestCache[url].callbacks.length; i++) {
        _requestCache[url].callbacks[i]();
      }
    } catch (e) {
      utils.logError('Error executing callback', 'adloader.js:loadExternalScript', e);
    }
  });

  function requestResource(tagSrc, callback) {
    var jptScript = document.createElement('script');
    jptScript.type = 'text/javascript';
    jptScript.async = true;

    _requestCache[url].tag = jptScript;

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
    utils.insertElement(jptScript);

    return jptScript;
  }
};
