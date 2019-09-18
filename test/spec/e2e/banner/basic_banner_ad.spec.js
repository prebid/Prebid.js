const expect = require('chai').expect;
const { host, protocol } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/banner.html`;
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/header-bid-tag-0_0"]';

const EXPECTED_TARGETING_KEYS = {
  hb_format: 'banner',
  hb_source: 'client',
  hb_pb: '0.50',
  hb_bidder: 'appnexus',
  hb_format_appnexus: 'banner',
  hb_source_appnexus: 'client',
  hb_pb_appnexus: '0.50',
  hb_bidder_appnexus: 'appnexus'
}

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

  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.top.pbjs.getAdserverTargeting('div-gpt-ad-1460505748561-1');
    });

    const targetingKeys = result.value['div-gpt-ad-1460505748561-1'];

    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
    expect(targetingKeys.hb_size).to.satisfy((size) => size === '300x250' || '300x600');
  });

  it('should render the Banner Ad on the page', function () {
    expect(browser.isVisible('body > div[class="GoogleActiveViewElement"] > a > img')).to.be.true;
  });
});
