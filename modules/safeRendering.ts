// @ts-expect-error creative.js is the compiled creative/crossDomain.js, generated during precompilation
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from '../creative-renderers/creative.js';
import { addApiMethod, type RenderAdOptions } from "../src/prebid.ts";
import type { Bid } from "../src/bidfactory.ts";
import { createIframe, logError, logWarn } from "../src/utils.js";
import { getAdUnitElement } from "../src/utils/adUnits.ts";
import type { Identifier } from "../src/types/common.d.ts";
import { isMessageAllowed } from "../src/secureCreatives.js";
import { config } from "../src/config.ts";

declare module '../src/prebidGlobal.ts' {
  interface PrebidJS {
    renderBid: typeof renderBid
  }
}

declare module '../src/config.ts' {
  interface Config {
    safeRendering?: {
      /**
       * If true, allow only renderBid to set up cross-origin rendering; requests coming from any other source are
       * ignored.
       * If false, Prebid will accept any postMessage carrying a valid adId; typically these come from GAM safeframes.
       *
       * Default is false.
       */
      exclusive?: boolean;
    }
  }
}

let exclusive = false;
config.getConfig('safeRendering', (cfg) => {
  exclusive = cfg.safeRendering?.exclusive ?? false;
});

function escapeInlineHtml(src) {
  // the source is inlined in a <script> tag, so </script and <!-- must be escaped
  return src
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/gi, '<\\!--');
}

const getCreativeTag = (() => {
  let tag;
  return () => {
    if (!tag) {
      tag = encodeURIComponent(`<script>${escapeInlineHtml(RENDERER)}</script>`);
    }
    return tag;
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
    logError('renderBid: bid has invalid .element', { bid, element });
    return;
  }
  const doc = element.ownerDocument;
  if (!doc.body?.contains?.(element)) {
    logError('renderBid: bid.element is not in the DOM', { bid, element });
    return;
  }
  try {
    element.innerHTML = '';
    const { clickThrough: clickUrl, ...rest } = options ?? {};
    const renderArgs = JSON.stringify({
      ...rest,
      adId: bid.adId,
      pubUrl: doc.defaultView.location.href,
      clickUrl
    }).replace(/</g, '\\u003c'); // handle HTML strings
    const srcdoc = getCreativeTag() + encodeURIComponent(`<script>window.pbRender(${renderArgs});</script>`);
    // use a data url instead of srcdoc
    // srcdoc is not isolated unless in a sandbox without `allow-same-origin`, which would break anything that needs an origin
    // in the creative (e.g. storage)
    // data URLs set an opaque origin regardless of sandbox, keeping the frame isolated but allowing nested iframes
    // to use a real origin (as long as allow-same-origin)
    const frame = createIframe(doc, {
      sandbox: 'allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation',
      src: 'data:text/html;charset=utf-8,' + srcdoc
    });
    frame.onload = () => RENDERED.set(frame.contentWindow, bid.adId);
    element.appendChild(frame);
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
