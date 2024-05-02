const expect = require('chai').expect;
const {testPageURL, setupTest} = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = testPageURL('bidderSettings.html?pbjs_debug=true');
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/header-bid-tag-0_0"]';

const EXPECTED_TARGETING_KEYS = {
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
  hb_size_appnexus: '0x0',
};

setupTest({
  url: TEST_PAGE_URL,
  waitFor: CREATIVE_IFRAME_CSS_SELECTOR,
  expectGAMCreative: true
}, 'Prebid.js Bidder Settings Ad Unit Test', function () {
  it('should load the targeting keys with correct values', async function () {
    const result = await browser.execute(function () {
      return window.pbjs.getAdserverTargeting('/19968336/prebid_native_example_2');
    });

    const targetingKeys = result['/19968336/prebid_native_example_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    // check that custom (bidderSettings) keys are present
    expect(targetingKeys.apn_adId).to.be.a('string');
    expect(targetingKeys.apn_adId).to.equal(targetingKeys.hb_adid);
    expect(targetingKeys.apn_pbMg).to.equal('10.00');
  });
});
