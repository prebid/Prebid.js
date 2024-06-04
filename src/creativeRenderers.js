import {GreedyPromise} from './utils/promise.js';
import {createInvisibleIframe} from './utils.js';
import {RENDERER} from '../libraries/creative-renderer-display/renderer.js';
import {hook} from './hook.js';

export const getCreativeRendererSource = hook('sync', function (bidResponse) {
  return RENDERER;
})

export const getCreativeRenderer = (function() {
  const renderers = {};
  return function (bidResponse) {
    const src = getCreativeRendererSource(bidResponse);
    if (!renderers.hasOwnProperty(src)) {
      renderers[src] = new GreedyPromise((resolve) => {
        const iframe = createInvisibleIframe();
        iframe.srcdoc = `<script>${src}</script>`;
        iframe.onload = () => resolve(iframe.contentWindow.render);
        document.body.appendChild(iframe);
      })
    }
    return renderers[src];
  }
})();
