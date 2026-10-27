// @ts-expect-error creative.js is the compiled creative/crossDomain.js, generated during precompilation.js
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from '../creative-renderers/creative.js';
import { addApiMethod, type RenderAdOptions } from "../src/prebid.ts";
import type { Bid } from "../src/bidfactory.ts";
import { createIframe, logError, logWarn } from "../src/utils.js";
import { getAdUnitElement } from "../src/utils/adUnits.ts";
import type { Identifier } from "../src/types/common.d.ts";
import { isMessageAllowed } from "../src/secureCreatives.js";

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

const RENDERED = new WeakMap();

export function getAdIdForFrame(source: WindowProxy): Identifier {
  return RENDERED.get(source);
}

/**
 * Render a bid in an isolated iframe.
 *
 * The contents of the bid's element are replaced with a single iframe and the ad is rendered into that iframe.
 * By default, a bid's element is document.getElementById(bid.adUnitCode); override this with adUnit.element.
 *
 * @param bid
 * @param options
 */
export function renderBid(bid: Bid, options?: RenderAdOptions) {
  if (bid?.adId == null) {
    logError('renderBid: not a valid bid', bid);
    return;
  }
  const element = getAdUnitElement(bid);
  if (
    typeof element?.appendChild !== 'function' ||
    typeof element?.ownerDocument?.createElement !== 'function'
  ) {
    logError('renderBid: bid has invalid .element', bid);
    return;
  }
  try {
    element.innerHTML = '';
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
    RENDERED.set(frame.contentWindow, bid.adId);
  } catch (e) {
    logError('renderBid: error rendering bid', bid, e);
  }
}

addApiMethod('renderBid', renderBid);

export function allowMessageHook(getAdId = getAdIdForFrame) {
  return (next, event, message) => {
    const adId = getAdId(event.source);
    let err = null;
    if (adId) {
      if (event.ports.length < 1) {
        err = 'without a MessageChannel port';
      } else if (adId !== message?.adId) {
        err = 'for the wrong adId';
      }
    }
    if (err) {
      logWarn(`Received x-origin request ${err}, request will be ignored`, {
        adFrame: event.source,
        adId,
        message
      });
      next.bail(false);
    } else {
      next(event, message);
    }
  };
}

isMessageAllowed.before(allowMessageHook());
