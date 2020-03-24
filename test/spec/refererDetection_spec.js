import { detectReferer } from 'src/refererDetection.js';
import { expect } from 'chai';

var mocks = {
  createFakeWindow: function (referrer, href) {
    return {
      document: {
        referrer: referrer
      },
      location: {
        href: href,
        // TODO: add ancestorOrigins to increase test coverage
      },
      parent: null,
      top: null
    };
  }
}

describe('referer detection', () => {
  it('should return referer details in nested friendly iframes', function() {
    // Fake window object to test friendly iframes
    // - Main page http://example.com/page.html
    // - - Iframe1 http://example.com/iframe1.html
    // - - - Iframe2 http://example.com/iframe2.html
    let mockIframe2WinObject = mocks.createFakeWindow('http://example.com/iframe1.html', 'http://example.com/iframe2.html');
    let mockIframe1WinObject = mocks.createFakeWindow('http://example.com/page.html', 'http://example.com/iframe1.html');
    let mainWinObject = mocks.createFakeWindow('http://example.com/page.html', 'http://example.com/page.html');
    mainWinObject.document.querySelector = function() {
      return {
        href: 'http://prebid.org'
      }
    }
    mockIframe2WinObject.parent = mockIframe1WinObject;
    mockIframe2WinObject.top = mainWinObject;
    mockIframe1WinObject.parent = mainWinObject;
    mockIframe1WinObject.top = mainWinObject;
    mainWinObject.top = mainWinObject;

    const getRefererInfo = detectReferer(mockIframe2WinObject);
    let result = getRefererInfo();
    let expectedResult = {
      referer: 'http://example.com/page.html',
      reachedTop: true,
      numIframes: 2,
      stack: [
        'http://example.com/page.html',
        'http://example.com/iframe1.html',
        'http://example.com/iframe2.html'
      ],
      canonicalUrl: 'http://prebid.org'
    };
    expect(result).to.deep.equal(expectedResult);
  });

  it('should return referer details in nested cross domain iframes', function() {
    // Fake window object to test cross domain iframes.
    // - Main page http://example.com/page.html
    // - - Iframe1 http://aaa.com/iframe1.html
    // - - - Iframe2 http://bbb.com/iframe2.html
    let mockIframe2WinObject = mocks.createFakeWindow('http://aaa.com/iframe1.html', 'http://bbb.com/iframe2.html');
    // Sinon cannot throw exception when accessing a propery so passing null to create cross domain
    // environment for refererDetection module
    let mockIframe1WinObject = mocks.createFakeWindow(null, null);
    let mainWinObject = mocks.createFakeWindow(null, null);
    mockIframe2WinObject.parent = mockIframe1WinObject;
    mockIframe2WinObject.top = mainWinObject;
    mockIframe1WinObject.parent = mainWinObject;
    mockIframe1WinObject.top = mainWinObject;
    mainWinObject.top = mainWinObject;

    const getRefererInfo = detectReferer(mockIframe2WinObject);
    let result = getRefererInfo();
    let expectedResult = {
      referer: 'http://aaa.com/iframe1.html',
      reachedTop: false,
      numIframes: 2,
      stack: [
        null,
        'http://aaa.com/iframe1.html',
        'http://bbb.com/iframe2.html'
      ],
      canonicalUrl: undefined
    };
    expect(result).to.deep.equal(expectedResult);
  });
});
