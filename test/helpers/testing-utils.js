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
   * Return the driver to the top-level document. Nothing else does this, so a test
   * that switched into an iframe leaves the context there - and because
   * `setupTest` sets `this.retries(..)` while `before` only runs once, every retry
   * would then look for a top-level element from inside the frame and fail with
   * "still not existing", regardless of why the first attempt failed.
   */
  topFrame: function() {
    // Deliberately a no-op on W3C sessions: webdriverio's bidi implementation tracks
    // the active context itself, and switching to the top level mid-test makes it
    // report "execution contexts cleared" and lose the frame. Legacy drivers have no
    // such bookkeeping and do need the explicit reset.
    return browser.isW3C === false ? browser.switchToFrame(null) : Promise.resolve();
  },
  switchFrame: async function(frameRef) {
    const iframe = await $(frameRef);
    await iframe.waitForExist({ timeout: DEFAULT_TIMEOUT });
    // Legacy JSONWire drivers (the chromedriver 2.x that ships with older BrowserStack
    // images) reject webdriverio's frame locator: it posts the entire element object,
    // which deserializes to a HashMap rather than a WebElement, giving
    // "Unsupported frame locator: java.util.HashMap". They do accept the legacy
    // `{ELEMENT: id}` reference.
    //
    // Do not be tempted to pass a frame *index* instead. It is accepted by every
    // dialect, but this driver does not order frames the way `window.frames` does,
    // so a correctly computed index silently selects a different document - which
    // looks exactly like the creative having failed to render.
    if (browser.isW3C === false) {
      return browser.switchToFrame({ ELEMENT: iframe.elementId });
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
          // a previous attempt may have left us inside the creative's iframe
          await utils.topFrame();
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
