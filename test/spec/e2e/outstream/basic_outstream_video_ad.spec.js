const expect = require('chai').expect;
const { host, protocol, waitForElement, switchFrame } = require('../../../helpers/testing-utils');

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
  this.retries(3);
  before(function loadTestPage() {
    browser.url(TEST_PAGE_URL);
    browser.execute(function () {
      return window.scrollBy(0, 300);
    });
    browser.pause(3000);
    try {
      waitForElement(CREATIVE_IFRAME_CSS_SELECTOR, 5000);
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

    const targetingKeys = result['video_ad_unit_2'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
  });

  it('should render the native ad on the page', function() {
    // skipping test in Edge due to wdio bug: https://github.com/webdriverio/webdriverio/issues/3880
    // the iframe for the video does not have a name property and id is generated automatically...
    if (browser.capabilities.browserName !== 'edge') {
      switchFrame(CREATIVE_IFRAME_CSS_SELECTOR);
      const ele = $('body > div[id*="an_video_ad_player"] > video');
      expect(ele.isExisting()).to.be.true;
    }
  });
});
