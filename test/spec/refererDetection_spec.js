import { detectReferer } from 'src/refererDetection.js';
import { config } from 'src/config.js';
import { expect } from 'chai';

/**
 * Build a walkable linked list of window-like objects for testing.
 *
 * @param {Array} urls Array of URL strings starting from the top window.
 * @param {string} [topReferrer]
 * @param {string} [canonicalUrl]
 * @param {boolean} [ancestorOrigins]
 * @returns {Object}
 */
function buildWindowTree(urls, topReferrer = '', canonicalUrl = null, ancestorOrigins = false) {
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

  let previousWindow;
  const myOrigin = getOrigin(urls[urls.length - 1]);

  const windowList = urls.map((url, index) => {
    const theirOrigin = getOrigin(url),
      sameOrigin = (myOrigin === theirOrigin);

    const win = {};

    if (sameOrigin) {
      win.location = {
        href: url
      };

      if (ancestorOrigins) {
        win.location.ancestorOrigins = urls.slice(0, index).reverse().map(getOrigin);
      }

      if (index === 0) {
        win.document = {
          referrer: topReferrer
        };

        if (canonicalUrl) {
          win.document.querySelector = function(selector) {
            if (selector === "link[rel='canonical']") {
              return {
                href: canonicalUrl
              };
            }

            return null;
          };
        }
      } else {
        win.document = {
          referrer: urls[index - 1]
        };
      }
    }

    previousWindow = win;

    return win;
  });

  const topWindow = windowList[0];

  previousWindow = null;

  windowList.forEach((win) => {
    win.top = topWindow;
    win.parent = previousWindow || topWindow;
    previousWindow = win;
  });

  return windowList[windowList.length - 1];
}

describe('Referer detection', () => {
  describe('Non cross-origin scenarios', () => {
    describe('No iframes', () => {
      afterEach(function () {
        config.resetConfig();
      });

      it('Should return the current window location and no canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page'], 'https://othersite.com/'),
          result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://example.com/some/page'],
          canonicalUrl: null
        });
      });

      it('Should return the current window location and a canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://example.com/some/page'],
          canonicalUrl: 'https://example.com/canonical/page'
        });
      });
    });

    describe('Friendly iframes', () => {
      it('Should return the top window location and no canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page', 'https://example.com/other/page', 'https://example.com/third/page'], 'https://othersite.com/'),
          result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 2,
          stack: [
            'https://example.com/some/page',
            'https://example.com/other/page',
            'https://example.com/third/page'
          ],
          canonicalUrl: null
        });
      });

      it('Should return the top window location and a canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page', 'https://example.com/other/page', 'https://example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 2,
          stack: [
            'https://example.com/some/page',
            'https://example.com/other/page',
            'https://example.com/third/page'
          ],
          canonicalUrl: 'https://example.com/canonical/page'
        });
      });

      it('Should override canonical URL with config pageUrl', () => {
        config.setConfig({'pageUrl': 'testUrl.com'});

        const testWindow = buildWindowTree(['https://example.com/some/page', 'https://example.com/other/page', 'https://example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 2,
          stack: [
            'https://example.com/some/page',
            'https://example.com/other/page',
            'https://example.com/third/page'
          ],
          canonicalUrl: 'testUrl.com'
        });
      });
    });
  });

  describe('Cross-origin scenarios', () => {
    it('Should return the top URL and no canonical URL with one cross-origin iframe', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad'], 'https://othersite.com/', 'https://canonical.example.com/'),
        result = detectReferer(testWindow)();

      expect(result).to.deep.equal({
        referer: 'https://example.com/some/page',
        reachedTop: true,
        isAmp: false,
        numIframes: 1,
        stack: [
          'https://example.com/some/page',
          'https://safe.frame/ad'
        ],
        canonicalUrl: null
      });
    });

    it('Should return the top URL and no canonical URL with one cross-origin iframe and one friendly iframe', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad', 'https://safe.frame/ad'], 'https://othersite.com/', 'https://canonical.example.com/'),
        result = detectReferer(testWindow)();

      expect(result).to.deep.equal({
        referer: 'https://example.com/some/page',
        reachedTop: true,
        isAmp: false,
        numIframes: 2,
        stack: [
          'https://example.com/some/page',
          'https://safe.frame/ad',
          'https://safe.frame/ad'
        ],
        canonicalUrl: null
      });
    });

    it('Should return the second iframe location with three cross-origin windows and no ancessorOrigins', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad', 'https://otherfr.ame/ad'], 'https://othersite.com/', 'https://canonical.example.com/'),
        result = detectReferer(testWindow)();

      expect(result).to.deep.equal({
        referer: 'https://safe.frame/ad',
        reachedTop: false,
        isAmp: false,
        numIframes: 2,
        stack: [
          null,
          'https://safe.frame/ad',
          'https://otherfr.ame/ad'
        ],
        canonicalUrl: null
      });
    });

    it('Should return the top window origin with three cross-origin windows with ancessorOrigins', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad', 'https://otherfr.ame/ad'], 'https://othersite.com/', 'https://canonical.example.com/', true),
        result = detectReferer(testWindow)();

      expect(result).to.deep.equal({
        referer: 'https://example.com/',
        reachedTop: false,
        isAmp: false,
        numIframes: 2,
        stack: [
          'https://example.com/',
          'https://safe.frame/ad',
          'https://otherfr.ame/ad'
        ],
        canonicalUrl: null
      });
    });
  });

  describe('Cross-origin AMP page scenarios', () => {
    it('Should return the AMP page source and canonical URLs in an amp-ad iframe for a non-cached AMP page', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad']);

      testWindow.context = {
        sourceUrl: 'https://example.com/some/page/amp/',
        canonicalUrl: 'https://example.com/some/page/'
      };

      const result = detectReferer(testWindow)();

      expect(result).to.deep.equal({
        referer: 'https://example.com/some/page/amp/',
        reachedTop: true,
        isAmp: true,
        numIframes: 1,
        stack: [
          'https://example.com/some/page/amp/',
          'https://ad-iframe.ampproject.org/ad'
        ],
        canonicalUrl: 'https://example.com/some/page/'
      });
    });

    it('Should return the AMP page source and canonical URLs in an amp-ad iframe for a cached AMP page on top', () => {
      const testWindow = buildWindowTree(['https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad']);

      testWindow.context = {
        sourceUrl: 'https://example.com/some/page/amp/',
        canonicalUrl: 'https://example.com/some/page/'
      };

      const result = detectReferer(testWindow)();

      expect(result).to.deep.equal({
        referer: 'https://example.com/some/page/amp/',
        reachedTop: true,
        isAmp: true,
        numIframes: 1,
        stack: [
          'https://example.com/some/page/amp/',
          'https://ad-iframe.ampproject.org/ad'
        ],
        canonicalUrl: 'https://example.com/some/page/'
      });
    });

    describe('Cached AMP page in iframed search result', () => {
      it('Should return the AMP source and canonical URLs but with a null top-level stack location Without ancesorOrigins', () => {
        const testWindow = buildWindowTree(['https://google.com/amp/example-com/some/page/amp/', 'https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad']);

        testWindow.context = {
          sourceUrl: 'https://example.com/some/page/amp/',
          canonicalUrl: 'https://example.com/some/page/'
        };

        const result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page/amp/',
          reachedTop: false,
          isAmp: true,
          numIframes: 2,
          stack: [
            null,
            'https://example.com/some/page/amp/',
            'https://ad-iframe.ampproject.org/ad'
          ],
          canonicalUrl: 'https://example.com/some/page/'
        });
      });

      it('Should return the AMP source and canonical URLs and include the top window origin in the stack with ancesorOrigins', () => {
        const testWindow = buildWindowTree(['https://google.com/amp/example-com/some/page/amp/', 'https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad'], null, null, true);

        testWindow.context = {
          sourceUrl: 'https://example.com/some/page/amp/',
          canonicalUrl: 'https://example.com/some/page/'
        };

        const result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page/amp/',
          reachedTop: false,
          isAmp: true,
          numIframes: 2,
          stack: [
            'https://google.com/',
            'https://example.com/some/page/amp/',
            'https://ad-iframe.ampproject.org/ad'
          ],
          canonicalUrl: 'https://example.com/some/page/'
        });
      });

      it('Should return the AMP source and canonical URLs and include the top window origin in the stack with ancesorOrigins and a friendly iframe under the amp-ad iframe', () => {
        const testWindow = buildWindowTree(['https://google.com/amp/example-com/some/page/amp/', 'https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad', 'https://ad-iframe.ampproject.org/ad'], null, null, true);

        testWindow.parent.context = {
          sourceUrl: 'https://example.com/some/page/amp/',
          canonicalUrl: 'https://example.com/some/page/'
        };

        const result = detectReferer(testWindow)();

        expect(result).to.deep.equal({
          referer: 'https://example.com/some/page/amp/',
          reachedTop: false,
          isAmp: true,
          numIframes: 3,
          stack: [
            'https://google.com/',
            'https://example.com/some/page/amp/',
            'https://ad-iframe.ampproject.org/ad',
            'https://ad-iframe.ampproject.org/ad'
          ],
          canonicalUrl: 'https://example.com/some/page/'
        });
      });
    });
  });
});
