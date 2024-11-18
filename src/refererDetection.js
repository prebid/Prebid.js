/**
 * The referer detection module attempts to gather referer information from the current page that prebid.js resides in.
 * The information that it tries to collect includes:
 * The detected top url in the nav bar,
 * Whether it was able to reach the top most window (if for example it was embedded in several iframes),
 * The number of iframes it was embedded in if applicable (by default max ten iframes),
 * A list of the domains of each embedded window if applicable.
 * Canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
 */

import { config } from './config.js';
import {logWarn} from './utils.js';

/**
 * Prepend a URL with the page's protocol (http/https), if necessary.
 */
export function ensureProtocol(url, win = window) {
  if (!url) return url;
  if (/\w+:\/\//.exec(url)) {
    // url already has protocol
    return url;
  }
  let windowProto = win.location.protocol;
  try {
    windowProto = win.top.location.protocol;
  } catch (e) {}
  if (/^\/\//.exec(url)) {
    // url uses relative protocol ("//example.com")
    return windowProto + url;
  } else {
    return `${windowProto}//${url}`;
  }
}

/**
 * Extract the domain portion from a URL.
 * @param {string} url - The URL to extract the domain from.
 * @param {Object} options - Options for parsing the domain.
 * @param {boolean} options.noLeadingWww - If true, remove 'www.' appearing at the beginning of the domain.
 * @param {boolean} options.noPort - If true, do not include the ':[port]' portion.
 * @return {string|undefined} - The extracted domain or undefined if the URL is invalid.
 */
export function parseDomain(url, {noLeadingWww = false, noPort = false} = {}) {
  try {
    url = new URL(ensureProtocol(url));
  } catch (e) {
    return;
  }
  url = noPort ? url.hostname : url.host;
  if (noLeadingWww && url.startsWith('www.')) {
    url = url.substring(4);
  }
  return url;
}

/**
 * This function returns canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
 *
 * @param {Object} doc document
 * @returns {string|null}
 */
function getCanonicalUrl(doc) {
  try {
    const element = doc.querySelector("link[rel='canonical']");

    if (element !== null) {
      return element.href;
    }
  } catch (e) {
    // Ignore error
  }

  return null;
}

/**
 * @param {Window} win Window
 * @returns {Function}
 */
export function detectReferer(win) {
  /**
   * This function would return a read-only array of hostnames for all the parent frames.
   * win.location.ancestorOrigins is only supported in webkit browsers. For non-webkit browsers it will return undefined.
   *
   * @param {Window} win Window object
   * @returns {(undefined|Array)} Ancestor origins or undefined
   */
  function getAncestorOrigins(win) {
    try {
      if (!win.location.ancestorOrigins) {
        return;
      }

      return win.location.ancestorOrigins;
    } catch (e) {
      // Ignore error
    }
  }

  // TODO: the meaning of "reachedTop" seems to be intentionally ambiguous - best to leave them out of
  // the typedef for now. (for example, unit tests enforce that "reachedTop" should be false in some situations where we
  // happily provide a location for the top).

  /**
   * @typedef {Object} refererInfo
   * @property {string|null} location the browser's location, or null if not available (due to cross-origin restrictions)
   * @property {string|null} canonicalUrl the site's canonical URL as set by the publisher, through setConfig({pageUrl}) or <link rel="canonical" />
   * @property {string|null} page the best candidate for the current page URL: `canonicalUrl`, falling back to `location`
   * @property {string|null} domain the domain portion of `page`
   * @property {string|null} ref the referrer (document.referrer) to the current page, or null if not available (due to cross-origin restrictions)
   * @property {string} topmostLocation of the top-most frame for which we could guess the location. Outside of cross-origin scenarios, this is equivalent to `location`.
   * @property {number} numIframes number of steps between window.self and window.top
   * @property {Array<string|null>} stack our best guess at the location for each frame, in the direction top -> self.
   */

  /**
   * Walk up the windows to get the origin stack and best available referrer, canonical URL, etc.
   *
   * @returns {refererInfo} An object containing referer information.
   */
  function refererInfo() {
    const stack = [];
    const ancestors = getAncestorOrigins(win);
    const maxNestedIframes = config.getConfig('maxNestedIframes');

    let currentWindow;
    let bestLocation;
    let bestCanonicalUrl;
    let reachedTop = false;
    let level = 0;
    let valuesFromAmp = false;
    let inAmpFrame = false;
    let hasTopLocation = false;

    do {
      const previousWindow = currentWindow;
      const wasInAmpFrame = inAmpFrame;
      let currentLocation;
      let crossOrigin = false;
      let foundLocation = null;

      inAmpFrame = false;
      currentWindow = currentWindow ? currentWindow.parent : win;

      try {
        currentLocation = currentWindow.location.href || null;
      } catch (e) {
        crossOrigin = true;
      }

      if (crossOrigin) {
        if (wasInAmpFrame) {
          const context = previousWindow.context;

          try {
            foundLocation = context.sourceUrl;
            bestLocation = foundLocation;
            hasTopLocation = true;

            valuesFromAmp = true;

            if (currentWindow === win.top) {
              reachedTop = true;
            }

            if (context.canonicalUrl) {
              bestCanonicalUrl = context.canonicalUrl;
            }
          } catch (e) { /* Do nothing */ }
        } else {
          logWarn('Trying to access cross domain iframe. Continuing without referrer and location');

          try {
            // the referrer to an iframe is the parent window
            const referrer = previousWindow.document.referrer;

            if (referrer) {
              foundLocation = referrer;

              if (currentWindow === win.top) {
                reachedTop = true;
              }
            }
          } catch (e) { /* Do nothing */ }

          if (!foundLocation && ancestors && ancestors[level - 1]) {
            foundLocation = ancestors[level - 1];
            if (currentWindow === win.top) {
              hasTopLocation = true;
            }
          }

          if (foundLocation && !valuesFromAmp) {
            bestLocation = foundLocation;
          }
        }
      } else {
        if (currentLocation) {
          foundLocation = currentLocation;
          bestLocation = foundLocation;
          valuesFromAmp = false;

          if (currentWindow === win.top) {
            reachedTop = true;

            const canonicalUrl = getCanonicalUrl(currentWindow.document);

            if (canonicalUrl) {
              bestCanonicalUrl = canonicalUrl;
            }
          }
        }

        if (currentWindow.context && currentWindow.context.sourceUrl) {
          inAmpFrame = true;
        }
      }

      stack.push(foundLocation);
      level++;
    } while (currentWindow !== win.top && level < maxNestedIframes);

    stack.reverse();

    let ref;
    try {
      ref = win.top.document.referrer;
    } catch (e) {}

    const location = reachedTop || hasTopLocation ? bestLocation : null;
    const canonicalUrl = config.getConfig('pageUrl') || bestCanonicalUrl || null;
    let page = config.getConfig('pageUrl') || location || ensureProtocol(canonicalUrl, win);

    if (location && location.indexOf('?') > -1 && page.indexOf('?') === -1) {
      page = `${page}${location.substring(location.indexOf('?'))}`;
    }

    return {
      reachedTop,
      isAmp: valuesFromAmp,
      numIframes: level - 1,
      stack,
      topmostLocation: bestLocation || null,
      location,
      canonicalUrl,
      page,
      domain: parseDomain(page) || null,
      ref: ref || null,
      // TODO: the "legacy" refererInfo object is provided here, for now, to accomodate
      // adapters that decided to just send it verbatim to their backend.
      legacy: {
        reachedTop,
        isAmp: valuesFromAmp,
        numIframes: level - 1,
        stack,
        referer: bestLocation || null,
        canonicalUrl
      }
    };
  }

  return refererInfo;
}

// cache result of fn (= referer info) as long as:
// - we are the top window
// - canonical URL tag and window location have not changed
export function cacheWithLocation(fn, win = window) {
  if (win.top !== win) return fn;
  let canonical, href, value;
  return function () {
    const newCanonical = getCanonicalUrl(win.document);
    const newHref = win.location.href;
    if (canonical !== newCanonical || newHref !== href) {
      canonical = newCanonical;
      href = newHref;
      value = fn();
    }
    return value;
  }
}

/**
 * @type {function(): refererInfo}
 */
export const getRefererInfo = cacheWithLocation(detectReferer(window));
