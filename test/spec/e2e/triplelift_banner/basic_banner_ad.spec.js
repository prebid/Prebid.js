const expect = require('chai').expect;
const { setupTest, switchFrame, testPageURL } = require('../../../helpers/testing-utils.js');

const TEST_PAGE_URL = testPageURL('triplelift_banner.html?pbjs_debug=true');
const CREATIVE_IFRAME_ID = 'google_ads_iframe_/19968336/header-bid-tag-0_0';
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="' + CREATIVE_IFRAME_ID + '"]';

setupTest({
  url: TEST_PAGE_URL,
  waitFor: CREATIVE_IFRAME_CSS_SELECTOR
}, `Prebid.js Banner Ad Unit Test (loading ${TEST_PAGE_URL})`, function () {
  it('should load the TripleLift bidder and installed modules', async function () {
    const { bidder, installedModules } = await browser.execute(function () {
      return {
        bidder: window.pbjs.adUnits[0].bids[0].bidder,
        installedModules: window.pbjs.installedModules,
      };
    });

    expect(bidder).to.equal('triplelift');
    expect(installedModules).to.include('tripleliftBidAdapter');
  });
});
it('should render the TripleLift banner ad on the page', async function() {
  await switchFrame(CREATIVE_IFRAME_CSS_SELECTOR);
  const existingImage = await $('img[src*="images.3lift.com/3303913.jpg"]').isExisting();
  expect(existingImage).to.be.true;
});
