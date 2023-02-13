import {detectReferer, ensureProtocol, parseDomain} from 'src/refererDetection.js';
import {config} from 'src/config.js';
import {expect} from 'chai';

import { buildWindowTree } from '../helpers/refererDetectionHelper';

describe('Referer detection', () => {
  afterEach(function () {
    config.resetConfig();
  });

  describe('Non cross-origin scenarios', () => {
    describe('No iframes', () => {
      it('Should return the current window location and no canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page'], 'https://othersite.com/'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page',
          location: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://example.com/some/page'],
          canonicalUrl: null,
          page: 'https://example.com/some/page',
          ref: 'https://othersite.com/',
          domain: 'example.com',
        });
      });

      it('Should return the current window location and a canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page',
          location: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://example.com/some/page'],
          canonicalUrl: 'https://example.com/canonical/page',
          page: 'https://example.com/some/page',
          ref: 'https://othersite.com/',
          domain: 'example.com'
        });
      });

      it('Should set page and canonical to pageUrl value set in config if present, even if canonical url is also present in head', () => {
        config.setConfig({'pageUrl': 'https://www.set-from-config.com/path'});
        const testWindow = buildWindowTree(['https://example.com/some/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page',
          location: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://example.com/some/page'],
          canonicalUrl: 'https://www.set-from-config.com/path',
          page: 'https://www.set-from-config.com/path',
          ref: 'https://othersite.com/',
          domain: 'www.set-from-config.com'
        });
      });

      it('Should set page with query params if canonical url is present without query params but the current page does have them', () => {
        config.setConfig({'pageUrl': 'https://www.set-from-config.com/path'});
        const testWindow = buildWindowTree(['https://example.com/some/page?query1=123&query2=456'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page?query1=123&query2=456',
          location: 'https://example.com/some/page?query1=123&query2=456',
          reachedTop: true,
          isAmp: false,
          numIframes: 0,
          stack: ['https://example.com/some/page?query1=123&query2=456'],
          canonicalUrl: 'https://www.set-from-config.com/path',
          page: 'https://www.set-from-config.com/path?query1=123&query2=456',
          ref: 'https://othersite.com/',
          domain: 'www.set-from-config.com'
        });
      });
    });

    describe('Friendly iframes', () => {
      it('Should return the top window location and no canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page', 'https://example.com/other/page', 'https://example.com/third/page'], 'https://othersite.com/'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page',
          location: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 2,
          stack: [
            'https://example.com/some/page',
            'https://example.com/other/page',
            'https://example.com/third/page'
          ],
          canonicalUrl: null,
          page: 'https://example.com/some/page',
          ref: 'https://othersite.com/',
          domain: 'example.com'
        });
      });

      it('Should return the top window location and a canonical URL', () => {
        const testWindow = buildWindowTree(['https://example.com/some/page', 'https://example.com/other/page', 'https://example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page',
          location: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 2,
          stack: [
            'https://example.com/some/page',
            'https://example.com/other/page',
            'https://example.com/third/page'
          ],
          canonicalUrl: 'https://example.com/canonical/page',
          page: 'https://example.com/some/page',
          ref: 'https://othersite.com/',
          domain: 'example.com'
        });
      });

      it('Should override canonical URL (and page) with config pageUrl', () => {
        config.setConfig({'pageUrl': 'https://testurl.com'});

        const testWindow = buildWindowTree(['https://example.com/some/page', 'https://example.com/other/page', 'https://example.com/third/page'], 'https://othersite.com/', 'https://example.com/canonical/page'),
          result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page',
          location: 'https://example.com/some/page',
          reachedTop: true,
          isAmp: false,
          numIframes: 2,
          stack: [
            'https://example.com/some/page',
            'https://example.com/other/page',
            'https://example.com/third/page'
          ],
          canonicalUrl: 'https://testurl.com',
          page: 'https://testurl.com',
          ref: 'https://othersite.com/',
          domain: 'testurl.com'
        });
      });
    });
  });

  describe('Cross-origin scenarios', () => {
    it('Should return the top URL and no canonical URL with one cross-origin iframe', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad'], 'https://othersite.com/', 'https://canonical.example.com/'),
        result = detectReferer(testWindow)();

      sinon.assert.match(result, {
        location: 'https://example.com/some/page',
        topmostLocation: 'https://example.com/some/page',
        reachedTop: true,
        isAmp: false,
        numIframes: 1,
        stack: [
          'https://example.com/some/page',
          'https://safe.frame/ad'
        ],
        canonicalUrl: null,
        page: 'https://example.com/some/page',
        ref: null,
        domain: 'example.com'
      });
    });

    it('Should return the top URL and no canonical URL with one cross-origin iframe and one friendly iframe', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad', 'https://safe.frame/ad'], 'https://othersite.com/', 'https://canonical.example.com/'),
        result = detectReferer(testWindow)();

      sinon.assert.match(result, {
        topmostLocation: 'https://example.com/some/page',
        location: 'https://example.com/some/page',
        reachedTop: true,
        isAmp: false,
        numIframes: 2,
        stack: [
          'https://example.com/some/page',
          'https://safe.frame/ad',
          'https://safe.frame/ad'
        ],
        canonicalUrl: null,
        page: 'https://example.com/some/page',
        ref: null,
        domain: 'example.com',
      });
    });

    it('Should return the second iframe location with three cross-origin windows and no ancestorOrigins', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad', 'https://otherfr.ame/ad'], 'https://othersite.com/', 'https://canonical.example.com/'),
        result = detectReferer(testWindow)();

      sinon.assert.match(result, {
        topmostLocation: 'https://safe.frame/ad',
        location: null,
        reachedTop: false,
        isAmp: false,
        numIframes: 2,
        stack: [
          null,
          'https://safe.frame/ad',
          'https://otherfr.ame/ad'
        ],
        canonicalUrl: null,
        page: null,
        ref: null,
        domain: null
      });
    });

    it('Should return the top window origin with three cross-origin windows with ancestorOrigins', () => {
      const testWindow = buildWindowTree(['https://example.com/some/page', 'https://safe.frame/ad', 'https://otherfr.ame/ad'], 'https://othersite.com/', 'https://canonical.example.com/', true),
        result = detectReferer(testWindow)();

      sinon.assert.match(result, {
        topmostLocation: 'https://example.com/',
        location: 'https://example.com/',
        reachedTop: false,
        isAmp: false,
        numIframes: 2,
        stack: [
          'https://example.com/',
          'https://safe.frame/ad',
          'https://otherfr.ame/ad'
        ],
        canonicalUrl: null,
        page: 'https://example.com/',
        ref: null,
        domain: 'example.com'
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

      sinon.assert.match(result, {
        location: 'https://example.com/some/page/amp/',
        topmostLocation: 'https://example.com/some/page/amp/',
        reachedTop: true,
        isAmp: true,
        numIframes: 1,
        stack: [
          'https://example.com/some/page/amp/',
          'https://ad-iframe.ampproject.org/ad'
        ],
        canonicalUrl: 'https://example.com/some/page/',
        page: 'https://example.com/some/page/amp/',
        ref: null,
        domain: 'example.com'
      });
    });

    it('Should return the AMP page source and canonical URLs in an amp-ad iframe for a cached AMP page on top', () => {
      const testWindow = buildWindowTree(['https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad']);

      testWindow.context = {
        sourceUrl: 'https://example.com/some/page/amp/',
        canonicalUrl: 'https://example.com/some/page/'
      };

      const result = detectReferer(testWindow)();

      sinon.assert.match(result, {
        topmostLocation: 'https://example.com/some/page/amp/',
        location: 'https://example.com/some/page/amp/',
        reachedTop: true,
        isAmp: true,
        numIframes: 1,
        stack: [
          'https://example.com/some/page/amp/',
          'https://ad-iframe.ampproject.org/ad'
        ],
        canonicalUrl: 'https://example.com/some/page/',
        page: 'https://example.com/some/page/amp/',
        ref: null,
        domain: 'example.com'
      });
    });

    it('should respect pageUrl as the primary source of canonicalUrl', () => {
      config.setConfig({
        pageUrl: 'pub-defined'
      });
      const w = buildWindowTree(['https://example.com', 'https://amp.com']);
      w.context = {
        canonicalUrl: 'should-be-overridden'
      };
      expect(detectReferer(w)().canonicalUrl).to.equal('pub-defined');
    });

    describe('Cached AMP page in iframed search result', () => {
      it('Should return the AMP source and canonical URLs but with a null top-level stack location Without ancesorOrigins', () => {
        const testWindow = buildWindowTree(['https://google.com/amp/example-com/some/page/amp/', 'https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad']);

        testWindow.context = {
          sourceUrl: 'https://example.com/some/page/amp/',
          canonicalUrl: 'https://example.com/some/page/'
        };

        const result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          topmostLocation: 'https://example.com/some/page/amp/',
          location: 'https://example.com/some/page/amp/',
          reachedTop: false,
          isAmp: true,
          numIframes: 2,
          stack: [
            null,
            'https://example.com/some/page/amp/',
            'https://ad-iframe.ampproject.org/ad'
          ],
          canonicalUrl: 'https://example.com/some/page/',
          page: 'https://example.com/some/page/amp/',
          ref: null,
          domain: 'example.com',
        });
      });

      it('Should return the AMP source and canonical URLs and include the top window origin in the stack with ancesorOrigins', () => {
        const testWindow = buildWindowTree(['https://google.com/amp/example-com/some/page/amp/', 'https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad'], null, null, true);

        testWindow.context = {
          sourceUrl: 'https://example.com/some/page/amp/',
          canonicalUrl: 'https://example.com/some/page/'
        };

        const result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          location: 'https://example.com/some/page/amp/',
          topmostLocation: 'https://example.com/some/page/amp/',
          reachedTop: false,
          isAmp: true,
          numIframes: 2,
          stack: [
            'https://google.com/',
            'https://example.com/some/page/amp/',
            'https://ad-iframe.ampproject.org/ad'
          ],
          canonicalUrl: 'https://example.com/some/page/',
          page: 'https://example.com/some/page/amp/',
          ref: null,
          domain: 'example.com'
        });
      });

      it('Should return the AMP source and canonical URLs and include the top window origin in the stack with ancesorOrigins and a friendly iframe under the amp-ad iframe', () => {
        const testWindow = buildWindowTree(['https://google.com/amp/example-com/some/page/amp/', 'https://example-com.amp-cache.example.com/some/page/amp/', 'https://ad-iframe.ampproject.org/ad', 'https://ad-iframe.ampproject.org/ad'], null, null, true);

        testWindow.parent.context = {
          sourceUrl: 'https://example.com/some/page/amp/',
          canonicalUrl: 'https://example.com/some/page/'
        };

        const result = detectReferer(testWindow)();

        sinon.assert.match(result, {
          location: 'https://example.com/some/page/amp/',
          topmostLocation: 'https://example.com/some/page/amp/',
          reachedTop: false,
          isAmp: true,
          numIframes: 3,
          stack: [
            'https://google.com/',
            'https://example.com/some/page/amp/',
            'https://ad-iframe.ampproject.org/ad',
            'https://ad-iframe.ampproject.org/ad'
          ],
          canonicalUrl: 'https://example.com/some/page/',
          page: 'https://example.com/some/page/amp/',
          ref: null,
          domain: 'example.com',
        });
      });
    });
  });
});

describe('ensureProtocol', () => {
  ['', null, undefined].forEach((val) => {
    it(`should return unchanged invalid input: ${val}`, () => {
      expect(ensureProtocol(val)).to.eql(val);
    });
  });

  ['http:', 'https:'].forEach((protocol) => {
    Object.entries({
      'window.top.location.protocol': {
        top: {
          location: {
            protocol
          }
        },
        location: {
          protocol: 'unused'
        }
      },
      'window.location.protocol': (() => {
        const w = {
          top: {},
          location: {
            protocol
          }
        };
        Object.defineProperty(w.top, 'location', {
          get: function () {
            throw new Error('cross-origin');
          }
        });
        return w;
      })(),
    }).forEach(([t, win]) => {
      describe(`when ${t} declares ${protocol}`, () => {
        Object.entries({
          'declared': {
            url: 'proto://example.com/page',
            expect: 'proto://example.com/page'
          },
          'relative': {
            url: '//example.com/page',
            expect: `${protocol}//example.com/page`
          },
          'missing': {
            url: 'example.com/page',
            expect: `${protocol}//example.com/page`
          }
        }).forEach(([t, {url, expect: expected}]) => {
          it(`should handle URLs with ${t} protocols`, () => {
            expect(ensureProtocol(url, win)).to.equal(expected);
          });
        });
      });
    });
  });
});

describe('parseDomain', () => {
  Object.entries({
    'www.example.com': 'www.example.com',
    'example.com:443': 'example.com:443',
    'www.sub.example.com': 'www.sub.example.com',
    'example.com/page': 'example.com',
    'www.example.com:443/page': 'www.example.com:443',
    'http://www.example.com:443/page?query=value': 'www.example.com:443',
    '': undefined,
  }).forEach(([input, expected]) => {
    it(`should extract domain from '${input}' -> '${expected}`, () => {
      expect(parseDomain(input)).to.equal(expected);
    });
  });
  Object.entries({
    'www.example.com': 'example.com',
    'https://www.sub.example.com': 'sub.example.com',
    '//www.example.com:443': 'example.com:443',
    'without.www.example.com': 'without.www.example.com'
  }).forEach(([input, expected]) => {
    it('should remove leading www if requested', () => {
      expect(parseDomain(input, {noLeadingWww: true})).to.equal(expected);
    })
  });
  Object.entries({
    'example.com:443': 'example.com',
    'https://sub.example.com': 'sub.example.com',
    'http://sub.example.com:8443': 'sub.example.com'
  }).forEach(([input, expected]) => {
    it('should remove port if requested', () => {
      expect(parseDomain(input, {noPort: true})).to.equal(expected);
    })
  })
});
