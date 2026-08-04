const { expect } = require('chai');
const DEFAULT_TIMEOUT = 10000; // allow more time for BrowserStack sessions
const utils = {
  host: (process.env.TEST_SERVER_HOST) ? process.env.TEST_SERVER_HOST : 'localhost',
  protocol: (process.env.TEST_SERVER_PROTOCOL) ? 'https' : 'http',
  testPageURL: function(name) {
    return `${utils.protocol}://${utils.host}:9999/test/pages/${name}`;
  },
  waitForElement: async function(elementRef, time = DEFAULT_TIMEOUT) {
    const element = $(elementRef);
    await element.waitForExist({ timeout: time });
  },
  /**
   * Index of the iframe matched by `selector` within the current context's
   * `window.frames`, or -1. Frame indexes are the one frame locator that every
   * WebDriver dialect understands.
   */
  frameIndex: function(selector) {
    return browser.execute(function (selector) {
      var target = document.querySelector(selector);
      if (!target) return -1;
      for (var i = 0; i < window.frames.length; i++) {
        // identity comparison works cross-origin; reading into the frame would not
        if (window.frames[i] === target.contentWindow) return i;
      }
      return -1;
    }, selector);
  },
  switchFrame: async function(frameRef) {
    const iframe = await $(frameRef);
    await iframe.waitForExist({ timeout: DEFAULT_TIMEOUT });
    // Legacy JSONWire drivers (e.g. the chromedriver 2.x that ships with older
    // BrowserStack images) reject a serialized element as a frame locator with
    // "Unsupported frame locator: java.util.HashMap", because webdriverio posts
    // the whole element object. They do accept a numeric frame index, so prefer
    // that when we know we are not talking W3C.
    if (browser.isW3C === false && typeof frameRef === 'string') {
      const index = await utils.frameIndex(frameRef);
      if (index >= 0) {
        return browser.switchToFrame(index);
      }
    }
    await browser.switchFrame(iframe);
  },
  async loadAndWaitForElement(url, selector, pause = 5000, timeout = DEFAULT_TIMEOUT, retries = 3, attempt = 1) {
    await browser.url(url);
    await browser.pause(pause);
    if (selector != null) {
      try {
        await utils.waitForElement(selector, timeout);
      } catch (e) {
        if (attempt < retries) {
          await utils.loadAndWaitForElement(url, selector, pause, timeout, retries, attempt + 1);
        }
      }
    }
  },
  setupTest({ url, waitFor, expectGAMCreative = null, nestedIframe = true, pause = 5000, timeout = DEFAULT_TIMEOUT, retries = 3 }, name, fn) {
    describe(name, function () {
      this.retries(retries);
      before(() => utils.loadAndWaitForElement(url, waitFor, pause, timeout, retries));
      fn.call(this);
      if (expectGAMCreative) {
        expectGAMCreative = expectGAMCreative === true ? waitFor : expectGAMCreative;
        it(`should render GAM creative`, async () => {
          await utils.switchFrame(expectGAMCreative);
          if (nestedIframe) {
            await utils.switchFrame('iframe[srcdoc]');
          }
          const creative = [
            'a > img', // banner
            'div[class="card"]' // native
          ].join(', ');
          const existing = await $(creative).isExisting();
          expect(existing).to.be.true;
        });
      }
    });
  }
};

module.exports = utils;
