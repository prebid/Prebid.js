const expect = require('chai').expect;
const { testPageURL, setupTest } = require('../../../helpers/testing-utils.js');

const TEST_PAGE_URL = testPageURL('instream.html?pbjs_debug=true');
const ALERT_BOX_CSS_SELECTOR = 'div[id="event-window"] > p[id="statusText"]';

const EXPECTED_TARGETING_KEYS = {
  hb_format: 'video',
  hb_size: '640x480',
  hb_pb: '10.00',
  hb_bidder: 'msft',
  hb_format_msft: 'video',
  hb_size_msft: '640x480',
  hb_pb_msft: '10.00',
  hb_bidder_msft: 'msft'
};
setupTest({
  url: TEST_PAGE_URL,
  waitFor: ALERT_BOX_CSS_SELECTOR,
}, 'Prebid.js Instream Video Ad Test', function () {
  it('should load the targeting keys with correct values', async function () {
    const result = await browser.execute(function () {
      return window.top.pbjs.getAdserverTargeting('video1');
    });

    const targetingKeys = result['video1'];
    expect(targetingKeys).to.include(EXPECTED_TARGETING_KEYS);
    expect(targetingKeys.hb_adid).to.be.a('string');
    expect(targetingKeys.hb_adid_msft).to.be.a('string');
    expect(targetingKeys.hb_uuid).to.be.a('string');
    expect(targetingKeys.hb_uuid_msft).to.be.a('string');
  });
});
