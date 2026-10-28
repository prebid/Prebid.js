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

  it('does not fire the click URL in event-only mode', () => {
    events.emit(EVENTS.BID_CLICK, { bid, adId: bid.adId, method: 'creativeClick' });
    expect(emitted.calledWith(EVENTS.BID_CLICK)).to.equal(true);
  });

  it('does not run desktop focus inference without desktopFallback', () => {
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    expect(emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED).length).to.equal(0);
  });

  it('does not emit a click merely on hover or window blur', () => {
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    expect(emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED).length).to.equal(0);
  });

  function focusRenderedFrame() {
    slot.dispatchEvent(new Event('pointerenter'));
    frame.focus();
    // Prove that the desktop focus heuristic has its necessary precondition.
    expect(document.activeElement).to.equal(frame);
    window.dispatchEvent(new Event('blur'));
  }

  function inferredClicks() {
    return emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED);
  }

  it('infers a click from focus entering a hovered creative iframe', () => {
    const clock = sandbox.useFakeTimers();
    config.setConfig({ bidClickTracking: { enabled: true, desktopFallback: true, fireTrackers: false } });
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    focusRenderedFrame();
    clock.tick(101);
    expect(inferredClicks().length).to.equal(1);
    expect(inferredClicks()[0].args[1]).to.include({ adId: bid.adId, method: 'iframeFocus' });
  });

  it('cleans up pending inference when the ad unit is requested again', () => {
    const clock = sandbox.useFakeTimers();
    config.setConfig({ bidClickTracking: { enabled: true, desktopFallback: true, fireTrackers: false } });
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    focusRenderedFrame();

    // BEFORE_REQUEST_BIDS carries an array of ad units, not an options object.
    // Refresh must remove listeners and cancel an already scheduled click inference.
    events.emit(EVENTS.BEFORE_REQUEST_BIDS, [{ code: bid.adUnitCode }]);
    clock.tick(101);
    expect(inferredClicks().length).to.equal(0);

    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    clock.tick(101);
    expect(inferredClicks().length).to.equal(0);
  });

  it('does not track bidders that already supply a click macro', () => {
    bid.ad = '<a href="${CLICKTHROUGH}">Click</a>';
    events.emit(EVENTS.AD_RENDER_SUCCEEDED, { bid, adId: bid.adId });
    slot.dispatchEvent(new Event('pointerenter'));
    window.dispatchEvent(new Event('blur'));
    expect(emitted.getCalls().filter(call => call.args[0] === EVENTS.BID_CLICK_INFERRED).length).to.equal(0);
  });
});
