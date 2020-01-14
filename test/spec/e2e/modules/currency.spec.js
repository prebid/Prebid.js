const expect = require('chai').expect;
const { host, protocol } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/modules/currency.html?pbjs_debug=true`;
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/header-bid-tag-0_0"]';


describe('Prebid.js Banner Ad Unit Test', function () {
  before(function loadTestPage() {
    browser.url(TEST_PAGE_URL).pause(3000);
    try {
      browser.waitForExist(CREATIVE_IFRAME_CSS_SELECTOR, 2000);
      const creativeIframe = $(CREATIVE_IFRAME_CSS_SELECTOR).value;
      browser.frame(creativeIframe);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });


  it('should render the Banner Ad on the page', function () {
    expect(browser.isVisible('body > div[class="GoogleActiveViewElement"] > a > img')).to.be.true;
  });
});
