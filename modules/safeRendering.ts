// @ts-expect-error creative.js is the compiled creative/crossDomain.js, generated during precompilation
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from '../creative-renderers/creative.js';
import { addApiMethod, type RenderAdOptions } from "../src/prebid.ts";
import type { Bid } from "../src/bidfactory.ts";
import { createIframe, generateUUID, logError, logWarn, memoize } from "../src/utils.js";
import { getAdUnitElement } from "../src/utils/adUnits.ts";
import type { Identifier } from "../src/types/common.d.ts";
import { getBidForMessage, isMessageAllowed } from "../src/secureCreatives.js";
import { config } from "../src/config.ts";
import { isRenderSuppressed } from "../src/adRendering.ts";

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

export function escapeInlineHtml(src) {
  // the source is inlined in a <script> tag, so </script and <!-- must be escaped
  return src
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/gi, '<\\!--');
}

const getCreativeTag = memoize(() => encodeURIComponent(`<script>${escapeInlineHtml(RENDERER)}</script>`));

const TOKENS = new WeakMap();
const UNCLAIMED = {};

export function validateToken(bid: Bid, token: Identifier, source: Window): boolean {
  if (bid == null || token == null) {
    return false;
  }
  const issued = TOKENS.get(bid);
  if (!issued?.has(token)) {
    // bid was never sent through renderBid
    return false;
  }
  if (issued.get(token) === UNCLAIMED) {
    // first message with this token
    issued.set(token, source);
  }
  // later message coming from some other window
  return issued.get(token) === source;
}

function findDepth(win) {
  let depth = 1;
  while (win !== window && win.parent !== win) {
    win = win.parent;
    depth++;
  }
  return win === window ? depth : null;
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
    typeof element.ownerDocument?.createElement !== 'function'
  ) {
    logError('renderBid: bid has invalid .element', { bid: actualBid, element });
    return;
  }
  if (element.ownerDocument.defaultView == null) {
    logError('renderBid: bid.element is not attached to any window', { bid: actualBid, element });
    return;
  }
  const doc = element.ownerDocument;
  const parent = findDepth(doc.defaultView);
  if (parent == null) {
    logError('renderBid: bid.element must be in a descendant of prebid\'s window', { bid: actualBid, element, elementWindow: doc.defaultView, prebidWindow: window });
    return;
  }
  const { suppress, logReasons } = isRenderSuppressed(actualBid);
  if (suppress) {
    // stop early so that the element's contents are not disturbed
    logReasons();
    return;
  }
  element.innerHTML = '';
  try {
    const { clickThrough: clickUrl, ...rest } = options ?? {};
    const token = generateUUID();
    const renderArgs = JSON.stringify({
      ...rest,
      adId: actualBid.adId,
      pubUrl: window.location.href,
      clickUrl,
      allowNullOrigin: true,
      token,
      parent: findDepth(doc.defaultView),
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
      TOKENS.set(actualBid, new Map());
    }
    TOKENS.get(actualBid).set(token, UNCLAIMED);
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
        } else if (!tokenIsValid(bid, message.token, event.source)) {
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
