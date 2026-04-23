import { LOAD_EXTERNAL_SCRIPT } from './activities/activities.js';
import { activityParams } from './activities/activityParams.js';
import { isActivityAllowed } from './activities/rules.js';

import { insertElement, logError, logWarn, setScriptAttributes } from './utils.js';

const _requestCache = new WeakMap();

/**
 * Loads external javascript. Can only be used if external JS is approved by Prebid. See https://github.com/prebid/prebid-js-external-js-template#policy
 * Each unique URL will be loaded at most 1 time.
 * @param {string} url the url to load
 * @param {string} moduleType moduleType of the module requesting this resource
 * @param {string} moduleCode bidderCode or module code of the module requesting this resource
 * @param {function} [callback] callback function to be called after the script is loaded
 * @param {Document} [doc] the context document, in which the script will be loaded, defaults to loaded document
 * @param {object} attributes an object of attributes to be added to the script with setAttribute by [key] and [value]; Only the attributes passed in the first request of a url will be added.
 */
export function loadExternalScript(url, moduleType, moduleCode, callback, doc, attributes) {
  if (!isActivityAllowed(LOAD_EXTERNAL_SCRIPT, activityParams(moduleType, moduleCode))) {
    return;
  }

  if (!moduleCode || !url) {
    logError('cannot load external script without url and moduleCode');
    return;
  }

  const hasCallback = typeof callback === 'function' || typeof callback?.success === 'function' || typeof callback?.error === 'function';

  function runCallback(cb, err) {
    if (err == null) {
      if (typeof cb === 'function') {
        cb()
      } else {
        cb.success?.();
      }
    } else {
      cb.error?.(err);
    }
  }

  if (!doc) {
    doc = document; // provide a "valid" key for the WeakMap
  }
  // only load each asset once
  const storedCachedObject = getCacheObject(doc, url);
  if (storedCachedObject) {
    if (hasCallback) {
      if (storedCachedObject.loaded) {
        // invokeCallbacks immediately
        runCallback(callback, storedCachedObject.error);
      } else {
        // queue the callback
        storedCachedObject.callbacks.push(callback);
      }
    }
    return storedCachedObject.tag;
  }
  const cachedDocObj = _requestCache.get(doc) || {};
  const cacheObject = {
    error: null,
    loaded: false,
    tag: null,
    callbacks: []
  };
  cachedDocObj[url] = cacheObject;
  _requestCache.set(doc, cachedDocObj);

  if (hasCallback) {
    cacheObject.callbacks.push(callback);
  }

  logWarn(`module ${moduleCode} is loading external JavaScript`);
  return requestResource(url, function () {
    cacheObject.loaded = true;
    try {
      for (let i = 0; i < cacheObject.callbacks.length; i++) {
        runCallback(cacheObject.callbacks[i], cacheObject.error);
      }
      cacheObject.callbacks.length = 0;
    } catch (e) {
      logError('Error executing callback', 'adloader.js:loadExternalScript', e);
    }
  }, doc, attributes);

  function requestResource(tagSrc, callback, doc, attributes) {
    if (!doc) {
      doc = document;
    }
    var jptScript = doc.createElement('script');
    jptScript.type = 'text/javascript';
    jptScript.async = true;

    const cacheObject = getCacheObject(doc, url);
    if (cacheObject) {
      cacheObject.tag = jptScript;
    }

    function errorListener(e) {
      cacheObject.error = e;
      exit();
    }
    jptScript.addEventListener('error', errorListener)

    function exit() {
      jptScript.removeEventListener('error', errorListener);
      jptScript.onload = null;
      jptScript.onreadystatechange = null;
      callback();
    }

    if (jptScript.readyState) {
      jptScript.onreadystatechange = function () {
        if (jptScript.readyState === 'loaded' || jptScript.readyState === 'complete') {
          jptScript.onreadystatechange = null;
          exit();
        }
      };
    } else {
      jptScript.onload = function () {
        exit();
      };
    }

    jptScript.src = tagSrc;

    if (attributes) {
      setScriptAttributes(jptScript, attributes);
    }

    // add the new script tag to the page
    insertElement(jptScript, doc);

    return jptScript;
  }
  function getCacheObject(doc, url) {
    const cachedDocObj = _requestCache.get(doc);
    if (cachedDocObj && cachedDocObj[url]) {
      return cachedDocObj[url];
    }
    return null; // return new cache object?
  }
};
