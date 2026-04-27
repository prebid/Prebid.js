import { ERROR_NO_AD } from './constants.js';

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
    var frameRendererUrl = data.frameRendererUrl;
    var width = data.width;
    var height = data.height;
    var instl = data.instl;

    if (!frameRendererUrl) {
      var err = new Error('Missing frameRendererUrl');
      err.reason = ERROR_NO_AD;
      throw err;
    }

    if (height == null) {
      var body = win.document && win.document.body;
      var parent = body && body.parentElement;
      if (body && body.style) body.style.height = '100%';
      if (parent && parent.style) parent.style.height = '100%';
    }

    var doc = win.document;
    var attrs = {
      width: width != null ? width : '100%',
      height: height != null ? height : '100%'
    };

    if (instl && win.frameElement) {
      var style = win.frameElement.style;
      style.width = width ? String(width) + 'px' : '100vw';
      style.height = height ? String(height) + 'px' : '100vh';
    }

    // Prebid will wait for it to resolve before firing AD_RENDER_SUCCEEDED.
    return new Promise(function (resolve, reject) {
      var frame = mkFrame(doc, {
        width: attrs.width,
        height: attrs.height
      });
      frame.onload = function () {
        try {
          var cw = frame.contentWindow;
          var idoc = cw.document;
          var script = idoc.createElement('script');
          script.src = frameRendererUrl;
          script.onload = function () {
            try {
              var fn = cw.pbRenderInFrame;
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
