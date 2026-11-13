import { expect } from 'chai';
import 'src/prebid.js';
import { spec } from 'modules/splashBidAdapter.js';
import { config } from 'src/config.js';

const BID_ID = 'splash-controls-bid';
const SLOT_ID = 'splash-controls-slot';
const OWNER_SOURCE = 'froc-display';
const CONTROLS_TYPE = 'interstitial-controls';

function buildInterstitial(adm) {
  const bid = {
    bidder: 'splash',
    bidId: BID_ID,
    adUnitCode: SLOT_ID,
    params: { publisherId: '725', placementId: '100023', displayFormat: 'interstitial' },
    mediaTypes: { banner: { sizes: [[320, 480]] } },
    allowTopWindowRenderers: true,
    ortb2Imp: {},
  };
  const requests = spec.buildRequests([bid], {
    bidderCode: 'splash',
    bidderRequestId: 'splash-controls-request',
    auctionId: 'splash-controls-auction',
    timeout: 1500,
    refererInfo: { page: 'https://publisher.example/page', domain: 'publisher.example' },
    ortb2: {},
  });
  expect(requests).to.have.length(1);
  const [response] = spec.interpretResponse({
    body: {
      id: 'splash-controls-response',
      cur: 'PLN',
      seatbid: [{
        seat: 'splash',
        bid: [{
          id: 'splash-controls-server-bid',
          impid: BID_ID,
          price: 3.5,
          w: 320,
          h: 480,
          crid: 'splash-controls-creative',
          adm,
        }]
      }],
    },
  }, requests[0]);
  expect(response).to.exist;
  response.element = document.getElementById(SLOT_ID);
  response.renderer.render(response, document);
  return document.querySelector('.sp-interstitial-overlay[data-splash-renderer="interstitial"]');
}

function controlsMessage(timer, source = OWNER_SOURCE, type = CONTROLS_TYPE) {
  return { source, type, timer };
}

function postFrom(source, data) {
  const event = new MessageEvent('message', { data });
  // Firefox rejects opaque WindowProxy values in MessageEventInit.
  Object.defineProperty(event, 'source', { value: source });
  window.dispatchEvent(event);
}

function timerHidden(timer) {
  return timer.hidden || timer.getAttribute('aria-hidden') === 'true' || getComputedStyle(timer).display === 'none';
}

function nextTask() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function bridgeCreative() {
  return '<div id="creative-root" class="froc-standard-display--interstitial" data-froc-interstitial-complete="1">' +
    '<div class="froc-display-interstitial-bar"><span class="froc-display-timer" data-seconds="10" data-start="complete" aria-hidden="false">' +
    '<span class="froc-display-timer-value">10</span></span></div></div>' +
    '<script>(function(){' +
      'function send(data){parent.postMessage(data,"*");}' +
      'window.addEventListener("message",function(event){' +
        'var command=event.data;if(!command||command.source!=="splash-controls-test")return;' +
        'var root=document.getElementById("creative-root"),timer=document.querySelector(".froc-display-timer"),' +
        'value=document.querySelector(".froc-display-timer-value");' +
        'if(command.action==="remaining"){value.textContent=command.value;}' +
        'if(command.action==="pending"){timer.classList.add("froc-display-timer--pending");}' +
        'if(command.action==="incomplete"){root.setAttribute("data-froc-interstitial-complete","0");}' +
        'if(command.action==="ready"){root.setAttribute("data-froc-interstitial-complete","1");timer.classList.remove("froc-display-timer--pending");timer.setAttribute("aria-hidden","false");}' +
        'if(command.action==="missing-config"){timer.removeAttribute("data-seconds");}' +
        'if(command.action==="style"){timer.style.setProperty("--progress",command.value);}' +
        'send({source:"splash-controls-test-ack",id:command.id,barDisplay:getComputedStyle(document.querySelector(".froc-display-interstitial-bar")).display,' +
          'timerPresent:!!document.querySelector(".froc-display-timer"),timerValue:value.textContent});' +
      '});' +
      'send({source:"splash-controls-test-ready"});' +
    '}());</script>';
}

describe('splashBidAdapter Interstitial controls', () => {
  let sandbox;
  let slot;
  let foreignFrame;
  let initialStyles;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(HTMLImageElement.prototype, 'src').set(function (url) {
      this.setAttribute('data-spec-src', url);
    });
    config.resetConfig();
    initialStyles = new Set(document.querySelectorAll('#splash-interstitial-style, style[data-splash-scroll-lock]'));
    slot = document.createElement('div');
    slot.id = SLOT_ID;
    document.body.appendChild(slot);
    foreignFrame = document.createElement('iframe');
    foreignFrame.setAttribute('sandbox', 'allow-scripts');
    document.body.appendChild(foreignFrame);
  });

  afterEach(async () => {
    document.querySelectorAll('.sp-interstitial-overlay[data-splash-renderer="interstitial"]').forEach(node => node.remove());
    foreignFrame.remove();
    slot.remove();
    await Promise.resolve();
    await Promise.resolve();
    document.querySelectorAll('#splash-interstitial-style, style[data-splash-scroll-lock]').forEach(style => {
      if (!initialStyles.has(style)) style.remove();
    });
    config.resetConfig();
    sandbox.restore();
  });

  it('renders one always-enabled host skip control and starts with no visible timer', () => {
    const overlay = buildInterstitial('<p>Creative without a timer</p>');
    const toolbar = overlay.querySelector('.sp-interstitial-toolbar');
    const close = toolbar.querySelector('.sp-interstitial-close');
    const timer = toolbar.querySelector('.sp-interstitial-timer');

    expect(toolbar.querySelectorAll('button')).to.have.length(1);
    expect(toolbar.querySelector('.sp-interstitial-logo')).to.exist;
    expect(close.textContent).to.equal('Pomiń');
    expect(close.getAttribute('aria-label')).to.equal('Pomiń reklamę');
    expect(close.disabled).to.equal(false);
    expect(timerHidden(timer)).to.equal(true);
    expect(timer.querySelector('.sp-interstitial-timer-value').textContent).to.equal('');
    expect(timer.querySelector('svg .sp-interstitial-timer-progress')).to.exist;
  });

  it('accepts only timer states from the current creative and hides the counter without disabling skip', () => {
    const overlay = buildInterstitial('<p>Creative controls</p>');
    const frame = overlay.querySelector('.sp-interstitial-creative');
    const timer = overlay.querySelector('.sp-interstitial-timer');
    const value = overlay.querySelector('.sp-interstitial-timer-value');
    const progress = overlay.querySelector('.sp-interstitial-timer-progress');
    const close = overlay.querySelector('.sp-interstitial-close');
    const update = { totalSeconds: 10, remainingSeconds: 9, visible: true };

    postFrom(null, controlsMessage(update));
    postFrom(window, controlsMessage(update));
    postFrom(frame.contentWindow, { source: 'other-creative', type: CONTROLS_TYPE, timer: update });
    postFrom(foreignFrame.contentWindow, controlsMessage(update));
    expect(value.textContent).to.equal('');
    expect(timerHidden(timer)).to.equal(true);

    postFrom(frame.contentWindow, controlsMessage(update));
    expect(value.textContent).to.equal('9');
    expect(timerHidden(timer)).to.equal(false);
    const offset = Number(progress.getAttribute('stroke-dashoffset'));
    expect(Number.isFinite(offset)).to.equal(true);
    expect(offset).not.to.equal(0);

    postFrom(frame.contentWindow, controlsMessage({ totalSeconds: 10, remainingSeconds: 9, visible: false }));
    expect(timerHidden(timer)).to.equal(true);
    expect(close.disabled).to.equal(false);
  });

  it('ignores malformed timer values and never lets creative messages disable host skip', () => {
    const overlay = buildInterstitial('<p>Creative controls</p>');
    const frame = overlay.querySelector('.sp-interstitial-creative');
    const timer = overlay.querySelector('.sp-interstitial-timer');
    const value = overlay.querySelector('.sp-interstitial-timer-value');
    const close = overlay.querySelector('.sp-interstitial-close');
    const good = { totalSeconds: 10, remainingSeconds: 9, visible: true };
    postFrom(frame.contentWindow, controlsMessage(good));
    const originalOffset = overlay.querySelector('.sp-interstitial-timer-progress').getAttribute('stroke-dashoffset');

    [
      null,
      {},
      { totalSeconds: '10', remainingSeconds: 9, visible: true },
      { totalSeconds: 10.5, remainingSeconds: 9, visible: true },
      { totalSeconds: -1, remainingSeconds: 0, visible: true },
      { totalSeconds: 301, remainingSeconds: 9, visible: true },
      { totalSeconds: 10, remainingSeconds: -1, visible: true },
      { totalSeconds: 10, remainingSeconds: 11, visible: true },
      { totalSeconds: 10, remainingSeconds: 9, visible: 1 },
    ].forEach(invalid => {
      postFrom(frame.contentWindow, controlsMessage(invalid));
      expect(value.textContent).to.equal('9');
      expect(overlay.querySelector('.sp-interstitial-timer-progress').getAttribute('stroke-dashoffset')).to.equal(originalOffset);
    });

    postFrom(frame.contentWindow, controlsMessage({ totalSeconds: 0, remainingSeconds: 0, visible: true }));
    expect(value.textContent).to.equal('9');
    expect(timerHidden(timer)).to.equal(true);
    expect(close.disabled).to.equal(false);
    expect(close.textContent).to.equal('Pomiń');
  });

  it('does not accept timer updates from a replaced creative frame', () => {
    const firstOverlay = buildInterstitial('<p>First creative</p>');
    const oldFrame = firstOverlay.querySelector('.sp-interstitial-creative');
    const secondOverlay = buildInterstitial('<p>Second creative</p>');
    const currentValue = secondOverlay.querySelector('.sp-interstitial-timer-value');
    const currentTimer = secondOverlay.querySelector('.sp-interstitial-timer');

    postFrom(oldFrame.contentWindow, controlsMessage({ totalSeconds: 10, remainingSeconds: 4, visible: true }));
    expect(currentValue.textContent).to.equal('');
    expect(timerHidden(currentTimer)).to.equal(true);
    expect(secondOverlay.querySelector('.sp-interstitial-close').disabled).to.equal(false);
  });

  it('bridges its own creative timer lifecycle through messages without exposing frame DOM', async () => {
    const states = [];
    const stateWaiters = new Set();
    let iframe;
    let nextCommandId = 0;
    const receive = event => {
      if (iframe && event.source === iframe.contentWindow && event.data && event.data.source === OWNER_SOURCE && event.data.type === CONTROLS_TYPE) {
        states.push(event.data.timer);
        stateWaiters.forEach(check => check());
      }
    };
    window.addEventListener('message', receive);
    try {
      const overlay = buildInterstitial(bridgeCreative());
      iframe = overlay.querySelector('.sp-interstitial-creative');
      const waitFor = (predicate, fromIndex = 0) => new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          stateWaiters.delete(check);
          reject(new Error('Timed out waiting for the creative timer bridge state'));
        }, 1000);
        const check = () => {
          const found = states.slice(fromIndex).find(predicate);
          if (!found) return;
          clearTimeout(timeout);
          stateWaiters.delete(check);
          resolve(found);
        };
        stateWaiters.add(check);
        check();
      });
      const command = async action => {
        const id = ++nextCommandId;
        const ack = new Promise((resolve, reject) => {
          let timeout;
          const onAck = event => {
            if (event.source !== iframe.contentWindow || !event.data || event.data.source !== 'splash-controls-test-ack' || event.data.id !== id) return;
            window.removeEventListener('message', onAck);
            clearTimeout(timeout);
            resolve(event.data);
          };
          window.addEventListener('message', onAck);
          iframe.contentWindow.postMessage({ source: 'splash-controls-test', action, id, value: action === 'remaining' ? '9' : 'test' }, '*');
          timeout = setTimeout(() => {
            window.removeEventListener('message', onAck);
            reject(new Error(`Timed out waiting for creative command ${action}`));
          }, 1000);
        });
        return await ack;
      };

      await waitFor(timer => timer && timer.totalSeconds === 10 && timer.remainingSeconds === 10 && timer.visible === true);
      let stateIndex = states.length;
      await command('remaining');
      await waitFor(timer => timer && timer.remainingSeconds === 9 && timer.visible === true, stateIndex);

      const beforeStyleChange = states.length;
      const styleAck = await command('style');
      await nextTask();
      expect(states).to.have.length(beforeStyleChange);
      expect(styleAck.barDisplay).to.equal('none');
      expect(styleAck.timerPresent).to.equal(true);
      expect(styleAck.timerValue).to.equal('9');

      stateIndex = states.length;
      await command('pending');
      await waitFor(timer => timer && timer.visible === false, stateIndex);
      stateIndex = states.length;
      await command('ready');
      await waitFor(timer => timer && timer.remainingSeconds === 9 && timer.visible === true, stateIndex);
      stateIndex = states.length;
      await command('incomplete');
      await waitFor(timer => timer && timer.visible === false, stateIndex);
      stateIndex = states.length;
      await command('ready');
      await waitFor(timer => timer && timer.remainingSeconds === 9 && timer.visible === true, stateIndex);
      stateIndex = states.length;
      await command('missing-config');
      await waitFor(timer => timer && timer.visible === false, stateIndex);
      expect(overlay.querySelector('.sp-interstitial-close').disabled).to.equal(false);
    } finally {
      window.removeEventListener('message', receive);
    }
  });

  it('keeps the host skip usable when creative setup fails', () => {
    const overlay = buildInterstitial('<script>throw new Error("broken creative");</script><p>Creative body</p>');
    const close = overlay.querySelector('.sp-interstitial-close');

    expect(close.disabled).to.equal(false);
    close.click();
    expect(overlay.isConnected).to.equal(false);
  });
});
