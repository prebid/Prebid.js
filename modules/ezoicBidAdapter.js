import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getWinDimensions } from '../src/utils.js';

const BIDDER_CODE = 'ezoic';
const GVL_ID = 347;
const DEFAULT_TTL = 120;
const DEFAULT_CURRENCY = 'USD';
const ADAPTER_ENDPOINT = 'https://g.ezoic.net/ezoic/prebid/adapter';
const USER_SYNC_ENDPOINT = 'https://g.ezoic.net/ezoic/prebid/adapter/usersync-frame';
const ADAPTER_NAMESPACE = '__ezoicPrebidAdapter';
const PAGEVIEW_SOURCE_ADAPTER_GENERATED = 'adapter_generated';
const PAGEVIEW_SOURCE_PREBID_CORE = 'prebid_core';
const FORM_FACTOR_DESKTOP = 1;
const FORM_FACTOR_PHONE = 2;
const FORM_FACTOR_TABLET = 3;

// Optional per-impression params forwarded to the adapter backend as-is. None
// of these are required for a valid bid request; see ezoicBidAdapter.md.
const ALLOWED_IMPRESSION_PARAM_KEYS = [
  'placementType',
  'placement_type',
  'adPositionType',
  'adPositionId',
  'subAdPositionId',
  'publisherProvidedId',
  'pt',
  'bidfloor',
  'bidfloorcur',
  'floor',
  'impressionId',
  'impression_id',
  'tap',
  'googlePageTargeting',
];

function parseInteger(value) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

function getImpressionParams(params = {}) {
  return ALLOWED_IMPRESSION_PARAM_KEYS.reduce((memo, key) => {
    if (params[key] != null) {
      memo[key] = params[key];
    }
    return memo;
  }, {});
}

function getImpressionId(bid) {
  return bid?.params?.impressionId ||
    bid?.params?.impression_id ||
    bid?.ortb2Imp?.ext?.ezoic?.impression_id ||
    bid?.ortb2Imp?.ext?.ezoic?.impressionId;
}

function cloneJSON(value) {
  if (value == null) {
    return undefined;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (e) {
    return undefined;
  }
}

function getPageMetadata(bidderRequest) {
  return {
    url: bidderRequest?.refererInfo?.page || window.location.href,
  };
}

function currentPageviewEpoch() {
  return Math.floor(Date.now() / 1000);
}

function getAdapterState() {
  window[ADAPTER_NAMESPACE] = window[ADAPTER_NAMESPACE] || {};
  return window[ADAPTER_NAMESPACE];
}

function randomPageviewId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

function hasRenderer(subject) {
  return !!(subject?.renderer || subject?.safeRenderer);
}

// Every pageview gets one stable id. Prebid core's pageViewId (SPA refreshes)
// takes precedence; otherwise generate once and cache in the adapter namespace
// so repeat auctions on the same pageview report the same id.
function getPageviewMetadata(bidderRequest) {
  const state = getAdapterState();
  const corePageViewId = bidderRequest?.pageViewId;

  if (corePageViewId) {
    if (state.corePageViewId !== corePageViewId) {
      state.corePageViewId = corePageViewId;
      state.pageviewEpoch = currentPageviewEpoch();
    } else if (state.pageviewEpoch == null) {
      state.pageviewEpoch = currentPageviewEpoch();
    }

    return {
      pageviewId: corePageViewId,
      pageviewIdSource: PAGEVIEW_SOURCE_PREBID_CORE,
      pageviewEpoch: state.pageviewEpoch,
    };
  }

  if (!state.pageviewId) {
    state.pageviewId = randomPageviewId();
    state.pageviewEpoch = currentPageviewEpoch();
  }

  return {
    pageviewId: state.pageviewId,
    pageviewIdSource: PAGEVIEW_SOURCE_ADAPTER_GENERATED,
    pageviewEpoch: state.pageviewEpoch,
  };
}

function getViewportWidth() {
  return getWinDimensions()?.innerWidth;
}

function inferFormFactorId() {
  const width = parseInteger(getViewportWidth());
  if (!width) {
    return undefined;
  }
  if (width <= 767) {
    return FORM_FACTOR_PHONE;
  }
  if (width <= 1023) {
    return FORM_FACTOR_TABLET;
  }
  return FORM_FACTOR_DESKTOP;
}

function normalizeCountry(country) {
  return typeof country === 'string' && country ? country.toUpperCase() : undefined;
}

function getCountry(ortb2) {
  return normalizeCountry(ortb2?.device?.geo?.country) ||
    normalizeCountry(ortb2?.user?.geo?.country) ||
    normalizeCountry(ortb2?.site?.geo?.country);
}

function getORTB2Metadata(bidderRequest, validBidRequests) {
  const ortb2 = cloneJSON(bidderRequest?.ortb2) || {};
  const existingEids = ortb2?.user?.ext?.eids;
  const eids = existingEids?.length ? existingEids : validBidRequests.find((bid) => bid.userIdAsEids?.length)?.userIdAsEids;

  if (eids?.length) {
    ortb2.user = ortb2.user || {};
    ortb2.user.ext = ortb2.user.ext || {};
    ortb2.user.ext.eids = cloneJSON(eids);
  }

  return ortb2;
}

function getEzoicMetadata(bidderRequest, ortb2) {
  return {
    ...getPageviewMetadata(bidderRequest),
    formFactorId: inferFormFactorId(),
    country: getCountry(ortb2),
  };
}

function getPrimaryBannerSize(bid) {
  const sizes = bid.mediaTypes?.banner?.sizes || bid.sizes;
  if (!Array.isArray(sizes) || !sizes.length) {
    return '*';
  }
  if (Array.isArray(sizes[0])) {
    return sizes[0];
  }
  return sizes.length >= 2 ? sizes : '*';
}

function getPrimaryVideoSize(bid) {
  let size = bid.mediaTypes?.video?.playerSize;
  if (Array.isArray(size) && Array.isArray(size[0])) {
    size = size[0];
  }
  const width = Number(size?.[0]);
  const height = Number(size?.[1]);
  if (width > 0 && height > 0) {
    return [width, height];
  }
  if (Number(bid.mediaTypes?.video?.w) > 0 && Number(bid.mediaTypes?.video?.h) > 0) {
    return [Number(bid.mediaTypes.video.w), Number(bid.mediaTypes.video.h)];
  }
  return '*';
}

function isVideoOnlyBid(bid) {
  return !!bid.mediaTypes?.video && !bid.mediaTypes?.banner;
}

function isVideoBidRequest(bid) {
  return !!bid?.mediaTypes?.video;
}

function isNativeOnlyBid(bid) {
  return !!bid?.mediaTypes?.native && !bid.mediaTypes.banner && !bid.mediaTypes.video;
}

function isNativeBidRequest(bid) {
  return !!bid?.mediaTypes?.native;
}

function getBidFloor(bid) {
  if (typeof bid.getFloor !== 'function') {
    return undefined;
  }

  const videoOnly = isVideoOnlyBid(bid);
  const nativeOnly = isNativeOnlyBid(bid);
  try {
    const floor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: nativeOnly ? NATIVE : (videoOnly ? VIDEO : BANNER),
      size: nativeOnly ? '*' : (videoOnly ? getPrimaryVideoSize(bid) : getPrimaryBannerSize(bid)),
    });
    return floor?.floor;
  } catch (e) {
    return undefined;
  }
}

function getPositiveFloor(value) {
  const floor = Number(value);
  return Number.isFinite(floor) && floor > 0 ? floor : undefined;
}

function getExplicitBidFloor(params) {
  return getPositiveFloor(params?.bidfloor) || getPositiveFloor(params?.floor);
}

function getImpressionMediaTypes(bid) {
  const mediaTypes = bid?.mediaTypes;
  if (!mediaTypes?.banner && !mediaTypes?.video && !mediaTypes?.native) {
    return undefined;
  }
  const proxied = {};
  if (mediaTypes.banner) {
    proxied.banner = mediaTypes.banner;
  }
  if (mediaTypes.video) {
    proxied.video = mediaTypes.video;
  }
  if (mediaTypes.native) {
    proxied.native = mediaTypes.native;
  }
  return proxied;
}

function getImpression(bid) {
  const params = getImpressionParams(bid.params);
  return {
    requestId: bid.bidId,
    adUnitCode: bid.adUnitCode,
    sizes: bid.sizes || bid.mediaTypes?.banner?.sizes || [],
    mediaTypes: getImpressionMediaTypes(bid),
    params,
    impressionId: getImpressionId(bid),
    floor: getExplicitBidFloor(params) || getBidFloor(bid),
    ortb2Imp: bid.ortb2Imp,
  };
}

function originalBidByRequestId(request) {
  const bids = request?.bidderRequest?.bids || [];
  return bids.reduce((memo, bid) => {
    memo[bid.bidId] = bid;
    return memo;
  }, {});
}

function getFallbackSize(sourceBid, isVideo) {
  if (isVideo) {
    const videoSize = getPrimaryVideoSize(sourceBid);
    if (videoSize !== '*') {
      return videoSize;
    }
    return sourceBid.sizes?.[0] || sourceBid.mediaTypes?.banner?.sizes?.[0] || [];
  }

  return sourceBid.sizes?.[0] || sourceBid.mediaTypes?.banner?.sizes?.[0] || [];
}

// Only publisher-supplied renderers count: this adapter never returns a
// renderer on its bids, so a server-side renderer field could not satisfy
// core's outstream setup check anyway.
function hasOutstreamRenderer(sourceBid) {
  return hasRenderer(sourceBid) || hasRenderer(sourceBid?.mediaTypes?.video);
}

function normalizeBid(rawBid, sourceBid) {
  if (!rawBid || !sourceBid || !rawBid.requestId || !rawBid.creativeId) {
    return;
  }

  const cpm = Number(rawBid.cpm);
  if (!Number.isFinite(cpm) || cpm < 0) {
    return;
  }

  if (rawBid.mediaType === VIDEO && !isVideoBidRequest(sourceBid)) {
    return;
  }
  if (rawBid.mediaType === NATIVE && !isNativeBidRequest(sourceBid)) {
    return;
  }

  const isVideo = rawBid.mediaType === VIDEO && isVideoBidRequest(sourceBid);
  const isNative = rawBid.mediaType === NATIVE && isNativeBidRequest(sourceBid);

  if (isVideo && sourceBid.mediaTypes?.video?.context === 'outstream' && !hasOutstreamRenderer(sourceBid)) {
    return;
  }

  const firstSize = getFallbackSize(sourceBid, isVideo);
  const width = rawBid.width || firstSize[0];
  const height = rawBid.height || firstSize[1];

  if (isNative) {
    if (!rawBid.native) {
      return;
    }
  } else if (!width || !height || (!rawBid.ad && !rawBid.adUrl && !(isVideo && (rawBid.vastUrl || rawBid.vastXml)))) {
    return;
  }

  const bidResponse = {
    requestId: rawBid.requestId,
    cpm,
    currency: rawBid.currency || DEFAULT_CURRENCY,
    creativeId: String(rawBid.creativeId),
    netRevenue: rawBid.netRevenue !== false,
    ttl: rawBid.ttl || DEFAULT_TTL,
    mediaType: isNative ? NATIVE : (isVideo ? VIDEO : BANNER),
    // Most reviewers require meta.advertiserDomains to be present on every
    // bid for block-list enforcement, so default to an empty array when the
    // server does not send one.
    meta: {
      ...(rawBid.meta || {}),
      advertiserDomains: rawBid.meta?.advertiserDomains || [],
    },
  };
  if (!isNative || rawBid.width || rawBid.height) {
    bidResponse.width = width;
    bidResponse.height = height;
  }

  [
    'ad',
    'adUrl',
    'vastUrl',
    'vastXml',
    'dealId',
    'native',
  ].forEach((key) => {
    if (rawBid[key] != null) {
      bidResponse[key] = rawBid[key];
    }
  });

  return bidResponse;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  // All bidder params are optional (see ezoicBidAdapter.md), so every ad
  // unit routed to this bidder is a valid bid request.
  isBidRequestValid(bid) {
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    if (!validBidRequests?.length) {
      return;
    }

    const ortb2 = getORTB2Metadata(bidderRequest, validBidRequests);
    const payload = {
      auctionId: bidderRequest?.auctionId || validBidRequests[0].auctionId,
      bidderRequestId: bidderRequest?.bidderRequestId || validBidRequests[0].bidderRequestId,
      timeout: bidderRequest?.timeout,
      page: getPageMetadata(bidderRequest),
      ortb2,
      ezoic: getEzoicMetadata(bidderRequest, ortb2),
      gdprConsent: bidderRequest?.gdprConsent,
      uspConsent: bidderRequest?.uspConsent,
      gppConsent: bidderRequest?.gppConsent,
      imps: validBidRequests.map(getImpression),
    };

    return {
      method: 'POST',
      url: ADAPTER_ENDPOINT,
      data: JSON.stringify(payload),
      bidderRequest: {
        ...bidderRequest,
        bids: validBidRequests,
      },
      options: {
        contentType: 'application/json',
        withCredentials: true,
      },
    };
  },

  interpretResponse(serverResponse, request) {
    const body = serverResponse?.body;
    if (!body || body.nobid) {
      return [];
    }

    const rawBids = Array.isArray(body.bids) ? body.bids : [body];
    const sourceBids = originalBidByRequestId(request);

    return rawBids
      .map((rawBid) => normalizeBid(rawBid, sourceBids[rawBid?.requestId]))
      .filter(Boolean);
  },

  // Intentionally no event callbacks (onBidWon, onAdRenderSucceeded,
  // onBidViewable, onTimeout, onBidderError): every lifecycle, render,
  // and viewability pixel is embedded in the creative markup by the
  // adapter backend, so client-installed and S2S/PBS serves share one
  // creative-owned tracking contract.
  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    if (!syncOptions?.iframeEnabled) {
      return [];
    }

    // Cookie storage/reads happen server-side inside the sync frame; no
    // redirect ("r") param is needed here.
    const params = new URLSearchParams({
      gdpr: gdprConsent?.gdprApplies ? '1' : '0',
      gdpr_consent: gdprConsent?.consentString || '',
      gpp: gppConsent?.gppString || '',
      gpp_sid: gppConsent?.applicableSections?.join(',') || '',
      us_privacy: uspConsent || '',
    });

    return [{
      type: 'iframe',
      url: `${USER_SYNC_ENDPOINT}?${params.toString()}`,
    }];
  },
};

registerBidder(spec);
