// @ts-expect-error creative.js is the compiled creative/crossDomain.js, generated during precompilation.js
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from '../creative-renderers/creative.js';
import { addApiMethod, type RenderAdOptions } from "../src/prebid.ts";
import type { Bid } from "../src/bidfactory.ts";
import { createIframe } from "../src/utils.js";
import { getAdUnitElement } from "../src/utils/adUnits.ts";

declare module '../src/prebidGlobal.ts' {
  interface PrebidJS {
    renderBid: typeof renderBid
  }
}

function escapeInlineHtml(src) {
  // the source is inlined in a <script> tag, so </script and <!-- must be escaped
  return src
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/gi, '<\\!--');
}

const getCreativeSource = (() => {
  let src;
  return () => {
    if (!src) {
      src = escapeInlineHtml(RENDERER);
    }
    return src;
  };
})();

export function renderBid(bid: Bid, options?: RenderAdOptions) {
  const element = getAdUnitElement(bid);
  const doc = element.ownerDocument;
  const renderArgs = JSON.stringify({
    adId: bid.adId,
    pubUrl: doc.defaultView.location.href,
    ...options
  });
  const srcdoc = `<script>${getCreativeSource()}</script>\n<script>window.pbRender(${renderArgs});</script>`;
  // use a data url instead of srcdoc
  // srcdoc is not isolated unless in a sandbox without `allow-same-origin`, which would break anything that needs an origin
  // in the creative (e.g. storage)
  // data URLs set an opaque origin regardless of sandbox, keeping the frame isolated but allowing nested iframes
  // to use a real origin (as long as allow-same-origin)
  const frame = createIframe(doc, {
    sandbox: 'allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation',
    src: `data:text/html;charset=utf-8,${encodeURIComponent(srcdoc)}`
  });
  element.appendChild(frame);
}

addApiMethod('renderBid', renderBid);
