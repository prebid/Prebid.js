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
import { logWarn } from './utils.js';

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

  /**
   * This function returns canonical URL which refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
   *
   * @param {Object} doc document
   * @returns {string|null}
   */
  function getCanonicalUrl(doc) {
    let pageURL = config.getConfig('pageUrl');

    if (pageURL) return pageURL;

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
   * Referer info
   * @typedef {Object} refererInfo
   * @property {string} referer detected top url
   * @property {boolean} reachedTop whether prebid was able to walk upto top window or not
   * @property {number} numIframes number of iframes
   * @property {string} stack comma separated urls of all origins
   * @property {string} canonicalUrl canonical URL refers to an HTML link element, with the attribute of rel="canonical", found in the <head> element of your webpage
   */

  /**
   * Walk up the windows to get the origin stack and best available referrer, canonical URL, etc.
   *
   * @returns {refererInfo}
   */
  function refererInfo() {
    const stack = [];
    const ancestors = getAncestorOrigins(win);
    const maxNestedIframes = config.getConfig('maxNestedIframes');
    let currentWindow;
    let bestReferrer;
    let bestCanonicalUrl;
    let reachedTop = false;
    let level = 0;
    let valuesFromAmp = false;
    let inAmpFrame = false;

    do {
      const previousWindow = currentWindow;
      const wasInAmpFrame = inAmpFrame;
      let currentLocation;
      let crossOrigin = false;
      let foundReferrer = null;

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
            foundReferrer = context.sourceUrl;
            bestReferrer = foundReferrer;

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
            const referrer = previousWindow.document.referrer;

            if (referrer) {
              foundReferrer = referrer;

              if (currentWindow === win.top) {
                reachedTop = true;
              }
            }
          } catch (e) { /* Do nothing */ }

          if (!foundReferrer && ancestors && ancestors[level - 1]) {
            foundReferrer = ancestors[level - 1];
          }

          if (foundReferrer && !valuesFromAmp) {
            bestReferrer = foundReferrer;
          }
        }
      } else {
        if (currentLocation) {
          foundReferrer = currentLocation;
          bestReferrer = foundReferrer;
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

      stack.push(foundReferrer);
      level++;
    } while (currentWindow !== win.top && level < maxNestedIframes);

    stack.reverse();

    return {
      referer: bestReferrer || null,
      reachedTop,
      isAmp: valuesFromAmp,
      numIframes: level - 1,
      stack,
      canonicalUrl: bestCanonicalUrl || null
    };
  }

  return refererInfo;
}

export const getRefererInfo = detectReferer(window);
