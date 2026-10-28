import { expect } from 'chai';
import * as sinon from 'sinon';
import * as events from 'src/events.js';
import { EVENTS } from 'src/constants.js';
import { config } from 'src/config.js';
import { validClickUrl, hasClickthroughMacro } from 'modules/bidClickTracking.js';

describe('bidClickTracking', () => {
  let sandbox, slot, frame, bid, emitted;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    slot = document.createElement('div');
    slot.id = 'click-test';
    frame = document.createElement('iframe');
    slot.appendChild(frame);
    document.body.appendChild(slot);
    bid = { adId: 'click-1', adUnitCode: slot.id, bidder: 'testBidder', mediaType: 'banner', clickUrl: 'https://example.com/click', ad: '<div>ad</div>' };
    emitted = sandbox.spy(events, 'emit');
    sandbox.stub(window, 'matchMedia').returns({ matches: true });
    config.setConfig({ bidClickTracking: { enabled: true, fireTrackers: false } });
  });
  afterEach(() => {
    config.setConfig({ bidClickTracking: { enabled: false } });
    slot.remove();
    sandbox.restore();
  });

  it('accepts only resolved HTTPS URLs', () => {
    expect(validClickUrl('https://example.com/click')).to.equal(true);
    expect(validClickUrl('javascript:alert(1)')).to.equal(false);
    expect(validClickUrl('http://example.com/click')).to.equal(false);
    expect(validClickUrl('%%CLICK_URL_UNESC%%')).to.equal(false);
  });

  it('recognizes the ordinary bidder click macro', () => {
    expect(hasClickthroughMacro({ ad: '<a href="${CLICKTHROUGH}">Go</a>' })).to.equal(true);
    expect(hasClickthroughMacro(bid)).to.equal(false);
  });

  it('does not emit a click merely on hover or window blur', () => {
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    expect(emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED).length).to.equal(0);
  });

  it('cleans up tracking on refresh', () => {
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    events.emit(EVENTS.BEFORE_REQUEST_BIDS, { adUnitCodes: [bid.adUnitCode] });
    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    expect(emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED).length).to.equal(0);
  });

  it('does not track bidders that already supply a click macro', () => {
    bid.ad = '<a href="${CLICKTHROUGH}">Click</a>';
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    expect(emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED).length).to.equal(0);
  });
});
