import { logInfo, logWarn, deepAccess, generateUUID, canAccessWindowTop, getWindowTop, getWindowSelf } from '../src/utils.js';
import { getWinDimensions } from '../src/utils/winDimensions.js';
import { BANNER } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getStorageManager } from '../src/storageManager.js';
import { getGptSlotInfoForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { getBoundingBox, getViewportOffset, getViewability } from '../libraries/percentInView/percentInView.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 */

const BIDDER_CODE = 'unicorn';
const UNICORN_ENDPOINT = 'https://ds.uncn.jp/pb/0/bid.json';
const UNICORN_DEFAULT_CURRENCY = 'JPY';
const UNICORN_PB_COOKIE_KEY = '__pb_unicorn_aud';
const UNICORN_PB_VERSION = '1.1';
const ADSLOT_SIGNAL_VERSION = 1; // imp.ext.adslot schema version
const storage = getStorageManager({ bidderCode: BIDDER_CODE });

/**
 * Placement ID and Account ID are required.
 * @param {BidRequest} bidRequest
 * @returns {boolean}
 */
const isBidRequestValid = bidRequest => {
  return !!bidRequest.adUnitCode && !!bidRequest.params.accountId;
};

/**
 * @param {Array<BidRequest>} validBidRequests
 * @param {any} bidderRequest
 * @returns {ServerRequest}
 */
export const buildRequests = (validBidRequests, bidderRequest) => {
  return {
    method: 'POST',
    url: UNICORN_ENDPOINT,
    data: buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest)
  };
};

/**
 * Resolve the slot's DOM element id for a bid request, in priority order:
 *   1) explicit ortb2Imp.ext.data.divId override (established convention,
 *      also read by adagioBidAdapter/adagioRtdProvider/contxtfulRtdProvider);
 *   2) GPT slot mapping (getSlotElementId) — handles code !== div id;
 *   3) the ad unit code itself (when div id === code).
 */
function resolveDivId(bidRequest) {
  const override = deepAccess(bidRequest, 'ortb2Imp.ext.data.divId');
  if (override) return override;
  const fromGpt = getGptSlotInfoForAdUnitCode(bidRequest.adUnitCode).divId;
  return fromGpt || bidRequest.adUnitCode;
}

/**
 * Walk up the ancestor chain to detect a fixed/sticky wrapper. Anchor and
 * sticky ad units are usually a `position: fixed`/`sticky` *wrapper* around a
 * statically positioned ad div, so checking only the slot element itself
 * misses the common case.
 */
function fixedOrSticky(el) {
  const win = el.ownerDocument?.defaultView || window;
  let node = el;
  let fixed = false;
  let sticky = false;
  while (node && node.nodeType === 1) {
    const position = win.getComputedStyle(node).position;
    if (position === 'fixed') fixed = true;
    else if (position === 'sticky') sticky = true;
    node = node.parentElement;
  }
  return { fixed, sticky };
}

/**
 * Measure the ad slot's on-screen position/geometry and viewability, for the
 * imp this bid request builds. Returns null when the slot element cannot be
 * resolved.
 *
 * This runs synchronously in buildRequests, when the auction is already
 * dispatching bid requests to bidders — by that point slot elements are
 * expected to be in the DOM, the same assumption other adapters that call
 * `percentInView` synchronously (33across, marsmedia, oms, ...) rely on.
 * Measuring here — rather than pre-auction in a Real-Time Data submodule —
 * keeps the signal scoped to this adapter's own OpenRTB payload: nothing is
 * written back to `ortb2Imp`, so no other bidder or PBS can be affected by it.
 */
function measureAdslot(bidRequest) {
  const divId = resolveDivId(bidRequest);
  const el = divId && document.getElementById(divId);
  if (!el) {
    logWarn(`[UNICORN] adslot element not found for adUnit "${bidRequest.adUnitCode}" (divId="${divId}")`);
    return null;
  }

  const size = { w: deepAccess(bidRequest, 'sizes.0.0'), h: deepAccess(bidRequest, 'sizes.0.1') };
  const win = el.ownerDocument.defaultView;

  // getBoundingBox uses Prebid's shared (per-auction, cached) getBoundingClientRect
  // helper and applies the size override when the element measures 0x0 (e.g. an
  // empty GPT slot div before the creative renders).
  const box = getBoundingBox(el, size);

  // offset between this window's viewport and the top window's, for slots
  // measured from inside a friendly iframe.
  const offset = getViewportOffset(win);
  const dims = getWinDimensions();
  const scrollX = dims.document.documentElement.scrollLeft || dims.document.body.scrollLeft || 0;
  const scrollY = dims.document.documentElement.scrollTop || dims.document.body.scrollTop || 0;
  const x = Math.round(box.left + offset.x + scrollX);
  const y = Math.round(box.top + offset.y + scrollY);

  // "Above the fold" is a document-relative property — whether the slot
  // falls within the page's *initial* viewport — so compare the document-relative
  // y against the viewport height, not the (scroll-dependent) viewport-relative
  // rect.top. This keeps `pos` stable across refresh auctions after the user
  // has scrolled.
  const vh = dims.document.documentElement.clientHeight;
  const pos = y < vh ? 1 : 3; // OpenRTB AdPosition: 1 = above the fold, 3 = below the fold

  const topWin = canAccessWindowTop() ? getWindowTop() : getWindowSelf();
  const ratio = Number((getViewability(el, topWin, size) / 100).toFixed(2));

  const { fixed, sticky } = fixedOrSticky(el);

  return {
    pos,
    signal: {
      ver: ADSLOT_SIGNAL_VERSION,
      ratio,
      fixed,
      sticky,
      w: Math.round(box.width),
      h: Math.round(box.height),
      x,
      y
    }
  };
}

/**
 * Transform BidRequest to OpenRTB-formatted BidRequest Object
 * @param {Array<BidRequest>} validBidRequests
 * @param {any} bidderRequest
 * @returns {string}
 */
function buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest) {
  logInfo('[UNICORN] buildOpenRtbBidRequestPayload.validBidRequests:', validBidRequests);
  logInfo('[UNICORN] buildOpenRtbBidRequestPayload.bidderRequest:', bidderRequest);
  const imp = validBidRequests.map(br => {
    const banner = {
      format: makeFormat(br.sizes),
      w: br.sizes[0][0],
      h: br.sizes[0][1]
    };
    const adslot = measureAdslot(br);
    // A publisher-declared pos (via global FPD) takes priority over our own
    // measurement.
    const declaredPos = deepAccess(br, 'ortb2Imp.banner.pos');
    if (declaredPos != null) {
      banner.pos = declaredPos;
    } else if (adslot) {
      banner.pos = adslot.pos;
    }
    const impObj = {
      id: br.bidId,
      banner,
      tagid: deepAccess(br, 'params.placementId') || br.adUnitCode,
      secure: 1,
      bidfloor: parseFloat(0)
    };
    const ext = {};
    if (adslot) {
      // Slot geometry/viewability, sent only in this adapter's own OpenRTB
      // payload — not shared FPD, so no other bidder or PBS ever sees it.
      ext.adslot = adslot.signal;
    }
    // GPID (Global Placement ID) — set by the gpid / gptPreAuction module on
    // ortb2Imp.ext.gpid. Forwarded so the exchange can key on a stable slot id
    // that is independent of the ad unit code.
    const gpid = deepAccess(br, 'ortb2Imp.ext.gpid');
    if (gpid) {
      ext.gpid = gpid;
    }
    if (Object.keys(ext).length > 0) {
      impObj.ext = ext;
    }
    return impObj;
  });
  const request = {
    id: bidderRequest.bidderRequestId,
    at: 1,
    imp,
    cur: [UNICORN_DEFAULT_CURRENCY],
    site: {
      id: deepAccess(validBidRequests[0], 'params.mediaId') || '',
      publisher: {
        id: String(deepAccess(validBidRequests[0], 'params.publisherId') || 0)
      },
      domain: bidderRequest.refererInfo.domain,
      page: bidderRequest.refererInfo.page,
      ref: bidderRequest.refererInfo.ref
    },
    device: {
      language: navigator.language,
      ua: navigator.userAgent
    },
    user: {
      id: getUid()
    },
    bcat: deepAccess(validBidRequests[0], 'params.bcat') || [],
    source: {
      ext: {
        stype: 'prebid_uncn',
        bidder: BIDDER_CODE,
        prebid_version: UNICORN_PB_VERSION
      }
    },
    ext: {
      accountId: deepAccess(validBidRequests[0], 'params.accountId')
    }
  };
  const eids = initializeEids(validBidRequests[0]);
  if (eids.length > 0) {
    request.user.eids = eids;
  }

  logInfo('[UNICORN] OpenRTB Formatted Request:', request);
  return JSON.stringify(request);
}

const initializeEids = (bidRequest) => {
  const eids = [];

  const id5 = deepAccess(bidRequest, 'userId.id5id.uid');
  if (id5) {
    eids.push({
      source: 'id5-sync.com',
      uids: [
        {
          id: id5
        }
      ]
    });
  }

  return eids;
};

const interpretResponse = (serverResponse, request) => {
  logInfo('[UNICORN] interpretResponse.serverResponse:', serverResponse);
  logInfo('[UNICORN] interpretResponse.request:', request);
  const res = serverResponse.body;
  var bids = [];
  if (res) {
    res.seatbid.forEach(sb => {
      sb.bid.forEach(b => {
        var bid = {
          requestId: b.impid,
          cpm: b.price || 0,
          width: b.w,
          height: b.h,
          ad: b.adm,
          ttl: 1000,
          creativeId: b.crid,
          netRevenue: true,
          currency: res.cur
        };

        if (b.adomain) {
          bid.meta = { advertiserDomains: b.adomain };
        }

        bids.push(bid);
      });
    });
  }
  logInfo('[UNICORN] interpretResponse bids:', bids);
  return bids;
};

/**
 * Get or Create Uid for First Party Cookie
 */
const getUid = () => {
  const ck = storage.getCookie(UNICORN_PB_COOKIE_KEY);
  if (ck) {
    return JSON.parse(ck)['uid'];
  } else {
    const newCk = {
      uid: generateUUID()
    };
    const expireIn = new Date(Date.now() + 24 * 60 * 60 * 10000).toUTCString();
    storage.setCookie(UNICORN_PB_COOKIE_KEY, JSON.stringify(newCk), expireIn);
    return newCk.uid;
  }
};

/**
 * Make imp.banner.format
 * @param {Array<Number>} arr
 */
const makeFormat = arr => arr.map((s) => {
  return { w: s[0], h: s[1] };
});

export const spec = {
  code: BIDDER_CODE,
  aliases: ['uncn'],
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse
};

registerBidder(spec);
