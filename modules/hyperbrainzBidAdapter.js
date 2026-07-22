/**
 * HyperBrainz Bidder Adapter
 *
 *
 * Supports: Display, Video, Native
 *
 * @version 1.0.0
 */
import {
  logInfo,
  logWarn,
  logError,
  deepAccess,
  deepSetValue,
  generateUUID,
  triggerPixel,
} from "../src/utils.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { BANNER, VIDEO, NATIVE } from "../src/mediaTypes.js";
import { config } from "../src/config.js";
import { getStorageManager } from "../src/storageManager.js";

// Bidder constants
const BIDDER_CODE = "hyperbrainz";
const ADAPTER_VERSION = "1.0.0";
const ENDPOINT = "https://hb.hyperbrainz.com/bid";
const SYNC_URL = "https://hb.hyperbrainz.com/sync";
const DEFAULT_CURRENCY = "USD";
const TTL = 300; // 5 minutes
const DEFAULT_TIMEOUT = 1200; // milliseconds

// Storage manager for user IDs
const storage = getStorageManager({ bidderCode: BIDDER_CODE });
function isBidRequestValid(bidRequest) {
  if (!bidRequest || !bidRequest.params) {
    logError("HyperBrainz: Bid request is not valid");
    return false;
  }

  if (
    !bidRequest.params.placementId ||
    typeof bidRequest.params.placementId !== "string"
  ) {
    logWarn("HyperBrainz: placementId must be a non-empty string");
    return false;
  }

  const hasValidMediaType =
    bidRequest.mediaTypes &&
    (bidRequest.mediaTypes[BANNER] ||
      bidRequest.mediaTypes[VIDEO] ||
      bidRequest.mediaTypes[NATIVE]);

  if (!hasValidMediaType) {
    logWarn(
      "HyperBrainz: bid must have at least one valid mediaType (banner, video, or native)"
    );
    return false;
  }

  if (bidRequest.mediaTypes[VIDEO]) {
    const video = bidRequest.mediaTypes[VIDEO];
    if (!video.context) {
      logWarn("HyperBrainz: video context is required (instream/outstream)");
      return false;
    }
    if (!video.playerSize && !video.w && !video.h) {
      logWarn("HyperBrainz: video playerSize or w/h is required");
      return false;
    }
  }

  return true;
}

function buildRequests(validBidRequests, bidderRequest) {
  if (!validBidRequests || validBidRequests.length === 0) {
    return [];
  }

  const endpoint = config.getConfig("hyperbrainz.endpoint") || ENDPOINT;

  // Group bids by endpoint (allows custom endpoints per placement)
  const grouped = groupBidsByEndpoint(validBidRequests, endpoint);

  const requests = [];

  Object.keys(grouped).forEach((endpointUrl) => {
    const bids = grouped[endpointUrl];

    const ortbRequest = buildOpenRtbRequest(bids, bidderRequest, endpointUrl);

    requests.push({
      method: "POST",
      url: endpointUrl,
      data: JSON.stringify(ortbRequest),
      options: {
        contentType: "text/plain",
        withCredentials: true,
      },
      bidderRequest,
      bids,
    });
  });

  return requests;
}

function groupBidsByEndpoint(validBids, defaultEndpoint) {
  const map = {};

  validBids.forEach((bid) => {
    const ep = bid.params.endpoint || defaultEndpoint;
    if (!map[ep]) map[ep] = [];
    map[ep].push(bid);
  });

  return map;
}

function buildOpenRtbRequest(bids, bidderRequest, endpoint) {
  const timeout =
    bidderRequest?.timeout ||
    config.getConfig("bidderTimeout") ||
    DEFAULT_TIMEOUT;

  const ortb = {
    id:
      bidderRequest.auctionId ||
      bidderRequest.bidderRequestId ||
      generateUUID(),
    imp: bids.map((bid) => buildImp(bid)),
    site: buildSite(bidderRequest),
    device: buildDevice(bidderRequest),
    user: buildUser(bidderRequest),
    regs: buildRegs(bidderRequest),
    at: 1,
    tmax: timeout,
    cur: [DEFAULT_CURRENCY],
    source: buildSource(bidderRequest),
    ext: {
      prebid: {
        version: "$prebid.version$",
        adapterVersion: ADAPTER_VERSION,
        auctionId: bidderRequest.auctionId,
      },
    },
  };

  // Supply chain (schain). Read from ORTB2 (the current Prebid location);
  // fall back to the legacy bidderRequest.schain for older Prebid versions.
  const schain =
    deepAccess(bidderRequest, "ortb2.source.ext.schain") ||
    bidderRequest?.schain;
  if (schain) {
    ortb.source.ext = ortb.source.ext || {};
    ortb.source.ext.schain = schain;
  }

  // First-party data (ORTB2)
  const ortb2 = bidderRequest?.ortb2 || {};
  if (ortb2.site?.ext?.data) {
    deepSetValue(ortb, "site.ext.data", ortb2.site.ext.data);
  }
  if (ortb2.user?.ext?.data) {
    deepSetValue(ortb, "user.ext.data", ortb2.user.ext.data);
  }

  return ortb;
}

function interpretResponse(serverResponse, request) {
  try {
    const response = serverResponse?.body;
    const bidderRequest = request?.bidderRequest || {};
    const bids = [];

    if (!response || !Array.isArray(response.seatbid)) {
      logInfo("HyperBrainz: No valid seatbid in response");
      return bids;
    }

    response.seatbid.forEach((seat) => {
      if (!Array.isArray(seat.bid)) return;
      seat.bid.forEach((bid) => {
        const builtBid = buildBid(bid, response, bidderRequest);
        if (builtBid) bids.push(builtBid);
      });
    });

    return bids;
  } catch (e) {
    logError(`${BIDDER_CODE}: Error parsing bid response`, e);
    return [];
  }
}

function buildBid(bid, response, request) {
  // Basic validation
  if (!bid || !bid.price || bid.price <= 0) {
    return null;
  }

  // Match bid to original request by impid (which we set to bidId in buildImp)
  const originalBid = request.bids?.find((b) => b.bidId === bid.impid);

  if (!originalBid) {
    logWarn(`${BIDDER_CODE}: No original bid found for impid ${bid.impid}`);
    return null;
  }

  const mediaType = getMediaType(bid, originalBid);

  // Base Prebid bid object
  const prebidBid = {
    requestId: bid.impid,
    cpm: bid.price,
    currency: response.cur || DEFAULT_CURRENCY,
    width: bid.w,
    height: bid.h,
    ttl: TTL,
    netRevenue: true,
    creativeId: bid.crid || bid.id || generateUUID(),
    dealId: bid.dealid || undefined,
    mediaType: mediaType,
    meta: {
      advertiserDomains: Array.isArray(bid.adomain) ? bid.adomain : [],
      mediaType: mediaType,
    },
  };

  // Win/billing notice URLs. Prebid fires nurl when the bid wins.
  if (bid.nurl) {
    prebidBid.nurl = bid.nurl;
  }
  if (bid.burl) {
    prebidBid.burl = bid.burl;
  }

  if (mediaType === VIDEO) {
    if (bid.adm) prebidBid.vastXml = bid.adm;
    if (bid.nurl) prebidBid.vastUrl = bid.nurl;
  } else if (mediaType === NATIVE) {
    const ortbNative = parseNative(bid.adm);
    if (!ortbNative) return null;
    prebidBid.native = { ortb: ortbNative };
  } else {
    if (bid.adm) {
      prebidBid.ad = bid.adm;
    } else if (bid.nurl) {
      prebidBid.adUrl = bid.nurl;
    }
  }

  if (bid.ext && typeof bid.ext === "object") {
    prebidBid.ext = { ...bid.ext };
  }

  return prebidBid;
}

function getMediaType(bid, originalBid) {
  if (bid.ext?.prebid?.type) {
    return bid.ext.prebid.type;
  }

  if (bid.mtype === 1) return BANNER;
  if (bid.mtype === 2) return VIDEO;
  if (bid.mtype === 4) return NATIVE;

  const mt = originalBid.mediaTypes || {};
  const formatCount = [mt.banner, mt.video, mt.native].filter(Boolean).length;
  if (formatCount === 1) {
    if (mt.video) return VIDEO;
    if (mt.native) return NATIVE;
    if (mt.banner) return BANNER;
  }

  return BANNER;
}

function parseNative(adm) {
  if (!adm) return null;

  let nativeAdm = adm;
  if (typeof adm === "string") {
    try {
      nativeAdm = JSON.parse(adm);
    } catch (err) {
      logWarn(`${BIDDER_CODE}: Failed to parse native ADM`);
      return null;
    }
  }

  // Prebid renders native from the raw OpenRTB native response object,
  // so hand it back unmodified once we know it carries assets.
  if (!nativeAdm || !Array.isArray(nativeAdm.assets)) {
    return null;
  }

  return nativeAdm;
}
function getBidFloor(bid) {
  // Check params first
  if (bid.params.bidFloor) {
    return parseFloat(bid.params.bidFloor);
  }

  // Check getFloor module
  if (typeof bid.getFloor === "function") {
    const floorInfo = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: "*",
      size: "*",
    });
    if (floorInfo && floorInfo.floor) {
      return floorInfo.floor;
    }
  }

  return 0;
}

function buildImp(bid) {
  const imp = {
    id: bid.bidId,
    tagid: bid.params.placementId,
    secure: window.location.protocol === "https:" ? 1 : 0,
    bidfloor: getBidFloor(bid),
    bidfloorcur: DEFAULT_CURRENCY,
  };

  // Banner
  if (bid.mediaTypes && bid.mediaTypes[BANNER]) {
    imp.banner = buildBanner(bid);
  }

  // Video
  if (bid.mediaTypes && bid.mediaTypes[VIDEO]) {
    imp.video = buildVideo(bid);
  }

  // Native
  if (bid.mediaTypes && bid.mediaTypes[NATIVE]) {
    imp.native = buildNative(bid);
  }

  // Bidder-specific parameters
  if (bid.params.ext) {
    imp.ext = bid.params.ext;
  }

  return imp;
}

// Build site object
function buildSite(bidderRequest) {
  const firstBid = bidderRequest.bids && bidderRequest.bids[0];

  return {
    page: bidderRequest.refererInfo?.page || window.location.href,
    domain: bidderRequest.refererInfo?.domain || window.location.hostname,
    ref: bidderRequest.refererInfo?.ref || document.referrer,
    publisher: {
      id: firstBid?.params?.publisherId || undefined,
    },
  };
}

// Build device object
function buildDevice(bidderRequest) {
  const d = bidderRequest?.ortb2?.device || {};
  return {
    ua: d.ua,
    language: d.language,
    w: d.w,
    h: d.h,
    dnt: d.dnt,
    sua: d.sua,
  };
}

// Build user object
function buildUser(bidderRequest) {
  const user = {};

  // User ID from storage or params
  try {
    const storedId = storage.getDataFromLocalStorage("hb_userId");
    const paramId = deepAccess(bidderRequest, "bids.0.params.userId");
    if (storedId || paramId) {
      user.id = storedId || paramId;
    }
  } catch (e) {
    logWarn("HyperBrainz: Error accessing storage", e);
  }
  // EIDs (Unified ID 2.0, ID5, SharedID, NetID, LI, etc.)
  const eids = deepAccess(bidderRequest, "bids.0.userIdAsEids");
  if (Array.isArray(eids) && eids.length) {
    user.ext = user.ext || {};
    user.ext.eids = eids;
  }

  // First-party data (ORTB2 user)
  const fpdUser = deepAccess(bidderRequest, "ortb2.user");
  if (fpdUser) {
    Object.assign(user, fpdUser);
  }

  // GDPR Consent (OpenRTB standard)
  const consent = deepAccess(bidderRequest, "gdprConsent.consentString");
  if (consent) {
    user.ext = user.ext || {};
    user.ext.consent = consent;
  }

  return user;
}

function buildBanner(bid) {
  const banner = {};
  const sizes = bid.mediaTypes[BANNER].sizes || [];

  banner.format = sizes.map((size) => ({
    w: size[0],
    h: size[1],
  }));

  // Use first size as primary
  if (sizes.length > 0) {
    banner.w = sizes[0][0];
    banner.h = sizes[0][1];
  }

  return banner;
}

function buildNative(bid) {
  const nativeOrtbRequest = bid.nativeOrtbRequest;
  if (!nativeOrtbRequest) {
    return undefined;
  }

  return {
    request: JSON.stringify(nativeOrtbRequest),
    ver: nativeOrtbRequest.ver || "1.2",
  };
}
function buildVideo(bid) {
  const video = Object.assign({}, bid.mediaTypes[VIDEO] || {});
  const context = bid.mediaTypes?.[VIDEO]?.context;

  // Default mimes and protocols
  video.mimes = video.mimes || ["video/mp4", "video/webm"];
  video.protocols = video.protocols || [2, 3, 5, 6];

  // Handle playerSize
  if (video.playerSize) {
    if (Array.isArray(video.playerSize[0])) {
      video.w = video.playerSize[0][0];
      video.h = video.playerSize[0][1];
    } else {
      video.w = video.playerSize[0];
      video.h = video.playerSize[1];
    }
    delete video.playerSize;
  }

  // ORTB-required fields
  video.linearity = video.linearity || 1;

  // OpenRTB 2.5 placement (deprecated but still used by many DSPs)
  video.placement = video.placement || (context === "outstream" ? 3 : 1);

  // OpenRTB 2.6 plcmt (modern field — set both for compatibility)
  // 1=instream, 2=accompanying, 3=interstitial, 4=standalone
  if (!video.plcmt) {
    if (context === "instream") {
      video.plcmt = 1;
    } else if (context === "outstream") {
      video.plcmt = 4;
    }
  }

  // Recommended fields
  video.minduration = video.minduration || 1;
  video.maxduration = video.maxduration || 60;
  video.startdelay =
    video.startdelay ?? (context === "instream" ? 0 : undefined);
  video.skip = video.skip ?? 0;

  // Remove non-ORTB fields
  delete video.context;

  return video;
}

// Build regs object
function buildRegs(bidderRequest) {
  const regs = {};

  // COPPA
  if (config.getConfig("coppa") === true) {
    regs.coppa = 1;
  }

  // GDPR
  if (bidderRequest?.gdprConsent) {
    regs.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
  }

  // US privacy
  regs.ext = regs.ext || {};
  if (bidderRequest?.uspConsent) {
    regs.ext.us_privacy = bidderRequest.uspConsent;
  }

  // GPP
  const gppString =
    bidderRequest?.gppConsent?.gppString ||
    deepAccess(bidderRequest, "ortb2.regs.gpp");
  const gppSid =
    bidderRequest?.gppConsent?.applicableSections ||
    deepAccess(bidderRequest, "ortb2.regs.gpp_sid");

  if (gppString) regs.gpp = gppString;
  if (gppSid) regs.gpp_sid = gppSid;

  return regs;
}

// Build source object
function buildSource(bidderRequest) {
  return {
    fd: 1,
    tid: bidderRequest?.ortb2?.source?.tid || generateUUID(),
  };
}

function getUserSyncs(
  syncOptions,
  serverResponses,
  gdprConsent,
  uspConsent,
  gppConsent
) {
  const syncs = [];

  if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
    return syncs;
  }

  // Build privacy string
  let params = [];

  // GDPR
  if (gdprConsent) {
    const gdprApplies =
      typeof gdprConsent.gdprApplies === "boolean"
        ? Number(gdprConsent.gdprApplies)
        : "";
    const consent = encodeURIComponent(gdprConsent.consentString || "");

    params.push(`gdpr=${gdprApplies}`);
    params.push(`gdpr_consent=${consent}`);
  }

  // CCPA
  if (uspConsent) {
    params.push(`us_privacy=${encodeURIComponent(uspConsent)}`);
  }

  // GPP (optional but recommended)
  if (gppConsent) {
    const gppString = encodeURIComponent(gppConsent.gppString || "");
    const sid = (gppConsent.applicableSections || []).join(",");

    params.push(`gpp=${gppString}`);
    params.push(`gpp_sid=${sid}`);
  }

  const paramString = params.length ? `?${params.join("&")}` : "";

  // Server-provided user syncs
  serverResponses.forEach((response) => {
    const ext = response.body && response.body.ext;
    const syncList = ext && ext.sync;

    if (syncList && Array.isArray(syncList)) {
      syncList.forEach((sync) => {
        if (sync.type === "iframe" && syncOptions.iframeEnabled) {
          syncs.push({
            type: "iframe",
            url: sync.url + paramString,
          });
        }
        if (sync.type === "image" && syncOptions.pixelEnabled) {
          syncs.push({
            type: "image",
            url: sync.url + paramString,
          });
        }
      });
    }
  });

  // Fallback user sync
  if (syncs.length === 0) {
    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: "iframe",
        url: `${SYNC_URL}${paramString}`,
      });
    } else if (syncOptions.pixelEnabled) {
      syncs.push({
        type: "image",
        url: `${SYNC_URL}${paramString}`,
      });
    }
  }

  return syncs;
}

function onBidWon(bid) {
  logInfo("HB: Bid won", bid);
  if (bid.nurl) {
    triggerPixel(bid.nurl);
  }
}

function onBidBillable(bid) {
  if (bid.burl) {
    const url = bid.burl.replace(
      /\$\{AUCTION_PRICE\}/g,
      encodeURIComponent(bid.cpm)
    );
    triggerPixel(url);
  }
}

function onTimeout(timeoutData) {
  logInfo("HyperBrainz: Bid timeout", timeoutData);
  if (timeoutData.ext && timeoutData.ext.timeoutPixel) {
    triggerPixel(timeoutData.ext.timeoutPixel);
  }
}

function onSetTargeting(bid) {
  // Called when GAM/DFP targeting is set for this bid.
  // Useful for logging or custom key-value injection.
  logInfo("HyperBrainz: Targeting set", bid.adUnitCode);
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
  onTimeout,
  onSetTargeting,
  onBidBillable,
};

registerBidder(spec);
