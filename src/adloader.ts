import { ACTIVITY_LOAD_EXTERNAL_SCRIPT } from './activities/activities.js';
import { activityParams } from './activities/activityParams.js';
import { isActivityAllowed } from './activities/rules.js';
import { defer } from "./utils/promise.ts";
import { insertElement, logError, logWarn, memoize } from './utils.js';
import type { ModuleType } from './activities/modules.ts';

function isAllowed(url, moduleType, moduleCode) {
  if (!moduleType || !moduleCode || !url) {
    logError('cannot load external script without url, moduleType, or moduleCode');
    return false;
  }
  return isActivityAllowed(ACTIVITY_LOAD_EXTERNAL_SCRIPT, activityParams(moduleType, moduleCode));
}

function denyError() {
  return new Error('Denied');
}

function makeLoader(mkTag) {
  let loaders;
  function load(doc, url, attrs?, beforeLoad?): Promise<void> {
    doc = doc ?? document;
    if (!loaders.has(doc)) {
      const tags = new Map();
      const loader = memoize((url, attrs, beforeLoad) => {
        beforeLoad?.();
        const df = defer<void>();
        const onload = () => df.resolve();
        const tag = mkTag(doc, url);
        Object.entries(attrs ?? {})
          .forEach(([key, value]) => tag.setAttribute(key, value));
        tag.addEventListener('load', onload);
        tag.addEventListener('error', df.reject);
        insertElement(tag, doc);
        tags.set(url, tag);
        const loading = df.promise.finally(() => {
          tag.removeEventListener('load', onload);
          tag.removeEventListener('error', df.reject);
        });
        loading.catch(() => {
          loader.invalidate(url);
          tags.delete(url);
        });
        return loading;
      });
      loaders.set(doc, { loader, tags });
    }
    return loaders.get(doc).loader(url, attrs, beforeLoad);
  }

  const loader = {
    load,
    clear() {
      loaders = new WeakMap();
    },
    tagFor(doc, url) {
      return loaders.get(doc)?.tags?.get(url);
    }
  };
  loader.clear();
  return loader;
}

const PRELOAD_LINKS = makeLoader((doc, url) => {
  const link = doc.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = url;
  return link;
});

export async function preloadExternalScript(url: string, moduleType: ModuleType, moduleCode: string): Promise<void> {
  if (!isAllowed(url, moduleType, moduleCode)) throw denyError();
  return PRELOAD_LINKS.load(document, url);
}

preloadExternalScript.clear = PRELOAD_LINKS.clear;

const SCRIPTS = makeLoader((doc, url) => {
  const script = doc.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.src = url;
  return script;
});

function loadScript(doc, url, attributes, moduleName) {
  return SCRIPTS.load(doc, url, attributes, () => {
    logWarn(`module ${moduleName} is loading external JavaScript`);
  });
}

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
      logError('Error executing callback', 'adloader:loadExternalScript', e);
    }
  }

  const allowed = isAllowed(url, moduleType, moduleCode);
  (allowed ? loadScript(doc, url, attributes, moduleCode) : Promise.reject(denyError()))
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
  return allowed ? SCRIPTS.tagFor(doc, url) : undefined;
}

/**
 * like `loadExternalScript`, except it takes no callbacks and returns a Promise.
 */
export async function fetchExternalScript(
  url: string,
  moduleType: ModuleType,
  moduleCode: string,
  doc: Document = document,
  attributes: Record<string, unknown> = {}
): Promise<void> {
  if (!isAllowed(url, moduleType, moduleCode)) throw denyError();
  return loadScript(doc, url, attributes, moduleCode);
}
