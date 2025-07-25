const expect = require('chai').expect;
const { testPageURL, setupTest } = require('../../../helpers/testing-utils.js');

const TEST_PAGE_URL = testPageURL('multiple_bidders.html?pbjs_debug=true');
const CREATIVE_BANNER_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/prebid_multiformat_test_0"]';

const EXPECTED_TARGETING_KEYS = {
  hb_pb_adasta: '10.00',
  hb_format: 'native',
  hb_size: '0x0',
  hb_bidder_adasta: 'adasta',
  hb_pb: '10.00',
  hb_bidder: 'adasta',
  hb_format_adasta: 'native',
  hb_size_adasta: '0x0'
};

setupTest({
  url: TEST_PAGE_URL,
  waitFor: CREATIVE_BANNER_CSS_SELECTOR,
  expectGAMCreative: true,
}, 'Prebid.js Multiple Bidder Ad Unit Test', function () {
  it('should load the targeting keys with correct values', async function () {
    const result = await browser.execute(function () {
      return window.pbjs.getAdserverTargeting('div-banner-native-2');
    });

    const targetingKeys = result['div-banner-native-2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
  });
})
