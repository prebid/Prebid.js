const expect = require('chai').expect;
const { host, protocol } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/native.html`;
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/prebid_native_example_1_0"]';

const EXPECTED_TARGETING_KEYS = {
  hb_source: 'client',
  hb_source_appnexus: 'client',
  hb_pb_appnexus: '10.00',
  hb_native_title_appn: 'This is a Prebid Native Creative',
  hb_native_linkurl: 'http://prebid.org/dev-docs/show-native-ads.html',
  hb_format: 'native',
  hb_native_brand: 'Prebid.org',
  hb_size: '0x0',
  hb_bidder_appnexus: 'appnexus',
  hb_native_linkurl_ap: 'http://prebid.org/dev-docs/show-native-ads.html',
  hb_native_title: 'This is a Prebid Native Creative',
  hb_pb: '10.00',
  hb_native_brand_appn: 'Prebid.org',
  hb_bidder: 'appnexus',
  hb_format_appnexus: 'native',
  hb_size_appnexus: '0x0'
}

describe('Prebid.js Native Ad Unit Test', function () {
  before(function loadTestPage() {
    browser.url(TEST_PAGE_URL).pause(3000);
    try {
      browser.waitForExist(CREATIVE_IFRAME_CSS_SELECTOR, 2000);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });

  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.top.pbjs.getAdserverTargeting('/19968336/prebid_native_example_2');
    });

    const targetingKeys = result.value['/19968336/prebid_native_example_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_native_body).to.be.a('string');
    expect(targetingKeys.hb_native_body_appne).to.be.a('string');
    expect(targetingKeys.hb_native_icon).to.be.a('string');
    expect(targetingKeys.hb_native_icon_appne).to.be.a('string');
    expect(targetingKeys.hb_native_image).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
  });

  it('should render the native ad on the page', function () {
    const creativeIframe = $(CREATIVE_IFRAME_CSS_SELECTOR).value;
    browser.frame(creativeIframe);
    expect(browser.isVisible('body > div[class="GoogleActiveViewElement"] > div[class="card"]')).to.be.true;
  });
});
