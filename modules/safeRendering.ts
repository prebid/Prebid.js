// @ts-expect-error creative.js is the compiled creative/crossDomain.js, generated during precompilation
// eslint-disable-next-line import/no-unresolved
import { RENDERER } from '../creative-renderers/creative.js';
import { addApiMethod, type RenderAdOptions } from "../src/prebid.ts";
import type { Bid } from "../src/bidfactory.ts";
import { createIframe, generateUUID, logWarn, memoize } from "../src/utils.js";
import { getAdUnitElement } from "../src/utils/adUnits.ts";
import type { Identifier } from "../src/types/common.d.ts";
import { getBidForMessage, isMessageAllowed, parseMessage, processMessage } from "../src/secureCreatives.js";
import { config } from "../src/config.ts";
import { emitAdRenderFail, isRenderSuppressed } from "../src/adRendering.ts";
import { AD_RENDER_FAILED_REASON } from "../src/constants.ts";

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
    .replace(/<!--/g, '\\x3C!--');
}

const getCreativeTag = memoize(() => encodeURIComponent(`<script>${escapeInlineHtml(RENDERER)}</script>`));

const TOKENS = new WeakMap();

export function validateToken(bid: Bid, token: Identifier): boolean {
  if (bid == null || token == null) {
    return false;
  }
  const issued = TOKENS.get(bid);
  if (!issued?.has(token)) {
    return false;
  }
  issued.delete(token);
  return true;
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
 */
export function renderBid(bid: { adId: Identifier }, options?: RenderAdOptions) {
  let actualBid = null;
  function fail(reason, message) {
    emitAdRenderFail({
      bid: actualBid,
      reason,
      id: bid?.adId,
      message
    });
  }
  if (bid?.adId == null) {
    fail(AD_RENDER_FAILED_REASON.MISSING_DOC_OR_ADID, 'missing adId');
    return;
  }
  actualBid = getBidForMessage(bid);
  if (actualBid?.adId == null) {
    fail(AD_RENDER_FAILED_REASON.CANNOT_FIND_AD, `Cannot find ad '${bid.adId}'`);
    return;
  }
  const element = getAdUnitElement(actualBid);
  if (
    typeof element?.appendChild !== 'function' ||
    typeof element.ownerDocument?.createElement !== 'function'
  ) {
    fail(AD_RENDER_FAILED_REASON.INVALID_ELEMENT, 'bid has invalid .element');
    return;
  }
  if (element.ownerDocument.defaultView == null) {
    fail(AD_RENDER_FAILED_REASON.INVALID_ELEMENT, 'bid.element is not attached to any window');
    return;
  }
  const doc = element.ownerDocument;
  const parent = findDepth(doc.defaultView);
  if (parent == null) {
    fail(AD_RENDER_FAILED_REASON.INVALID_ELEMENT, 'bid.element must be in a descendant of prebid\'s window');
    return;
  }
  const { suppress, logReasons } = isRenderSuppressed(actualBid);
  if (suppress) {
    // stop early so that the element's current contents are not disturbed
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
      pubUrl: window.location.origin,
      clickUrl,
      allowNullOrigin: true,
      token,
      parent,
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
    fail(AD_RENDER_FAILED_REASON.EXCEPTION, e.message);
  }
}

addApiMethod('renderBid', renderBid);

function logRejection(err, event, bid, message) {
  logWarn(`Received x-origin request ${err}, request will be ignored`, {
    adFrame: event.source,
    bid,
    message
  });
}

function attach(port, bid) {
  port.onmessage = (event) => {
    const data = parseMessage(event);
    if (data) {
      if (data.adId !== bid.adId) {
        logRejection('for the wrong adId', event, bid, data);
      } else {
        processMessage(data, bid, (message) => port.postMessage(JSON.stringify(message)));
      }
    }
  };
}

export function allowMessageHook(tokenIsValid = validateToken) {
  return (next, event, message) => {
    let err = null;
    const bid = getBidForMessage(message);
    const { token } = message ?? {};
    if (exclusive && !token) {
      err = 'not requested by renderBid, and safeRendering.exclusive is enabled';
    } else if (bid && (token || TOKENS.has(bid))) {
      if (event.ports.length < 1) {
        err = 'without a MessageChannel port';
      } else if (!tokenIsValid(bid, message.token)) {
        err = 'from a frame not authorized for this bid';
      } else {
        attach(event.ports[0], bid);
      }
    }
    if (err) {
      logRejection(err, event, bid, message);
      next.bail(false);
    } else {
      next(event, message);
    }
  };
}

isMessageAllowed.before(allowMessageHook());
