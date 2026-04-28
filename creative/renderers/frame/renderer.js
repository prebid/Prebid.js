/**
 * FrameRenderer (creative): builds an empty same-origin iframe, injects
 * `<script src="bid.frameRendererUrl">`, then calls `iframe.contentWindow.pbRenderInFrame(bid)`
 * after that script loads.
 *
 * The remote script must assign `window.pbRenderInFrame = function (bid) { ... }`.
 * `bid` is the full rendering payload from the page (spread bid response + macro-replaced `ad` / `adUrl`, plus `adId`), same shape as passed to `render()`.
 *
 */
;(function () {
  'use strict';

  function render(data, { mkFrame }, win) {
    const frameRendererUrl = data.frameRendererUrl;
    const width = data.width;
    const height = data.height;
    const instl = data.instl;

    if (height == null) {
      const body = win.document && win.document.body;
      const parent = body && body.parentElement;
      if (body && body.style) body.style.height = '100%';
      if (parent && parent.style) parent.style.height = '100%';
    }

    const doc = win.document;
    const attrs = {
      width: width != null ? width : '100%',
      height: height != null ? height : '100%'
    };

    if (instl && win.frameElement) {
      const style = win.frameElement.style;
      style.width = width ? String(width) + 'px' : '100vw';
      style.height = height ? String(height) + 'px' : '100vh';
    }

    // Prebid will wait for it to resolve before firing AD_RENDER_SUCCEEDED.
    return new Promise(function (resolve, reject) {
      const frame = mkFrame(doc, {
        width: attrs.width,
        height: attrs.height
      });
      frame.onload = function () {
        try {
          const cw = frame.contentWindow;
          const idoc = cw.document;
          const script = idoc.createElement('script');
          script.src = frameRendererUrl;
          script.onload = function () {
            try {
              const fn = cw.pbRenderInFrame;
              if (typeof fn !== 'function') {
                throw new Error(
                  'Prebid FrameRenderer: frameRendererUrl script must define window.pbRenderInFrame as a function.'
                );
              }
              fn.call(cw, data);
              resolve();
            } catch (e) {
              reject(e);
            }
          };
          script.onerror = function () {
            reject(
              new Error('Prebid FrameRenderer: failed to load script from frameRendererUrl')
            );
          };
          (idoc.head || idoc.body).appendChild(script);
        } catch (e) {
          reject(e);
        }
      };
      frame.onerror = function () {
        reject(new Error('Prebid FrameRenderer: iframe failed to load'));
      };
      doc.body.appendChild(frame);
    });
  }

  window.render = render;
})();
