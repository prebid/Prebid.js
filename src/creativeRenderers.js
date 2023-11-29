import {GreedyPromise} from './utils/promise.js';
import {createInvisibleIframe} from './utils.js';
import {RENDERER} from '../libraries/creative-renderer-display/renderer.js';

export const RENDERERS = {
  display: RENDERER
};

export const getCreativeRenderer = (function() {
  const renderers = {};
  return function (mediaType) {
    const renderType = RENDERERS.hasOwnProperty(mediaType) ? mediaType : 'display';
    if (!renderers.hasOwnProperty(renderType)) {
      renderers[renderType] = new GreedyPromise((resolve) => {
        const iframe = createInvisibleIframe();
        iframe.srcdoc = `<script>${RENDERERS[renderType]}</script>`;
        iframe.onload = () => resolve(iframe.contentWindow.render);
        document.body.appendChild(iframe);
      })
    }
    return renderers[renderType];
  }
})();
