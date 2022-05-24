const expect = require('chai').expect;
const { setupTest, testPageURL, switchFrame } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = testPageURL('outstream.html');
const CREATIVE_IFRAME_CSS_SELECTOR = 'div[id="video_ad_unit_1"] > div:nth-child(2) > iframe:nth-child(1)';

const EXPECTED_TARGETING_KEYS = {
  hb_format: 'video',
  hb_size: '640x480',
  hb_pb: '10.00',
  hb_bidder: 'appnexus',
  hb_format_appnexus: 'video',
  hb_size_appnexus: '640x480',
  hb_pb_appnexus: '10.00',
  hb_bidder_appnexus: 'appnexus'
};

setupTest({
  url: TEST_PAGE_URL,
  waitFor: CREATIVE_IFRAME_CSS_SELECTOR,
}, 'Prebid.js Outstream Video Ad Test', function () {
  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.pbjs.getAdserverTargeting('video_ad_unit_2');
    });

    const targetingKeys = result['video_ad_unit_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
  });

  it('should render the video ad on the page', function() {
    // skipping test in Edge due to wdio bug: https://github.com/webdriverio/webdriverio/issues/3880
    // the iframe for the video does not have a name property and id is generated automatically...
    if (browser.capabilities.browserName !== 'edge') {
      switchFrame(CREATIVE_IFRAME_CSS_SELECTOR);
      const ele = $('body > div[id*="an_video_ad_player"] > video');
      expect(ele.isExisting()).to.be.true;
    }
  });
});
