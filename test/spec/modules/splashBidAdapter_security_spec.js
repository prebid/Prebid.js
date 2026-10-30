import { expect } from 'chai';
import 'src/prebid.js';
import { spec } from 'modules/splashBidAdapter.js';
import { config } from 'src/config.js';

describe('splashBidAdapter creative isolation', () => {
  let slot, listener, initialStyles, foreignFrame, imageSrc;
  const styles = '#splash-parallax-style, #splash-interstitial-style, style[data-splash-scroll-lock]';

  beforeEach(() => {
    imageSrc = sinon.stub(HTMLImageElement.prototype, 'src').set(function (url) { this.setAttribute('data-spec-src', url); });
    config.resetConfig();
    document.cookie = 'splashIsolationProbe=publisher-only; Path=/; SameSite=Lax';
    expect(document.cookie).to.contain('splashIsolationProbe=publisher-only');
    initialStyles = new Set(document.querySelectorAll(styles));
    slot = document.createElement('div');
    slot.id = 'splash-security-slot';
    slot.style.width = '320px';
    document.body.appendChild(slot);
  });

  afterEach(async () => {
    imageSrc.restore();
    window.removeEventListener('message', listener);
    if (foreignFrame) foreignFrame.remove();
    foreignFrame = null;
    document.querySelectorAll('.sp-interstitial-overlay[data-splash-renderer]').forEach(element => element.remove());
    slot.remove();
    await Promise.resolve();
    await Promise.resolve();
    document.querySelectorAll(styles).forEach(style => {
      if (!initialStyles.has(style)) style.remove();
    });
    config.resetConfig();
    document.cookie = 'splashIsolationProbe=; Path=/; Max-Age=0';
  });

  function render(format, adm) {
    const bid = {
      bidder: 'splash',
      bidId: 'security-bid',
      adUnitCode: slot.id,
      params: { publisherId: '725', placementId: '100022', displayFormat: format },
      mediaTypes: { banner: { sizes: [[320, 480]] } },
      ortb2Imp: {},
    };
    const request = spec.buildRequests([bid], { bidderRequestId: 'security-request', ortb2: {} })[0];
    const response = spec.interpretResponse({
      body: {
        cur: 'PLN',
        seatbid: [{
          bid: [{
            id: 'security-response', impid: bid.bidId, price: 3, w: 320, h: 480, adm,
          }]
        }]
      }
    }, request)[0];
    response.element = slot;
    response.renderer.render(response, document);
    return document.querySelector(format === 'parallax' ? '.sp-creative' : '.sp-interstitial-creative');
  }

  ['parallax', 'interstitial'].forEach(format => {
    it(`runs ${format} scripts without giving the creative access to publisher DOM or storage`, done => {
      let iframe;
      listener = event => {
        if (event.source !== iframe.contentWindow || event.data.source !== 'splash-security-probe') return;
        try {
          expect(event.origin).to.equal('null');
          expect(event.data.blocked).to.deep.equal(['parent', 'top', 'storage']);
          // WebKit returns an empty cookie string here; Chromium throws SecurityError.
          expect(event.data.cookie).not.to.contain('splashIsolationProbe=publisher-only');
          expect(event.data.frameElement).to.equal(null);
          expect(iframe.contentDocument).to.equal(null);
          expect(() => iframe.contentWindow.document).to.throw();
          expect(iframe.getAttribute('sandbox')).to.equal('allow-scripts allow-popups allow-popups-to-escape-sandbox');
          expect(iframe.sandbox.contains('allow-same-origin')).to.equal(false);
          if (format === 'interstitial') {
            const close = document.querySelector('.sp-interstitial-close');
            const viewport = iframe.getBoundingClientRect();
            expect(close.getBoundingClientRect().bottom).to.be.at.most(viewport.top);
            expect(viewport.width).to.equal(document.documentElement.clientWidth);
            expect(viewport.height).to.be.greaterThan(0);
          }
          done();
        } catch (error) {
          done(error);
        }
      };
      window.addEventListener('message', listener);
      iframe = render(format, '<script>(function(){var blocked=[];' +
        'try{parent.document.body.setAttribute("data-creative-write","1");}catch(e){blocked.push("parent");}' +
        'try{top.document.body.setAttribute("data-creative-write","1");}catch(e){blocked.push("top");}' +
        'var cookie="";try{cookie=document.cookie;}catch(e){}' +
        'try{localStorage.getItem("publisher");}catch(e){blocked.push("storage");}' +
        'parent.postMessage({source:"splash-security-probe",blocked:blocked,cookie:cookie,frameElement:window.frameElement},"*");' +
        '}());</script>');
    });
  });

  it('ignores close messages from a real foreign frame and a null source', done => {
    const iframe = render('interstitial', '<p>Advertisement</p>');
    const overlay = iframe.parentElement;
    foreignFrame = document.createElement('iframe');
    foreignFrame.setAttribute('sandbox', 'allow-scripts');
    listener = event => {
      if (event.source !== foreignFrame.contentWindow || !event.data || event.data.source !== 'splash-spoof-sent') return;
      try {
        expect(overlay.isConnected).to.equal(true);
        window.dispatchEvent(new MessageEvent('message', { source: null, data: { source: 'froc-display', type: 'close' } }));
        expect(overlay.isConnected).to.equal(true);
        overlay.querySelector('.sp-interstitial-close').click();
        expect(overlay.isConnected).to.equal(false);
        expect(document.querySelector('style[data-splash-scroll-lock]')).to.equal(null);
        done();
      } catch (error) {
        done(error);
      }
    };
    window.addEventListener('message', listener);
    foreignFrame.srcdoc = '<script>parent.postMessage({source:"froc-display",type:"close"},"*");' +
      'parent.postMessage({source:"splash-spoof-sent"},"*");</script>';
    document.body.appendChild(foreignFrame);
  });
});
