/**
 * SafeRenderer (creative): builds an empty same-origin iframe, injects
 * `<script src="safeRenderer.url">`, then calls `iframe.contentWindow.pbRenderInFrame(payload)`
 * after that script loads.
 *
 * The remote script must assign `window.pbRenderInFrame` as a function.
 * `payload` is `{ config: safeRenderer.config, ...renderingData }`: `renderingData` carries bid-oriented fields passed through the creative pipeline
 * that may matter to an external renderer—for example `ad`, `adId`, `adUrl`, `vastXml`, `vastUrl`, `mediaType`, sizes, `instl`.
 * `payload.config` mirrors `safeRenderer.config` from that payload; before the creative runs, Core may populate it from a static
 * `safeRenderer.config` (e.g. set on the bid by the bidder adapter) or by calling the publisher’s `safeRenderer.getConfig(bidResponse)` once at render preparation.
 *
 */
export function render(data, { mkFrame }, win) {
  const { safeRenderer, ...renderingData } = data;

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

  if (typeof safeRenderer.url !== 'string' || safeRenderer.url === '') {
    return Promise.reject(new Error('Prebid SafeRenderer: missing data.safeRenderer.url'));
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
        script.src = safeRenderer.url;
        script.onload = function () {
          try {
            const fn = cw.pbRenderInFrame;
            if (typeof fn !== 'function') {
              throw new Error(
                'Prebid SafeRenderer: safeRenderer.url script must define window.pbRenderInFrame as a function.'
              );
            }
            fn.call(cw, { config: safeRenderer.config, ...renderingData });
            resolve();
          } catch (e) {
            reject(e);
          }
        };
        script.onerror = function () {
          reject(
            new Error('Prebid SafeRenderer: failed to load script from safeRenderer.url')
          );
        };
        (idoc.head || idoc.body).appendChild(script);
      } catch (e) {
        reject(e);
      }
    };
    frame.onerror = function () {
      reject(new Error('Prebid SafeRenderer: iframe failed to load'));
    };
    doc.body.appendChild(frame);
  });
}

window.render = render;
