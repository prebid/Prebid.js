const expect = require('chai').expect;
const { host, protocol, waitForElement } = require('../../../helpers/testing-utils');

const TEST_PAGE_URL = `${protocol}://${host}:9999/test/pages/instream.html?pbjs_debug=true`;
const ALERT_BOX_CSS_SELECTOR = 'div[id="event-window"] > p[id="statusText"]';

const EXPECTED_TARGETING_KEYS = {
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
  this.retries(3);
  before(function loadTestPage() {
    browser.url(TEST_PAGE_URL);
    browser.pause(5000);
    try {
      waitForElement(ALERT_BOX_CSS_SELECTOR, 3000);
    } catch (e) {
      // If creative Iframe didn't load, repeat the steps again!
      // Due to some reason if the Ad server doesn't respond, the test case will time out after 60000 ms as defined in file wdio.conf.js
      loadTestPage();
    }
  });

  it('should load the targeting keys with correct values', function () {
    const result = browser.execute(function () {
      return window.top.pbjs.getAdserverTargeting('video1');
    });

    const targetingKeys = result['video1'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_adid_appnexus).to.be.a('string');
    expect(targetingKeys.hb_uuid).to.be.a('string');
    expect(targetingKeys.hb_cache_id).to.be.a('string');
    expect(targetingKeys.hb_uuid_appnexus).to.be.a('string');
    expect(targetingKeys.hb_cache_id_appnexus).to.be.a('string');
  });
});
