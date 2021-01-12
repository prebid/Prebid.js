const expect = require('chai').expect;
const { host, protocol, switchFrame, waitForElement } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/priceGranularity.html?pbjs_debug=true`;
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/header-bid-tag-0_0"]';

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

describe('Prebid.js Price Granularity Ad Unit Test', function () {
  this.retries(3);
  before(function loadTestPage() {
    browser.url(TEST_PAGE_URL);
    browser.pause(3000);
    try {
      waitForElement(CREATIVE_IFRAME_CSS_SELECTOR, 2000);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });

  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.pbjs.getAdserverTargeting('/19968336/prebid_native_example_2');
    });

    const targetingKeys = result['/19968336/prebid_native_example_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_native_body).to.be.a('string');
    expect(targetingKeys.hb_native_body_appne).to.be.a('string');
    expect(targetingKeys.hb_native_icon).to.be.a('string');
    expect(targetingKeys.hb_native_icon_appne).to.be.a('string');
    expect(targetingKeys.hb_native_image).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
  });

  it('should render the Banner Ad on the page', function () {
    switchFrame(CREATIVE_IFRAME_CSS_SELECTOR);
    const ele = $('body > div[class="GoogleActiveViewElement"] > a > img');
    expect(ele.isExisting()).to.be.true;
  });
});
