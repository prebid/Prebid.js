const { expect } = require('chai');
const { testPageURL, switchFrames, topFrame, host } = require('../../../helpers/testing-utils.js');

const SERVER = `http://${host}:4444`;

async function collected(run) {
  const res = await fetch(`${SERVER}/analytics?run=${encodeURIComponent(run)}`);
  return res.json();
}

describe('Prebid.js bidClick on a same-tab creative click', function () {
  this.retries(3);

  it('should reach analytics although the click navigates the page away', async function () {
    const run = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await topFrame();
    await browser.url(testPageURL(`bid_click_same_tab.html?pbjs_debug=true&run=${run}`));
    // the creative is rendered by pbjs.renderAd into #ad-frame, in a nested srcdoc iframe
    await switchFrames('#ad-frame', 'iframe[srcdoc]');
    const link = await $('#click-me');
    await link.waitForExist({ timeout: 10000 });
    await link.click();

    let result;
    await browser.waitUntil(async () => {
      result = await collected(run);
      return result.landed && result.analytics.length > 0;
    }, { timeout: 10000, interval: 250 }).catch(() => {});

    expect(result.landed, 'the click navigated the tab to the landing page').to.be.true;
    const events = result.analytics.flatMap(body => JSON.parse(body));
    const click = events.find(event => event.eventType === 'bidClick');
    expect(click, 'bidClick was sent to analytics').to.exist;
    expect(click.method).to.equal('creativeClick');
    expect(click.adId).to.be.a('string');
  });
});
