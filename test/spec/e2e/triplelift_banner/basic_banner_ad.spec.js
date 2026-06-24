const expect = require('chai').expect;
const { setupTest, switchFrame, testPageURL } = require('../../../helpers/testing-utils.js');

const TEST_PAGE_URL = testPageURL('triplelift_banner.html?pbjs_debug=true');
const CREATIVE_IFRAME_ID = 'google_ads_iframe_/19968336/header-bid-tag-0_0';
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="' + CREATIVE_IFRAME_ID + '"]';

Object.entries({
  'asynchronously': TEST_PAGE_URL,
}).forEach(([t, testPage]) => {
  setupTest({
    url: testPage,
    waitFor: CREATIVE_IFRAME_CSS_SELECTOR
  }, `Prebid.js Banner Ad Unit Test (loading ${t})`, function () {
    it('should load the targeting keys with correct values', async function () {
      const { adServerTargeting, bidder, installedModules } = await browser.execute(function () {
        return {
          bidder: window.pbjs.adUnits[0].bids[0].bidder,
          installedModules: window.pbjs.installedModules,
        };
      });

      expect(bidder).to.equal('triplelift');
      expect(installedModules).to.include('tripleliftBidAdapter');
    });
  });
});
