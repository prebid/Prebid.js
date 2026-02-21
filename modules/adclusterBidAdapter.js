import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, VIDEO } from "../src/mediaTypes.js";

const BIDDER_CODE = "adcluster";
const ENDPOINT = "https://core.adcluster.com.tr/bid";

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    return !!bid?.params?.unitId;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const _auctionId = bidderRequest.auctionId || "";
    const payload = {
      bidderCode: bidderRequest.bidderCode,
      auctionId: _auctionId,
      bidderRequestId: bidderRequest.bidderRequestId,
      bids: validBidRequests.map((b) => buildImp(b)),
      auctionStart: bidderRequest.auctionStart,
      timeout: bidderRequest.timeout,
      start: bidderRequest.start,
      regs: { ext: {} },
      user: { ext: {} },
      source: { ext: {} },
    };

    // privacy
    if (bidderRequest?.gdprConsent) {
      payload.regs = payload.regs || { ext: {} };
      payload.regs.ext = payload.regs.ext || {};
      payload.regs.ext.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
      payload.user.ext.consent = bidderRequest.gdprConsent.consentString || "";
    }
    if (bidderRequest?.uspConsent) {
      payload.regs = payload.regs || { ext: {} };
      payload.regs.ext.us_privacy = bidderRequest.uspConsent;
    }
    if (bidderRequest?.ortb2?.regs?.gpp) {
      payload.regs = payload.regs || { ext: {} };
      payload.regs.ext.gpp = bidderRequest.ortb2.regs.gpp;
      payload.regs.ext.gppSid = bidderRequest.ortb2.regs.gpp_sid;
    }
    if (validBidRequests[0]?.userIdAsEids) {
      payload.user.ext.eids = validBidRequests[0].userIdAsEids;
    }
    if (validBidRequests[0]?.ortb2?.source?.ext?.schain) {
      payload.source.ext.schain = validBidRequests[0].ortb2.source.ext.schain;
    }

    return {
      method: "POST",
      url: ENDPOINT,
      data: payload,
      options: { contentType: "text/plain" },
    };
  },

  interpretResponse(serverResponse) {
    const body = serverResponse?.body;
    if (!body || !Array.isArray(body)) return [];
    const bids = [];

    body.forEach((b) => {
      const mediaType = detectMediaType(b);
      const bid = {
        requestId: b.requestId,
        cpm: b.cpm,
        currency: b.currency,
        width: b.width,
        height: b.height,
        creativeId: b.creativeId,
        ttl: b.ttl,
        netRevenue: b.netRevenue,
        meta: {
          advertiserDomains: b.meta?.advertiserDomains || [],
        },
        mediaType,
      };

      if (mediaType === BANNER) {
        bid.ad = b.ad;
      }
      if (mediaType === VIDEO) {
        bid.vastUrl = b.ad;
      }
      bids.push(bid);
    });

    return bids;
  },
};

/* ---------- helpers ---------- */

function buildImp(bid) {
  const _transactionId = bid.transactionId || "";
  const _adUnitId = bid.adUnitId || "";
  const _auctionId = bid.auctionId || "";
  const imp = {
    params: {
      unitId: bid.params.unitId,
    },
    bidId: bid.bidId,
    bidderRequestId: bid.bidderRequestId,
    transactionId: _transactionId,
    adUnitId: _adUnitId,
    auctionId: _auctionId,
    ext: {
      floors: getFloorsAny(bid),
    },
  };

  if (bid.params && bid.params.previewMediaId) {
    imp.params.previewMediaId = bid.params.previewMediaId;
  }

  const mt = bid.mediaTypes || {};

  // BANNER
  if (mt.banner?.sizes?.length) {
    imp.width = mt.banner.sizes[0] && mt.banner.sizes[0][0];
    imp.height = mt.banner.sizes[0] && mt.banner.sizes[0][1];
  }
  if (mt.video) {
    const v = mt.video;
    const playerSize = toSizeArray(v.playerSize);
    const [vw, vh] = playerSize?.[0] || [];
    imp.width = vw;
    imp.height = vh;
    imp.video = {
      minduration: v.minduration || 1,
      maxduration: v.maxduration || 120,
      ext: {
        context: v.context || "instream",
        floor: getFloors(bid, "video", playerSize?.[0]),
      },
    };
  }

  return imp;
}

function toSizeArray(s) {
  if (!s) return null;
  // playerSize can be [w,h] or [[w,h], [w2,h2]]
  return Array.isArray(s[0]) ? s : [s];
}

function getFloors(bid, mediaType = "banner", size) {
  try {
    if (!bid.getFloor) return null;
    // size can be [w,h] or '*'
    const sz = Array.isArray(size) ? size : "*";
    const res = bid.getFloor({ mediaType, size: sz });
    return res && typeof res.floor === "number" ? res.floor : null;
  } catch {
    return null;
  }
}

function detectMediaType(bid) {
  if (bid.mediaType === "video") return VIDEO;
  else return BANNER;
}

function getFloorsAny(bid) {
  // Try to collect floors per type
  const out = {};
  const mt = bid.mediaTypes || {};
  if (mt.banner) {
    out.banner = getFloors(bid, "banner", "*");
  }
  if (mt.video) {
    const ps = toSizeArray(mt.video.playerSize);
    out.video = getFloors(bid, "video", (ps && ps[0]) || "*");
  }
  return out;
}

registerBidder(spec);
