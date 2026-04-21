/* global pbRegisterCustomRender, YVAP */
/**
 * customRendererUrl module: register synchronously; ctx includes vastXml from getRenderingData.
 */
window.pbRegisterCustomRender(function (ctx) {
    function yvapPlayerRender(bid) {
      var safeAdId =
        bid.adId != null && String(bid.adId).length
          ? String(bid.adId).replace(/[^a-zA-Z0-9_-]/g, '')
          : '';
      var targetNodeId =
        'pb-yvap-' +
        (safeAdId || 'slot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9));
  
      var container = document.createElement('div');
      container.id = targetNodeId;
      if (bid.width != null) {
        container.style.width =
          typeof bid.width === 'number' ? bid.width + 'px' : String(bid.width);
      }
      if (bid.height != null) {
        container.style.height =
          typeof bid.height === 'number' ? bid.height + 'px' : String(bid.height);
      }
      document.body.appendChild(container);
  
      function initPlayer() {
        // eslint-disable-next-line no-new
        new YVAP({
          id: targetNodeId,
          player: {
            type: 'Outstream',
            controls: true,
            height: bid.height,
            width: bid.width
          },
          ads: {
            adTagXml: bid.vastXml
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
  
    yvapPlayerRender({
      adId: ctx.adId,
      height: ctx.height,
      width: ctx.width,
      vastXml: ctx.vastXml || ''
    });
  });
  