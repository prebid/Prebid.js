const expect = require('chai').expect;
const { setupTest, testPageURL, switchFrames } = require('../../../helpers/testing-utils.js');

const TEST_PAGE_URL = testPageURL('triplelift_banner.html?pbjs_debug=true');
const CREATIVE_IFRAME_CSS_SELECTOR = 'iframe[id="google_ads_iframe_/19968336/header-bid-tag-0_0"]';
const TL_IFRAME_CSS_SELECTOR = 'iframe[class*="tl-iframe"]';

describe('TLX Offline Warmup', function () {
  before(async function () {
    for (let i = 0; i < 3; i++) {
      await browser.url(TEST_PAGE_URL);
    }
  });
});

// setupTest({
//   url: TEST_PAGE_URL,
//   waitFor: CREATIVE_IFRAME_CSS_SELECTOR,
// }, `Prebid.js Banner Ad Unit Test (loading ${TEST_PAGE_URL})`, function () {
//   it('should render an image from img.3lift.com', async function () {
//     await switchFrames(CREATIVE_IFRAME_CSS_SELECTOR, 'iframe', TL_IFRAME_CSS_SELECTOR);
//     const existingImage = await $('img[src*="img.3lift.com"]').isExisting();
//     expect(existingImage).to.be.true;
//   });
// });
