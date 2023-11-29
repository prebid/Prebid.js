import {GreedyPromise} from './utils/promise.js';
import {createInvisibleIframe} from './utils.js';
import {RENDERER} from '../libraries/creative-renderer-display/renderer.js';

export const RENDERERS = {
  display: RENDERER
};

export function getRendererSrc(mediaType) {
  return RENDERERS.hasOwnProperty(mediaType) ? RENDERERS[mediaType] : RENDERERS.display;
}

export const getCreativeRenderer = (function() {
  const renderers = {};
  return function (mediaType) {
    const src = getRendererSrc(mediaType);
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
