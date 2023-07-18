/**
 * Build a walkable linked list of window-like objects for testing.
 *
 * @param {Array} urls Array of URL strings starting from the top window.
 * @param {string} [topReferrer]
 * @param {string} [canonicalUrl]
 * @param {boolean} [ancestorOrigins]
 * @returns {Object}
 */
export function buildWindowTree(urls, topReferrer = null, canonicalUrl = null, ancestorOrigins = false) {
  /**
   * Find the origin from a given fully-qualified URL.
   *
   * @param {string} url The fully qualified URL
   * @returns {string|null}
   */
  function getOrigin(url) {
    const originRegex = new RegExp('^(https?://[^/]+/?)');

    const result = originRegex.exec(url);

    if (result && result[0]) {
      return result[0];
    }

    return null;
  }

  const inaccessibles = [];

  let previousWindow, topWindow;
  const topOrigin = getOrigin(urls[0]);

  const windowList = urls.map((url, index) => {
    const thisOrigin = getOrigin(url),
      sameOriginAsPrevious = index === 0 ? true : (getOrigin(urls[index - 1]) === thisOrigin),
      sameOriginAsTop = thisOrigin === topOrigin;

    const win = {
      location: {
        href: url,
      },
      document: {
        referrer: index === 0 ? topReferrer : urls[index - 1]
      }
    };

    if (topWindow == null) {
      topWindow = win;
      win.document.querySelector = function (selector) {
        if (selector === 'link[rel=\'canonical\']') {
          return {
            href: canonicalUrl
          };
        }
        return null;
      };
    }

    if (sameOriginAsPrevious) {
      win.parent = previousWindow;
    } else {
      win.parent = inaccessibles[inaccessibles.length - 1];
    }
    if (ancestorOrigins) {
      win.location.ancestorOrigins = urls.slice(0, index).reverse().map(getOrigin);
    }
    win.top = sameOriginAsTop ? topWindow : inaccessibles[0];

    const inWin = {parent: inaccessibles[inaccessibles.length - 1], top: inaccessibles[0]};
    if (index === 0) {
      inWin.top = inWin;
    }
    ['document', 'location'].forEach((prop) => {
      Object.defineProperty(inWin, prop, {
        get: function () {
          throw new Error('cross-origin access');
        }
      });
    });
    inaccessibles.push(inWin);
    previousWindow = win;

    return win;
  });

  return windowList[windowList.length - 1];
}
