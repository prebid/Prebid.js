const {expect} = require('chai');
const DEFAULT_TIMEOUT = 10000; // allow more time for BrowserStack sessions
const utils = {
  host: (process.env.TEST_SERVER_HOST) ? process.env.TEST_SERVER_HOST : 'localhost',
  protocol: (process.env.TEST_SERVER_PROTOCOL) ? 'https' : 'http',
  testPageURL: function(name) {
    return `${utils.protocol}://${utils.host}:9999/test/pages/${name}`
  },
  waitForElement: async function(elementRef, time = DEFAULT_TIMEOUT) {
    const element = $(elementRef);
    await element.waitForExist({timeout: time});
  },
  switchFrame: async function(frameRef) {
    const iframe = await $(frameRef);
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
  setupTest({url, waitFor, expectGAMCreative = null, nestedIframe = true, pause = 5000, timeout = DEFAULT_TIMEOUT, retries = 3}, name, fn) {
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
}

module.exports = utils;
