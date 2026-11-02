import { ACTIVITY_LOAD_EXTERNAL_SCRIPT } from './activities/activities.js';
import { activityParams } from './activities/activityParams.js';
import { isActivityAllowed } from './activities/rules.js';

import { insertElement, logError, memoize } from './utils.js';
import type { ModuleType } from "./activities/modules.ts";

function isAllowed(url, moduleType, moduleCode) {
  if (!moduleType || !moduleCode || !url) {
    logError('cannot load external script without url, moduleType, or moduleCode');
    return false;
  }
  if (!isActivityAllowed(ACTIVITY_LOAD_EXTERNAL_SCRIPT, activityParams(moduleType, moduleCode))) {
    return false;
  }
  return true;
}

function checkAllowed(url, moduleType, moduleCode) {
  if (!isAllowed(url, moduleType, moduleCode)) {
    throw new Error('Denied');
  }
}

function makeLoader(mkTag) {
  let loaders;

  function load(doc, url, attrs?) {
    if (!loaders.has(doc)) {
      const tags = new Map();
      const loader = memoize((url) => {
        return new Promise((resolve, reject) => {
          try {
            const tag = mkTag(doc, url);
            tags.set(url, tag);
            Object.entries(attrs ?? {})
              .forEach(([key, value]) => tag.setAttribute(key, value));
            tag.onload = resolve;
            tag.onerror = (err) => {
              loader.invalidate(url);
              reject(err);
            };
            insertElement(tag, doc);
          } catch (e) {
            loader.invalidate(url);
            reject(e);
          }
        }).finally(() => {
          const tag = tags.get(url);
          if (tag) {
            tag.onload = null;
            tag.onerror = null;
          }
        });
      });
      loaders.set(doc, { loader, scripts: tags });
    }
    return loaders.get(doc).loader(url);
  }

  const loader = {
    load,
    clear() {
      loaders = new WeakMap();
    },
    tagFor(doc, url) {
      return loaders.get(doc)?.scripts?.get(url);
    }
  };
  loader.clear();
  return loader;
}

const preloadLinks = makeLoader((doc, url) => {
  const link = doc.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = url;
  return link;
});

export async function preloadExternalScript(url: string, moduleType: ModuleType, moduleCode: string): Promise<void> {
  checkAllowed(url, moduleType, moduleCode);
  return preloadLinks.load(document, url);
}

preloadExternalScript.clear = preloadLinks.clear;

const scripts = makeLoader((doc, url) => {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = url;
  return script;
});

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
export function loadExternalScript(
  url: string,
  moduleType: ModuleType,
  moduleCode: string,
  callback?: (() => void) | { success?: () => void, error?: (err: unknown) => void },
  doc: Document = document,
  attributes: Record<string, unknown> = {}
) {
  function runCallback(cb, ...args) {
    try {
      cb(...args);
    } catch (e) {
      logError('Error executing callback', 'adloader.js:loadExternalScript', e);
    }
  }

  fetchExternalScript(url, moduleType, moduleCode, doc, attributes)
    .then(() => {
      if (typeof callback === 'function') {
        runCallback(callback);
      } else if (typeof callback?.success === 'function') {
        runCallback(callback.success);
      }
    }, (err) => {
      if (typeof (callback as any)?.error === 'function') {
        runCallback((callback as any).error, err);
      }
    });
  return scripts.tagFor(doc, url);
}

/**
 * like `loadExternalScript`, except it takes no callbacks and returns a Promise.
 *
 * @param url
 * @param moduleType
 * @param moduleCode
 * @param doc
 * @param attributes
 */
export async function fetchExternalScript(
  url: string,
  moduleType: ModuleType,
  moduleCode: string,
  doc: Document = document,
  attributes: Record<string, unknown> = {}
): Promise<void> {
  checkAllowed(url, moduleType, moduleCode);
  return scripts.load(doc, url, attributes);
}
