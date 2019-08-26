const expect = require('chai').expect;
const { host, protocol } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/outstream.html`;
const CREATIVE_IFRAME_CSS_SELECTOR = 'div[id="video_ad_unit_1"] > div:nth-child(2) > iframe:nth-child(1)';

const EXPECTED_TARGETING_KEYS = {
  hb_cache_id: '',
  hb_uuid: '',
  hb_format: 'video',
  hb_source: 'client',
  hb_size: '640x480',
  hb_pb: '10.00',
  hb_bidder: 'appnexus',
  hb_format_appnexus: 'video',
  hb_source_appnexus: 'client',
  hb_size_appnexus: '640x480',
  hb_pb_appnexus: '10.00',
  hb_bidder_appnexus: 'appnexus'
};

describe('Prebid.js Outstream Video Ad Test', function () {
  before(function loadTestPage() {
    browser
      .url(TEST_PAGE_URL)
      .scroll(0, 300)
      .pause(3000);
    try {
      browser.waitForExist(CREATIVE_IFRAME_CSS_SELECTOR, 5000);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });

  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.pbjs.getAdserverTargeting('video_ad_unit_2');
    });

    const targetingKeys = result.value['video_ad_unit_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
  });

  it('should render the native ad on the page', function() {
    const creativeIframe = $(CREATIVE_IFRAME_CSS_SELECTOR).value;
    browser.frame(creativeIframe);
    expect(browser.isVisible('body > div[class="video-js"] > video'));
  });
});
