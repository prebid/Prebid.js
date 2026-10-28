// @ts-expect-error creative.js is the compiled creative/crossDomain.js, generated during precompilation
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from '../creative-renderers/creative.js';
import { addApiMethod, type RenderAdOptions } from "../src/prebid.ts";
import type { Bid } from "../src/bidfactory.ts";
import { createIframe, generateUUID, logError, logWarn } from "../src/utils.js";
import { getAdUnitElement } from "../src/utils/adUnits.ts";
import type { Identifier } from "../src/types/common.d.ts";
import { getBidForMessage, isMessageAllowed } from "../src/secureCreatives.js";
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

const TOKENS = new WeakMap();

export function validateToken(bid: Bid, token: Identifier): boolean {
  return bid != null && token != null && TOKENS.get(bid)?.has(token);
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
export function renderBid(bid: { adId: Identifier }, options?: RenderAdOptions) {
  const actualBid = getBidForMessage(bid);
  if (actualBid?.adId == null) {
    logError('renderBid: not a valid bid', bid);
    return;
  }
  const element = getAdUnitElement(actualBid);
  if (
    typeof element?.appendChild !== 'function' ||
    typeof element?.ownerDocument?.createElement !== 'function'
  ) {
    logError('renderBid: bid has invalid .element', { bid: actualBid, element });
    return;
  }
  const doc = element.ownerDocument;
  try {
    element.innerHTML = '';
    const { clickThrough: clickUrl, ...rest } = options ?? {};
    const token = generateUUID();
    const renderArgs = JSON.stringify({
      ...rest,
      adId: actualBid.adId,
      pubUrl: doc.defaultView.location.href,
      clickUrl,
      allowNullOrigin: true,
      token
    }).replace(/</g, '\\u003c'); // handle HTML strings
    const frame = createIframe(doc, {
      // GPT's sandbox attr
      sandbox: 'allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts allow-top-navigation-by-user-activation',
      // data URLs set an opaque origin regardless of sandbox, keeping the frame isolated but allowing nested iframes
      // to use a real origin (as long as allow-same-origin)
      src: 'data:text/html;charset=utf-8,' + getCreativeTag() + encodeURIComponent(`<script>window.pbRender(${renderArgs});</script>`)
    });
    element.appendChild(frame);
    if (!TOKENS.has(actualBid)) {
      TOKENS.set(actualBid, new Set());
    }
    TOKENS.get(actualBid).add(token);
  } catch (e) {
    logError('renderBid: error rendering bid', actualBid, e);
  }
}

addApiMethod('renderBid', renderBid);

export function allowMessageHook(tokenIsValid = validateToken) {
  return (next, event, message) => {
    let err = null;

    const bid = getBidForMessage(message);
    const { token } = message ?? {};
    if (exclusive && !token) {
      err = 'not requested by renderBid, and safeRendering.exclusive is enabled';
    } else if (bid) {
      if (token) {
        if (event.ports.length < 1) {
          err = 'without a MessageChannel port';
        } else if (!tokenIsValid(bid, message.token)) {
          err = 'for the wrong bid';
        }
      }
    }
    if (err) {
      logWarn(`Received x-origin request ${err}, request will be ignored`, {
        adFrame: event.source,
        bid,
        message
      });
      next.bail(false);
    } else {
      next(event, message);
    }
  };
}

isMessageAllowed.before(allowMessageHook());
