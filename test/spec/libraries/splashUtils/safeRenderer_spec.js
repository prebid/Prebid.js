import { expect } from 'chai';
import { render as prebidSafeRender } from 'creative/renderers/safe/renderer.js';
import { installSafeRenderer, renderInFrame, SAFE_RENDERER_VERSION } from 'libraries/splashUtils/safeRenderer.js';
import { createIframe } from 'src/utils.js';

const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';

describe('Splash Safe Renderer', () => {
  let sandbox, frames, urls;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    frames = [];
    urls = [];
  });

  afterEach(() => {
    frames.forEach(frame => frame.remove());
    urls.forEach(url => URL.revokeObjectURL(url));
    delete window.splashSafeRendererSpec;
    sandbox.restore();
  });

  function adFrame(width = 320, height = 480) {
    const frame = document.createElement('iframe');
    Object.assign(frame.style, { width: `${width}px`, height: `${height}px`, border: '0', display: 'block' });
    document.body.appendChild(frame);
    frames.push(frame);
    return frame.contentWindow;
  }

  // The renderer may use only its own frame: reaching for a parent, the top window or the embedding element fails.
  function confined(win) {
    return new Proxy(win, {
      get(target, property) {
        if (['parent', 'top', 'frameElement', 'opener'].includes(property)) throw new Error(`accessed window.${String(property)}`);
        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  }

  function loaded(iframe) {
    return new Promise(resolve => iframe.addEventListener('load', resolve, { once: true }));
  }

  function waitFor(condition) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      (function check() {
        if (condition()) resolve();
        else if (Date.now() - started > 2000) reject(new Error('condition not met'));
        else setTimeout(check, 10);
      })();
    });
  }

  function creativeScript(message) {
    return `<script>parent.postMessage(${JSON.stringify(message)}, '*');</script>`;
  }

  it('has a version for its published URL', () => {
    expect(SAFE_RENDERER_VERSION).to.match(/^\d+\.\d+\.\d+$/);
  });

  describe('Parallax', () => {
    it('fills the ad frame with an opaque, sandboxed creative without reaching outside the frame', async () => {
      const win = adFrame(300, 250);
      renderInFrame({ ad: '<p>creative</p>', config: { format: 'parallax' } }, confined(win));
      const iframe = win.document.querySelector('iframe[data-splash-renderer="parallax"]');
      expect(iframe.getAttribute('sandbox')).to.equal(SANDBOX);
      expect(iframe.srcdoc).to.equal('<p>creative</p>');
      await loaded(iframe);
      const { width, height } = iframe.getBoundingClientRect();
      expect([width, height]).to.deep.equal([300, 250]);
      expect(() => iframe.contentWindow.document).to.throw();
      expect(win.document.body.children).to.have.length(1);
    });

    it('renders the content of Splitboard markup', () => {
      const win = adFrame();
      renderInFrame({
        ad: '<div class="splitboard"><div class="splitboard-content"><iframe srcdoc="&lt;p&gt;INNER&lt;/p&gt;"></iframe></div></div>',
        config: { format: 'parallax' }
      }, confined(win));
      expect(win.document.querySelector('iframe[data-splash-renderer="parallax"]').srcdoc).to.equal('<p>INNER</p>');
    });

    it('fits the complete creative canvas into a narrow frame and follows frame resizes', async () => {
      const win = adFrame(350, 800);
      renderInFrame({ ad: '<div>canvas</div>', config: { format: 'parallax', creativeSize: { width: 700, height: 1600 } } }, confined(win));
      const iframe = win.document.querySelector('iframe[data-splash-renderer="parallax"]');
      await waitFor(() => iframe.getBoundingClientRect().width === 350);
      const bounds = iframe.getBoundingClientRect();
      expect([bounds.left, bounds.top, bounds.width, bounds.height]).to.deep.equal([0, 0, 350, 800]);
      expect([iframe.style.width, iframe.style.height]).to.deep.equal(['700px', '1600px']);
      frames[0].style.width = '280px';
      await waitFor(() => iframe.getBoundingClientRect().width === 280);
      expect(iframe.getBoundingClientRect().height).to.equal(640);
    });

    it('disconnects its sizing observer and removes the previous creative on refresh', () => {
      const win = adFrame();
      const observer = { observe: sandbox.spy(), disconnect: sandbox.spy() };
      sandbox.stub(win, 'ResizeObserver').returns(observer);
      renderInFrame({ ad: '<div>first</div>', width: 700, height: 1600, config: { format: 'parallax' } }, confined(win));
      const first = win.document.querySelector('iframe');
      renderInFrame({ ad: '<div>second</div>', config: { format: 'parallax' } }, confined(win));
      sinon.assert.calledOnce(observer.disconnect);
      expect(first.isConnected).to.equal(false);
      expect(win.document.querySelectorAll('iframe')).to.have.length(1);
    });

    it('rolls back when the frame sizing observer cannot start', () => {
      const win = adFrame();
      const observer = { observe: sandbox.stub().throws(new Error('sizing unavailable')), disconnect: sandbox.spy() };
      sandbox.stub(win, 'ResizeObserver').returns(observer);
      expect(() => renderInFrame({ ad: '<div>creative</div>', width: 700, height: 1600, config: { format: 'parallax' } }, confined(win)))
        .to.throw('sizing unavailable');
      sinon.assert.calledOnce(observer.disconnect);
      expect(win.document.body.children).to.have.length(0);
    });

    it('fits after a hidden frame becomes visible', async () => {
      const win = adFrame(0, 0);
      renderInFrame({ ad: '<div>canvas</div>', width: 700, height: 1600, config: { format: 'parallax' } }, confined(win));
      const iframe = win.document.querySelector('iframe');
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(iframe.style.visibility).to.equal('hidden');
      Object.assign(frames[0].style, { width: '280px', height: '640px' });
      await waitFor(() => iframe.style.visibility === 'visible');
      expect([iframe.getBoundingClientRect().width, iframe.getBoundingClientRect().height]).to.deep.equal([280, 640]);
    });

    it('still renders when sizing metadata or ResizeObserver is unavailable', async () => {
      const win = adFrame(300, 250);
      sandbox.stub(win, 'ResizeObserver').value(undefined);
      renderInFrame({ ad: '<div>canvas</div>', width: 700, height: 1600, config: { format: 'parallax' } }, confined(win));
      const iframe = win.document.querySelector('iframe');
      await loaded(iframe);
      expect([iframe.getBoundingClientRect().width, iframe.getBoundingClientRect().height]).to.deep.equal([300, 250]);
    });
  });

  describe('Interstitial', () => {
    function render(win, ad = '<div>creative</div>') {
      renderInFrame({ ad, width: 320, height: 480, config: { format: 'interstitial' } }, confined(win));
      return creative(win);
    }

    function creative(win) {
      return win.document.querySelector('iframe[data-splash-renderer="interstitial"]');
    }

    it('keeps a working trusted skip button when creative scripts fail', async () => {
      const win = adFrame();
      const iframe = render(win, '<script>throw new Error("creative failed");</script><div>broken creative</div>');
      await loaded(iframe);
      const close = win.document.querySelector('button.sp-interstitial-close');
      expect(close, 'trusted skip outside the opaque creative').not.to.equal(null);
      expect(close.getBoundingClientRect().height).to.be.at.least(44);
      close.click();
      expect(creative(win)).to.equal(null);
      expect(win.document.querySelector('[data-splash-renderer="interstitial"]')).to.equal(null);
      expect(frames[0].isConnected).to.equal(true);
    });

    it('keeps trusted controls visible and fits the complete creative below them', async () => {
      for (const [width, height] of [[320, 480], [728, 300]]) {
        const win = adFrame(width, height);
        const iframe = render(win, '<div class="froc-display-interstitial-bar">controls</div>');
        expect(iframe.getAttribute('sandbox')).to.equal(SANDBOX);
        expect(iframe.srcdoc).to.contain('__splashPrebidInterstitialBridge');
        expect(iframe.srcdoc).to.contain('.froc-display-interstitial-bar{display:none');
        await loaded(iframe);
        await waitFor(() => iframe.style.visibility === 'visible');
        const box = iframe.getBoundingClientRect();
        const toolbar = win.document.querySelector('.sp-interstitial-toolbar').getBoundingClientRect();
        expect([toolbar.left, toolbar.top, toolbar.width]).to.deep.equal([0, 0, width]);
        expect(box.top).to.be.at.least(toolbar.bottom);
        expect(box.bottom).to.be.at.most(height + 1);
        expect(box.right).to.be.at.most(width + 1);
        expect(box.width / box.height).to.be.closeTo(320 / 480, 0.001);
        expect(win.document.querySelector('button.sp-interstitial-close').getBoundingClientRect().height).to.be.at.least(44);
        expect(() => iframe.contentWindow.document).to.throw();
        expect(win.document.body.children).to.have.length(1);
      }
    });

    it('does not move focus into the ad frame', () => {
      const focused = document.createElement('button');
      document.body.appendChild(focused);
      try {
        focused.focus();
        const win = adFrame();
        render(win);
        expect(document.activeElement).to.equal(focused);
        expect(win.document.activeElement).to.equal(win.document.body);
      } finally {
        focused.remove();
      }
    });

    it('removes the ad from its own frame when the creative closes, leaving the frame to its container', async () => {
      const win = adFrame();
      const remove = sandbox.spy(win, 'removeEventListener');
      render(win, creativeScript({ source: 'froc-display', type: 'close' }));
      await waitFor(() => creative(win) === null);
      sinon.assert.calledWith(remove, 'message', sinon.match.func);
      expect(frames[0].isConnected).to.equal(true);
    });

    it('closes on Escape in its frame and ignores other keys', () => {
      const win = adFrame();
      render(win);
      win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(creative(win)).not.to.equal(null);
      win.document.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      expect(creative(win)).to.equal(null);
    });

    it('accepts a close only from its own creative', async () => {
      const win = adFrame();
      const iframe = render(win);
      const other = win.document.createElement('iframe');
      other.srcdoc = creativeScript({ source: 'froc-display', type: 'close' });
      win.document.body.appendChild(other);
      await loaded(other);
      win.postMessage({ source: 'froc-display', type: 'close' }, '*');
      window.postMessage({ source: 'froc-display', type: 'close' }, '*');
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(creative(win)).to.equal(iframe);
    });

    it('closes after the five minute watchdog', () => {
      const win = adFrame();
      const setTimeout = sandbox.stub(win, 'setTimeout').returns(7);
      const clearTimeout = sandbox.stub(win, 'clearTimeout');
      render(win);
      sinon.assert.calledWith(setTimeout, sinon.match.func, 5 * 60 * 1000);
      setTimeout.firstCall.args[0]();
      expect(creative(win)).to.equal(null);
      sinon.assert.calledWith(clearTimeout, 7);
    });

    it('keeps instances in separate frames independent', () => {
      const first = adFrame();
      const second = adFrame();
      render(first);
      render(second);
      first.document.dispatchEvent(new first.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      expect(creative(first)).to.equal(null);
      expect(creative(second)).not.to.equal(null);
    });

    it('rolls back when the creative cannot be written', () => {
      const win = adFrame();
      sandbox.stub(win.HTMLIFrameElement.prototype, 'srcdoc').set(() => { throw new Error('iframe write failed'); });
      const remove = sandbox.spy(win, 'removeEventListener');
      const clearTimeout = sandbox.spy(win, 'clearTimeout');
      expect(() => render(win)).to.throw('iframe write failed');
      expect(creative(win)).to.equal(null);
      sinon.assert.calledWith(remove, 'message', sinon.match.func);
      sinon.assert.calledOnce(clearTimeout);
    });

    it('releases the sizing observer when the trusted skip closes the ad', () => {
      const win = adFrame();
      const observer = { observe: sandbox.spy(), disconnect: sandbox.spy() };
      sandbox.stub(win, 'ResizeObserver').returns(observer);
      render(win);
      win.document.querySelector('.sp-interstitial-close').click();
      sinon.assert.calledOnce(observer.disconnect);
      expect(win.document.body.children).to.have.length(0);
    });

    it('replaces its own controls on refresh and detaches the old skip handler', () => {
      const win = adFrame();
      const first = render(win);
      const oldSkip = win.document.querySelector('button.sp-interstitial-close');
      const second = render(win);
      expect(first.isConnected).to.equal(false);
      expect(win.document.querySelectorAll('button.sp-interstitial-close')).to.have.length(1);
      oldSkip.click();
      expect(second.isConnected).to.equal(true);
      win.document.querySelector('button.sp-interstitial-close').click();
      expect(win.document.body.children).to.have.length(0);
    });
  });

  [
    ['without markup', { config: { format: 'parallax' } }, 'Splash Safe Renderer: missing creative markup'],
    ['with markup that is not a string', { ad: {}, config: { format: 'interstitial' } }, 'Splash Safe Renderer: missing creative markup'],
    ['for an unsupported format', { ad: '<p>creative</p>', config: { format: 'standard' } }, 'Splash Safe Renderer: unsupported format standard'],
    ['without config', { ad: '<p>creative</p>' }, 'Splash Safe Renderer: unsupported format undefined'],
  ].forEach(([title, payload, message]) => {
    it(`fails ${title}, leaving the frame empty`, () => {
      const win = adFrame();
      expect(() => renderInFrame(payload, confined(win))).to.throw(message);
      expect(win.document.body.children).to.have.length(0);
    });
  });

  describe('through Prebid\'s Safe Renderer', () => {
    function scriptUrl(code) {
      const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
      urls.push(url);
      return url;
    }

    function renderBid(win, ad, format, url = scriptUrl('parent.parent.splashSafeRendererSpec(window);')) {
      window.splashSafeRendererSpec = installSafeRenderer;
      return prebidSafeRender({
        adId: 'splash-ad',
        ad,
        width: 320,
        height: 480,
        mediaType: 'banner',
        safeRenderer: { url, config: { format } },
      }, { mkFrame: createIframe }, win);
    }

    it('renders from the script at safeRenderer.url, inside the frame created by Prebid', async () => {
      const win = adFrame();
      await renderBid(win, '<div>creative</div>', 'interstitial');
      const [inner] = win.document.querySelectorAll('iframe');
      expect(typeof inner.contentWindow.pbRenderInFrame).to.equal('function');
      expect(inner.contentDocument.querySelector('iframe[data-splash-renderer="interstitial"]')).not.to.equal(null);
      expect(win.document.querySelector('[data-splash-renderer]')).to.equal(null);
    });

    it('lets Prebid report a failure of pbRenderInFrame', async () => {
      let error;
      try {
        await renderBid(adFrame(), '<div>creative</div>', 'video');
      } catch (e) {
        error = e;
      }
      expect(error.message).to.equal('Splash Safe Renderer: unsupported format video');
    });
  });
});
