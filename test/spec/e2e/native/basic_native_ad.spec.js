const expect = require('chai').expect;
const { setupTest, testPageURL } = require('../../../helpers/testing-utils.js');

const TEST_PAGE_URL = testPageURL('native.html?pbjs_debug=true');
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/prebid_native_example_1_0"]';

const EXPECTED_TARGETING_KEYS = {
  hb_pb_appnexus: '10.00',
  hb_format: 'native',
  hb_size: '0x0',
  hb_bidder_appnexus: 'appnexus',
  hb_pb: '10.00',
  hb_bidder: 'appnexus',
  hb_format_appnexus: 'native',
  hb_size_appnexus: '0x0'
}

setupTest({
  url: TEST_PAGE_URL,
  waitFor: CREATIVE_IFRAME_CSS_SELECTOR,
  expectGAMCreative: true,
  nestedIframe: false
}, 'Prebid.js Native Ad Unit Test', function () {
  it('should load the targeting keys with correct values', async function () {
    const result = await browser.execute(function () {
      return window.pbjs.getAdserverTargeting('/19968336/prebid_native_example_2');
    });

    const targetingKeys = result['/19968336/prebid_native_example_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
  });
})
