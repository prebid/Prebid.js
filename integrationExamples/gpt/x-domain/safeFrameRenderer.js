/* global YVAP */
/**
 * Reference implementation for `bid.safeFrameRendererUrl`.
 * Prebid injects this script into the creative iframe and then calls `window.pbRenderInFrame(bid)`.
 * `bid` is the full bid payload.
 */
window.pbRenderInFrame = function (bid) {
  function yvapPlayerRender(b) {
    var safeAdId =
      b.adId != null && String(b.adId).length
        ? String(b.adId).replace(/[^a-zA-Z0-9_-]/g, '')
        : '';
    var targetNodeId =
      'pb-yvap-' +
      (safeAdId || 'slot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));

    var container = document.createElement('div');
    container.id = targetNodeId;
    if (b.width != null) {
      container.style.width =
        typeof b.width === 'number' ? b.width + 'px' : String(b.width);
    }
    if (b.height != null) {
      container.style.height =
        typeof b.height === 'number' ? b.height + 'px' : String(b.height);
    }
    document.body.appendChild(container);

    function initPlayer() {
      // eslint-disable-next-line no-new
        new YVAP({
          id: targetNodeId,
          player: {
            type: 'Outstream',
            controls: true,
            height: b.height,
            width: b.width
          },
          ads: {
            adTagXml: b.vastXml
          }
        });
    }

    if (window.YVAP) {
      initPlayer();
      return;
    }

    var script = document.createElement('script');
    script.src = 'https://s.yimg.com/kp/yvap/1.9.0/yvap.js';
    script.async = true;
    script.onload = function () {
      initPlayer();
    };
    script.onerror = function () {
      // eslint-disable-next-line no-console
      console.error('[Yahoo ADS bid adapter]: Outstream renderer script failed to load.');
    };
    var firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      (document.head || document.documentElement).appendChild(script);
    }
  }

  yvapPlayerRender(bid);
};
