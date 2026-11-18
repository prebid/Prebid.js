import {
  deepAccess,
  deepSetValue,
  generateUUID,
  getWinDimensions,
  isArray,
  isFn,
  isGptPubadsDefined,
  isInteger,
  isPlainObject,
  parseSizesInput,
  createTrackPixelHtml,
  replaceAuctionPrice,
} from "../src/utils.js";
import { registerBidder } from "../src/adapters/bidderFactory.js";
import { getStorageManager } from "../src/storageManager.js";
import { BANNER, VIDEO } from "../src/mediaTypes.js";
import { isSlotMatchingAdUnitCode } from "../libraries/gptUtils/gptUtils.js";
import { getBoundingClientRect } from "../libraries/boundingClientRect/boundingClientRect.js";
import { percentInView } from "../libraries/percentInView/percentInView.js";
import { getUserSyncParams } from "../libraries/userSyncUtils/userSyncUtils.js";

const BIDDER_CODE = "camino";
const GVLID = 1670;
const CURRENCY = "USD";
const TTL = 300;

const SESSION_STORAGE_KEY = "camino_sid";
const storage = getStorageManager({ bidderCode: BIDDER_CODE });
let pageAuctions = 0; // auctions run during this page view

// OpenRTB video fields forwarded from mediaTypes.video. Prebid-specific
// fields (context, playerSize) are translated instead of forwarded.
const VIDEO_PARAMS = [
  "mimes",
  "minduration",
  "maxduration",
  "placement",
  "plcmt",
  "protocols",
  "startdelay",
  "skip",
  "skipafter",
  "minbitrate",
  "maxbitrate",
  "delivery",
  "playbackmethod",
  "api",
  "linearity",
];

const BID_URL = "https://rtb.cmngrp.com/auction/open";
const SYNC_IFRAME_URL = "https://rtb.cmngrp.com/sync/frame";
const SYNC_IMAGE_URL = "https://rtb.cmngrp.com/sync/pixel";

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  disclosureURL: "local://modules/caminoBidAdapterDisclosure.json",
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    if (!deepAccess(bid, "params.publisherId")) {
      return false;
    }
    const banner = deepAccess(bid, "mediaTypes.banner");
    if (banner && !isArray(banner.sizes)) {
      return false;
    }
    const video = deepAccess(bid, "mediaTypes.video");
    if (video && !isVideoComplete(video)) {
      // A banner+video ad unit still bids with its banner part.
      return !!banner;
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    const ortb = {
      id: bidderRequest?.bidderRequestId,
      imp: bidRequests.map(buildImp),
      site: buildSite(bidRequests, bidderRequest),
      device: deepAccess(bidderRequest, "ortb2.device"),
      tmax: bidderRequest?.timeout,
      ext: { session: buildSession() },
    };

    const gdpr = bidderRequest?.gdprConsent;
    if (gdpr) {
      deepSetValue(ortb, "regs.ext.gdpr", gdpr.gdprApplies ? 1 : 0);
    }
    if (bidderRequest?.uspConsent) {
      deepSetValue(ortb, "regs.ext.us_privacy", bidderRequest.uspConsent);
    }
    const gpp =
      deepAccess(bidderRequest, "gppConsent.gppString") ||
      deepAccess(bidderRequest, "ortb2.regs.gpp");
    if (gpp) {
      deepSetValue(ortb, "regs.ext.gpp", gpp);
      const sid =
        deepAccess(bidderRequest, "gppConsent.applicableSections") ||
        deepAccess(bidderRequest, "ortb2.regs.gpp_sid");
      if (sid) {
        deepSetValue(ortb, "regs.ext.gpp_sid", sid);
      }
    }
    if (deepAccess(bidderRequest, "ortb2.regs.coppa")) {
      deepSetValue(ortb, "regs.coppa", 1);
    }

    const user = { ...deepAccess(bidderRequest, "ortb2.user") };
    if (gdpr?.consentString) {
      deepSetValue(user, "ext.consent", gdpr.consentString);
    }
    const eids = bidRequests[0].userIdAsEids;
    if (isArray(eids) && eids.length) {
      deepSetValue(user, "ext.eids", eids);
    }
    if (Object.keys(user).length) {
      ortb.user = user;
    }

    const schain = deepAccess(bidRequests[0], "ortb2.source.ext.schain");
    if (schain) {
      deepSetValue(ortb, "source.ext.schain", schain);
    }

    return {
      method: "POST",
      url: BID_URL,
      data: JSON.stringify(ortb),
    };
  },

  interpretResponse(serverResponse) {
    const body = serverResponse?.body;
    if (!body || !isArray(body.seatbid)) {
      return [];
    }
    return body.seatbid
      .filter((seat) => isArray(seat.bid))
      .flatMap((seat) => seat.bid.map(toBidResponse));
  },

  getUserSyncs(
    syncOptions,
    serverResponses,
    gdprConsent,
    uspConsent,
    gppConsent,
  ) {
    const params = getUserSyncParams(gdprConsent, uspConsent, gppConsent);
    // Forward the localStorage session id so the sync hub can map it to the
    // camino_uid cookie. The bid request carries that cookie where third-party
    // cookies are allowed; where they are blocked (Safari), this alias is how
    // buyeruids synced here are found at bid time.
    const sid = readSessionID();
    if (sid) {
      params.sid = sid;
    }
    const qs = new URLSearchParams(params).toString();
    if (syncOptions.iframeEnabled) {
      return [
        {
          type: "iframe",
          url: qs ? `${SYNC_IFRAME_URL}?${qs}` : SYNC_IFRAME_URL,
        },
      ];
    }
    if (syncOptions.pixelEnabled) {
      return [
        {
          type: "image",
          url: qs ? `${SYNC_IMAGE_URL}?${qs}` : SYNC_IMAGE_URL,
        },
      ];
    }
    return [];
  },
};

function buildImp(bidRequest) {
  const imp = {
    id: bidRequest.bidId,
    tagid: String(bidRequest.adUnitCode),
    ext: {
      // Prebid frequency counters for this ad unit during the page view
      bidRequestCount: bidRequest.bidRequestsCount || 0,
      bidderRequestCount: bidRequest.bidderRequestsCount || 0,
      bidderWinCount: bidRequest.bidderWinsCount || 0,
    },
  };

  const placementId = deepAccess(bidRequest, "params.placementId");
  if (placementId) {
    imp.ext.placementId = String(placementId);
  }

  const gpid = deepAccess(bidRequest, "ortb2Imp.ext.gpid");
  if (gpid) {
    imp.ext.gpid = gpid;
  }

  // One media type per imp: the bidder labels any imp with a banner as banner
  // and only runs the VPAID slideshow on video-only imps. A banner+video ad unit
  // sends its video, or its banner when the video part is incomplete.
  const video = deepAccess(bidRequest, "mediaTypes.video");
  let mediaType;
  let sizes;
  if (video && isVideoComplete(video)) {
    imp.video = buildVideo(video);
    mediaType = VIDEO;
    sizes = [[imp.video.w, imp.video.h]];
  } else {
    const format = bannerFormats(bidRequest);
    imp.banner = {
      format,
      ext: measureSlot(bidRequest.adUnitCode, format[0]),
    };
    mediaType = BANNER;
    sizes = format.map((size) => [size.w, size.h]);
  }

  const floor = resolveFloor(bidRequest, mediaType, sizes);
  if (floor != null) {
    imp.bidfloor = floor;
    imp.bidfloorcur = CURRENCY;
  }

  return imp;
}

// The video fields Camino needs to request video. Type checks on the rest of
// mediaTypes.video are left to Prebid core.
function isVideoComplete(video) {
  return (
    isArray(video.playerSize) &&
    !!video.context &&
    isArray(video.mimes) &&
    video.mimes.length > 0 &&
    isArray(video.protocols) &&
    video.protocols.length > 0
  );
}

function buildVideo(video) {
  const ortbVideo = {};
  VIDEO_PARAMS.forEach((param) => {
    if (video[param] != null) {
      ortbVideo[param] = video[param];
    }
  });

  const size = isArray(video.playerSize[0])
    ? video.playerSize[0]
    : video.playerSize;
  ortbVideo.w = parseInt(size[0], 10);
  ortbVideo.h = parseInt(size[1], 10);

  ortbVideo.plcmt = ortbVideo.plcmt ?? 2;
  if (video.context === "instream" && ortbVideo.startdelay == null) {
    ortbVideo.startdelay = 0;
  }

  return ortbVideo;
}

// readSessionID returns the persisted session id without generating one. Used by
// getUserSyncs (syncs fire after the auction, so buildSession has already stored
// it); returns '' when storage is unavailable or no id exists yet.
function readSessionID() {
  try {
    if (storage.localStorageIsEnabled()) {
      return storage.getDataFromLocalStorage(SESSION_STORAGE_KEY) || "";
    }
  } catch (e) {
    // storage unavailable
  }
  return "";
}

// Session signals: refreshCount is how many auctions this page view already
// ran (0 on the first), and id is a session id persisted in localStorage via
// Prebid's consent-gated storage manager (omitted when storage is unavailable).
function buildSession() {
  const session = { refreshCount: pageAuctions++ };
  try {
    if (storage.localStorageIsEnabled()) {
      let id = storage.getDataFromLocalStorage(SESSION_STORAGE_KEY);
      if (!id) {
        id = generateUUID();
        storage.setDataInLocalStorage(SESSION_STORAGE_KEY, id);
      }
      session.id = id;
    }
  } catch (e) {
    // no session id
  }
  return session;
}

function buildSite(bidRequests, bidderRequest) {
  const referer = bidderRequest?.refererInfo || {};
  const site = {
    domain: referer.domain,
    page: referer.page,
  };
  const publisherId = deepAccess(bidRequests[0], "params.publisherId");
  if (publisherId) {
    site.publisher = { id: String(publisherId) };
  }
  const content = deepAccess(bidderRequest, "ortb2.site.content");
  if (content) {
    site.content = content;
  }
  return site;
}

function bannerFormats(bidRequest) {
  const sizes =
    deepAccess(bidRequest, "mediaTypes.banner.sizes") || bidRequest.sizes;
  return parseSizesInput(sizes).map((size) => {
    const [w, h] = size.split("x");
    return { w: parseInt(w, 10), h: parseInt(h, 10) };
  });
}

// Visibility signals for the ad slot:
// - viewability: percentage of the slot currently in view (0 when the tab is hidden)
// - scrollOffset: pixels the user still has to scroll before the slot enters
//   the viewport (0 when it is already in or above view)
// Both are 'na' when the slot can't be measured (no element, cross-origin iframe).
function measureSlot(adUnitCode, size) {
  try {
    const element = findSlotElement(adUnitCode);
    if (!element) {
      return { viewability: "na", scrollOffset: "na" };
    }
    return {
      viewability:
        document.visibilityState === "visible"
          ? Math.round(percentInView(element, size))
          : 0,
      scrollOffset: Math.max(
        0,
        Math.round(
          getBoundingClientRect(element).top - getWinDimensions().innerHeight,
        ),
      ),
    };
  } catch (e) {
    return { viewability: "na", scrollOffset: "na" };
  }
}

// The slot div by ad unit code, falling back to the GPT slot mapping when the
// ad unit code is a GAM ad unit path rather than an element id.
function findSlotElement(adUnitCode) {
  const element = document.getElementById(adUnitCode);
  if (element || !isGptPubadsDefined()) {
    return element;
  }
  const slot = window.googletag
    .pubads()
    .getSlots()
    .find(isSlotMatchingAdUnitCode(adUnitCode));
  return slot ? document.getElementById(slot.getSlotElementId()) : null;
}

// Asks the Price Floors module for a floor per size and returns the lowest
// one, or null when the module is not active or has no rule for this imp.
function resolveFloor(bidRequest, mediaType, sizes) {
  if (!isFn(bidRequest.getFloor)) {
    return null;
  }
  const floors = sizes
    .map((size) => bidRequest.getFloor({ currency: CURRENCY, mediaType, size }))
    .filter(
      (floor) =>
        isPlainObject(floor) &&
        floor.currency === CURRENCY &&
        !isNaN(parseFloat(floor.floor)),
    )
    .map((floor) => parseFloat(floor.floor));
  return floors.length ? Math.min(...floors) : null;
}

function toBidResponse(bid) {
  const mediaType = bid.mtype === 2 ? VIDEO : BANNER;
  const adm = replaceAuctionPrice(bid.adm, bid.price);
  const nurl = bid.nurl && replaceAuctionPrice(bid.nurl, bid.price);
  const response = {
    requestId: bid.impid,
    cpm: parseFloat(bid.price),
    currency: CURRENCY,
    width: parseInt(bid.w, 10),
    height: parseInt(bid.h, 10),
    creativeId: bid.crid || bid.id,
    netRevenue: true,
    ttl: bid.exp || TTL,
    mediaType,
    meta: { advertiserDomains: bid.adomain || [] },
  };

  if (mediaType === VIDEO) {
    response.vastXml = adm;
    if (nurl) {
      response.vastImpUrl = nurl;
    }
    // OpenRTB 2.6 bid.dur: lets duration-aware players and adpod pick the ad by length.
    if (isInteger(bid.dur) && bid.dur > 0) {
      response.video = { durationSeconds: bid.dur };
    }
  } else {
    response.ad = nurl ? adm + createTrackPixelHtml(nurl) : adm;
  }

  return response;
}

registerBidder(spec);
