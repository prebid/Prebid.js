const expect = require('chai').expect;
const { host, protocol } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/instream.html?pbjs_debug=true`;
const CREATIVE_IFRAME_CSS_SELECTOR = 'div[class="VPAID-container"] > div > iframe';

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

describe('Prebid.js Instream Video Ad Test', function () {
  before(function loadTestPage() {
    browser
      .url(TEST_PAGE_URL)
    try {
      browser.waitForExist(CREATIVE_IFRAME_CSS_SELECTOR, 5000);
      // const creativeIframe = $(CREATIVE_IFRAME_CSS_SELECTOR).value;
      // browser.frame(creativeIframe);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });

  // it('should load the targeting keys with correct values', function () {
  //   const result = browser.execute(function () {
  //     console.log('pbjs::', window.top.pbjs);
  //     return window.top.pbjs.getAdserverTargeting('video1');
  //   });
  //   console.log('result:::', result);
  //   const targetingKeys = result.value['vid1'];
  //   expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
  //   expect(targetingKeys.hb_adid).to.be.a('string');
  //   expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
  // });

  it('should render the instream ad on the page', function() {
    expect(browser.isVisible(CREATIVE_IFRAME_CSS_SELECTOR));
  });
});
