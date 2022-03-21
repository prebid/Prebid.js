const expect = require('chai').expect;
const { host, protocol, waitForElement, switchFrame } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/multiple_bidders.html?pbjs_debug=true`;
const CREATIVE_BANNER_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/prebid_multiformat_test_0"]';

const EXPECTED_TARGETING_KEYS = {
  hb_source: 'client',
  hb_source_adasta: 'client',
  hb_pb_adasta: '10.00',
  hb_native_title_adas: 'This is a Prebid Native Creative',
  hb_native_linkurl: 'http://prebid.org/dev-docs/show-multi-format-ads.html',
  hb_format: 'native',
  hb_native_brand: 'Prebid.org',
  hb_size: '0x0',
  hb_bidder_adasta: 'adasta',
  hb_native_linkurl_ad: 'http://prebid.org/dev-docs/show-multi-format-ads.html',
  hb_native_title: 'This is a Prebid Native Creative',
  hb_pb: '10.00',
  hb_native_brand_adas: 'Prebid.org',
  hb_bidder: 'adasta',
  hb_format_adasta: 'native',
  hb_size_adasta: '0x0'
};

describe('Prebid.js Multiple Bidder Ad Unit Test', function () {
  this.retries(3);
  before(function loadTestPage() {
    browser.url(TEST_PAGE_URL);
    browser.pause(5000);
    try {
      waitForElement(CREATIVE_BANNER_CSS_SELECTOR, 3000);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });

  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.pbjs.getAdserverTargeting('div-banner-native-2');
    });

    const targetingKeys = result['div-banner-native-2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_native_image).to.be.a('string');
    expect(targetingKeys.hb_native_image_adas).to.be.a('string');
    expect(targetingKeys.hb_adid_adasta).to.be.a('string');
  });

  it('should render the Banner Ad on the page', function () {
    switchFrame(CREATIVE_BANNER_CSS_SELECTOR);
    let ele = $('body > div[class="GoogleActiveViewElement"] > a > img');
    expect(ele.isExisting()).to.be.true;
  });

  // it('should render the native ad on the  page', function () {
  //   browser.switchToParentFrame();
  //   waitForElement(CREATIVE_NATIVE_CSS_SELECTOR, 3000);
  //   switchFrame(CREATIVE_NATIVE_CSS_SELECTOR);

  //   let ele = $('body > div[class="GoogleActiveViewElement"] > div[class="card"]');
  //   expect(ele.isExisting()).to.be.true;
  // });
});
