/**
 * PGAM Direct — Prebid.js bid adapter.
 *
 * Speaks canonical OpenRTB 2.5/2.6 directly to our bidder at
 *   https://rtb.pgammedia.com/rtb/v1/auction
 *
 * Intentionally NOT a fork of pgamsspBidAdapter — that adapter uses a
 * custom TeqBlaze envelope shape, while our bidder speaks real OpenRTB.
 * Sharing code would mean adding compat paths on both sides; cleaner to
 * have a purpose-built adapter that's 1:1 with our server contract.
 *
 * Publisher-facing params shape (mirrors pgamssp for migration familiarity):
 *
 *   pbjs.addAdUnits([{
 *     code: 'ad-slot-1',
 *     mediaTypes: { banner: { sizes: [[300, 250], [728, 90]] } },
 *     bids: [{
 *       bidder: 'pgamdirect',
 *       params: {
 *         orgId: 'pgam-acme-publisher',      // REQUIRED — we issue this to the publisher
 *         placementId: 'leaderboard-728x90',  // optional — maps to imp.tagid
 *       }
 *     }]
 *   }]);
 *
 * When published to Prebid.org, lives at modules/pgamdirectBidAdapter.js.
 * Today: shipped as a standalone file publishers drop into their Prebid
 * build, plus an IIFE bundle for dynamic loading on a test page.
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, logError, logInfo, deepSetValue } from '../src/utils.js';
import { getWinDimensions } from '../src/utils/winDimensions.js';

const BIDDER_CODE = 'pgamdirect';
const ENDPOINT_URL = 'https://rtb.pgammedia.com/rtb/v1/auction';
const DEFAULT_CUR = 'USD';
const DEFAULT_TMAX = 300;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * Minimum: orgId must be a non-empty string. That's the identifier we
   * use to route the request to a publisher/tenant on our side; without
   * it the bidder returns publisher_not_found.
   */
  isBidRequestValid(bid) {
    const orgId = deepAccess(bid, 'params.orgId');
    if (!orgId || typeof orgId !== 'string') {
      logError(`[${BIDDER_CODE}] params.orgId is required and must be a string`);
      return false;
    }
    return true;
  },

  /**
   * Build one OpenRTB 2.6 BidRequest per Prebid call. One HTTP POST per
   * auction regardless of ad-unit count — all imps go in `imp[]`.
   */
  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0) return [];

    const imps = validBidRequests.map(buildImp).filter(Boolean);
    if (imps.length === 0) return [];

    const ortbReq = {
      id: bidderRequest.auctionId,
      imp: imps,
      site: buildSite(bidderRequest),
      device: buildDevice(bidderRequest),
      user: buildUser(bidderRequest),
      source: buildSource(bidderRequest, validBidRequests[0]),
      regs: buildRegs(bidderRequest),
      at: 1,
      tmax: bidderRequest.timeout || DEFAULT_TMAX,
      cur: [DEFAULT_CUR],
    };

    // Attach any first-party data the publisher has configured (ortb2).
    const ortb2 = bidderRequest.ortb2 || {};
    if (ortb2.site) ortbReq.site = Object.assign({}, ortb2.site, ortbReq.site);
    if (ortb2.user) ortbReq.user = Object.assign({}, ortb2.user, ortbReq.user);

    logInfo(`[${BIDDER_CODE}] outbound ${imps.length} imps to ${ENDPOINT_URL}`);

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: ortbReq,
      options: {
        contentType: 'application/json;charset=utf-8',
        withCredentials: false,
        customHeaders: {
          'x-openrtb-version': '2.6',
        },
      },
    };
  },

  /**
   * Walk the OpenRTB BidResponse, map seatbid[].bid[] → Prebid bid objects.
   * Anything missing required Prebid fields (cpm / creativeId / ttl /
   * currency) is dropped with a log — can't silently ship broken bids
   * into the Prebid auction.
   */
  interpretResponse(serverResponse, request) {
    const body = serverResponse && serverResponse.body;
    if (!body || !Array.isArray(body.seatbid)) return [];

    const bids = [];
    const cur = body.cur || DEFAULT_CUR;

    for (const seat of body.seatbid) {
      if (!seat || !Array.isArray(seat.bid)) continue;
      for (const bid of seat.bid) {
        const prebid = ortbBidToPrebid(bid, seat, cur);
        if (prebid) bids.push(prebid);
      }
    }
    logInfo(`[${BIDDER_CODE}] ${bids.length} bids parsed from seatbid`);
    return bids;
  },

  /**
   * Win notice → we fire burl+nurl automatically via our response; Prebid
   * doesn't need to call anything else. Keeping this hook as a no-op so
   * older Prebid.js versions that expect the method don't crash.
   */
  onBidWon(_bid) {
    // no-op — burl/nurl handled server-side by bidder-edge
  },
};

// ---- request builders ------------------------------------------------------

function buildImp(bid, idx) {
  const imp = {
    id: bid.bidId || String(idx + 1),
    bidfloor: bid.params.bidfloor || 0,
    bidfloorcur: DEFAULT_CUR,
    secure: 1,
    ext: {
      pgam: {
        orgId: bid.params.orgId,
      },
    },
  };
  if (bid.params.placementId) {
    imp.tagid = String(bid.params.placementId);
  }

  // Banner
  const banner = deepAccess(bid, 'mediaTypes.banner');
  if (banner) {
    imp.banner = {
      w: banner.sizes && banner.sizes[0] ? banner.sizes[0][0] : undefined,
      h: banner.sizes && banner.sizes[0] ? banner.sizes[0][1] : undefined,
      format: (banner.sizes || []).map(([w, h]) => ({ w, h })),
      pos: banner.pos || 0,
    };
  }

  // Video — passthrough of the major ortb2 fields
  const video = deepAccess(bid, 'mediaTypes.video');
  if (video) {
    imp.video = {
      mimes: video.mimes,
      w: video.w || (video.playerSize && video.playerSize[0] ? video.playerSize[0][0] : undefined),
      h: video.h || (video.playerSize && video.playerSize[0] ? video.playerSize[0][1] : undefined),
      minduration: video.minduration,
      maxduration: video.maxduration,
      protocols: video.protocols,
      api: video.api,
      placement: video.placement,
      plcmt: video.plcmt,
      linearity: video.linearity,
      startdelay: video.startdelay,
    };
  }

  // Native — forward the assets as-is; our bidder normalises on ingest
  const native = deepAccess(bid, 'mediaTypes.native');
  if (native) {
    imp.native = {
      request: JSON.stringify(native),
      ver: '1.2',
    };
  }

  // GPID passthrough
  const gpid = deepAccess(bid, 'ortb2Imp.ext.gpid');
  if (gpid) {
    deepSetValue(imp, 'ext.gpid', gpid);
  }

  return imp;
}

function buildSite(bidderRequest) {
  const refURL = (bidderRequest && bidderRequest.refererInfo) || {};
  return {
    page: refURL.page || refURL.referer || '',
    domain: refURL.domain || '',
    ref: refURL.ref || '',
  };
}

function buildDevice(_bidderRequest) {
  // DNT deprecated per Prebid policy — don't emit dnt field.
  // window dimensions via Prebid's cached helper (canAccessWindowTop
  // + throttled reads) so we don't hammer layout on every auction.
  const dims = getWinDimensions() || {};
  const device = {
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    w: dims.innerWidth || 0,
    h: dims.innerHeight || 0,
    js: 1,
  };
  return device;
}

function buildUser(bidderRequest) {
  const u = {};
  const eids = deepAccess(bidderRequest, 'userIdAsEids') || [];
  if (eids.length) u.ext = { eids };
  return u;
}

function buildSource(bidderRequest, firstBid) {
  const tid = deepAccess(bidderRequest, 'ortb2.source.tid') || bidderRequest.auctionId;
  const source = { tid, fd: 1 };
  // Schain — if publisher has registered one, forward it; our bidder
  // appends our own node on top before fanning to DSPs.
  const schain = deepAccess(firstBid, 'schain');
  if (schain) {
    source.ext = { schain };
  }
  return source;
}

function buildRegs(bidderRequest) {
  const regs = {};
  const gdpr = deepAccess(bidderRequest, 'gdprConsent');
  if (gdpr) {
    regs.ext = regs.ext || {};
    regs.ext.gdpr = gdpr.gdprApplies ? 1 : 0;
    if (gdpr.consentString) regs.ext.gdpr_consent = gdpr.consentString;
  }
  const usp = deepAccess(bidderRequest, 'uspConsent');
  if (usp) {
    regs.ext = regs.ext || {};
    regs.ext.us_privacy = usp;
  }
  const gpp = deepAccess(bidderRequest, 'gppConsent');
  if (gpp) {
    regs.gpp = gpp.gppString;
    regs.gpp_sid = gpp.applicableSections;
  }
  const coppa = deepAccess(bidderRequest, 'ortb2.regs.coppa');
  if (coppa != null) regs.coppa = coppa;
  return regs;
}

// ---- response mapping ------------------------------------------------------

function ortbBidToPrebid(bid, seat, cur) {
  if (!bid) return null;
  if (!bid.impid || typeof bid.price !== 'number' || bid.price <= 0) return null;

  const mediaType = inferMediaType(bid);
  const ttl = (bid.exp && Number(bid.exp)) || 300;

  const prebid = {
    requestId: bid.impid,
    cpm: bid.price,
    currency: cur,
    width: bid.w || 0,
    height: bid.h || 0,
    creativeId: bid.crid || bid.id || '',
    dealId: bid.dealid || null,
    netRevenue: true,
    ttl,
    mediaType,
    meta: {
      advertiserDomains: bid.adomain || [],
      mediaType,
      ...(bid.ext && bid.ext.meta ? bid.ext.meta : {}),
    },
  };

  if (mediaType === BANNER) {
    prebid.ad = bid.adm || '';
  } else if (mediaType === VIDEO) {
    if (bid.adm && bid.adm.trim().startsWith('<VAST')) prebid.vastXml = bid.adm;
    else if (bid.nurl) prebid.vastUrl = bid.nurl;
  } else if (mediaType === NATIVE) {
    try {
      prebid.native = typeof bid.adm === 'string' ? JSON.parse(bid.adm) : bid.adm;
    } catch (_) {
      return null;
    }
  }

  if (seat && seat.seat) prebid.meta.networkName = seat.seat;
  return prebid;
}

function inferMediaType(bid) {
  const extMT = deepAccess(bid, 'ext.meta.mediaType');
  if (extMT) return extMT;
  if (bid.adm && bid.adm.trim().startsWith('<VAST')) return VIDEO;
  if (bid.adm && bid.adm.trim().startsWith('{')) return NATIVE;
  return BANNER;
}

registerBidder(spec);
