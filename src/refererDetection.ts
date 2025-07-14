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
 * @param url - The URL to extract the domain from.
 * @param options - Options for parsing the domain.
 * @param options.noLeadingWww - If true, remove 'www.' appearing at the beginning of the domain.
 * @param options.noPort - If true, do not include the ':[port]' portion.
 * @return The extracted domain or undefined if the URL is invalid.
 */
export function parseDomain(url: string, {noLeadingWww = false, noPort = false} = {}): string | null {
  let target;
  try {
    target = new URL(ensureProtocol(url));
  } catch (e) {
    return;
  }
  target = noPort ? target.hostname : target.host;
  if (noLeadingWww && target.startsWith('www.')) {
    target = target.substring(4);
  }
  return target;
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

declare module './config' {
  interface Config {
    /**
     * Prebid.js will loop upward through nested iframes to find the top-most referrer. T
     * his setting limits how many iterations it will attempt before giving up and not setting referrer.
     */
    maxNestedIframes?: number;
    /**
     * Override the Prebid.js page referrer.
     */
    pageUrl?: string;
  }
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
   * Walk up the windows to get the origin stack and best available referrer, canonical URL, etc.
   *
   * @returns An object containing referer information.
   */
  function refererInfo() {
    const stack: string[] = [];
    const ancestors = getAncestorOrigins(win);
    const maxNestedIframes = config.getConfig('maxNestedIframes');

    let currentWindow;
    let bestLocation: string;
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

    let ref: string;
    try {
      ref = win.top.document.referrer;
    } catch (e) {}

    const location: string = reachedTop || hasTopLocation ? bestLocation : null;
    const canonicalUrl: string | null = config.getConfig('pageUrl') || bestCanonicalUrl || null;
    let page: string = config.getConfig('pageUrl') || location || ensureProtocol(canonicalUrl, win);

    if (location && location.indexOf('?') > -1 && page.indexOf('?') === -1) {
      page = `${page}${location.substring(location.indexOf('?'))}`;
    }

    return {
      /**
       * True if the top window is accessible.
       */
      reachedTop,
      isAmp: valuesFromAmp,
      /**
       * number of steps between window.self and window.top
       */
      numIframes: level - 1,
      /**
       * our best guess at the location for each frame, in the direction top -> self.
       */
      stack,
      /**
       * of the top-most frame for which we could guess the location. Outside of cross-origin scenarios, this is equivalent to `location`.
       */
      topmostLocation: bestLocation || null,
      /**
       * the browser's location, or null if not available (due to cross-origin restrictions)
       */
      location,
      /**
       * the site's canonical URL as set by the publisher, through setConfig({pageUrl}) or <link rel="canonical" />
       */
      canonicalUrl,
      /**
       * the best candidate for the current page URL: `canonicalUrl`, falling back to `location`
       */
      page,
      /**
       * the domain portion of `page`
       */
      domain: parseDomain(page) || null,
      /**
       * the referrer (document.referrer) to the current page, or null if not available (due to cross-origin restrictions)
       */
      ref: ref || null,
      // TODO: the "legacy" refererInfo object is provided here, for now, to accommodate
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

export type RefererInfo = ReturnType<ReturnType<typeof detectReferer>>;
export const getRefererInfo: () => RefererInfo = cacheWithLocation(detectReferer(window));
