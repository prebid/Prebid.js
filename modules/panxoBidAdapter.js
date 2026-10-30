/**
 * @module modules/panxoBidAdapter
 * @description Bid Adapter for Prebid.js - AI-referred traffic monetization
 * @see https://docs.panxo.ai for the Prebid RTD integration
 */

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  deepAccess,
  isFn,
  isPlainObject,
  logWarn,
  replaceAuctionPrice,
  triggerPixel
} from '../src/utils.js';
import { EVENT_TYPE_IMPRESSION, TRACKER_METHOD_IMG } from '../src/eventTrackers.js';
import { convertCurrency } from '../libraries/currencyUtils/currency.js';

/**
 * @typedef {import('./panxoBidAdapter.d.ts').PanxoBidderParams} PanxoBidderParams
 */

const BIDDER_CODE = 'panxo';
const ENDPOINT_URL = 'https://panxo-sys.com/openrtb/2.6/bid';
const REVIEW_ENDPOINT_URL = 'https://panxo-prebid-reviewer-external.okpbidgx.workers.dev/openrtb/2.6/bid';
// Reserved synthetic inventory; no publisher-supplied endpoint is accepted.
const REVIEW_PROPERTY_KEYS = new Set([
  'LAB02_BANNER', 'LAB02_INSTREAM_VIDEO', 'LAB02_NATIVE',
  'LAB02_CTV_VIDEO', 'LAB02_INAPP_BANNER', 'LAB02_INAPP_NATIVE'
]);
const DEFAULT_CURRENCY = 'USD';
const TTL = 300;
const NET_REVENUE = true;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MTYPE_TO_MEDIA_TYPE = {
  1: BANNER,
  2: VIDEO,
  4: NATIVE
};
const VIDEO_ORTB_FIELDS = new Set([
  'mimes', 'minduration', 'maxduration', 'startdelay', 'maxseq', 'poddur',
  'protocol', 'protocols', 'w', 'h', 'podid', 'podseq', 'rqddurs',
  'placement', 'plcmt', 'linearity', 'skip', 'skipmin', 'skipafter',
  'sequence', 'battr', 'maxextended', 'minbitrate', 'maxbitrate',
  'boxingallowed', 'playbackmethod', 'playbackend', 'delivery', 'pos',
  'companionad', 'api', 'companiontype', 'ext'
]);

function normalizeNonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

// OpenRTB objects are JSON-compatible data. Clone them before applying
// adapter-owned overrides so that we preserve fields introduced by newer
// Prebid/OpenRTB versions without mutating bidderRequest.ortb2.
function cloneOrtbValue(value) {
  if (Array.isArray(value)) return value.map(cloneOrtbValue);
  if (isPlainObject(value)) {
    return Object.keys(value).reduce((copy, key) => {
      // OpenRTB extensions are intentionally forward-compatible, but they are
      // still untrusted JSON. Never let a future extension key mutate an
      // object's prototype while it is being copied.
      if (UNSAFE_OBJECT_KEYS.has(key)) return copy;
      copy[key] = cloneOrtbValue(value[key]);
      return copy;
    }, {});
  }
  return value;
}

// Remove known legacy identity fields; other extensions may carry identifiers.
const DEVICE_ID_FIELDS = new Set([
  'ifa', 'didsha1', 'didmd5', 'dpidsha1', 'dpidmd5', 'macsha1', 'macmd5',
  'ip', 'ipv6'
]);

function cloneOrtbObjectExcept(value, excluded) {
  if (!isPlainObject(value)) return {};
  return Object.keys(value).reduce((copy, key) => {
    if (!excluded.has(key) && !UNSAFE_OBJECT_KEYS.has(key)) {
      copy[key] = cloneOrtbValue(value[key]);
    }
    return copy;
  }, {});
}

function normalizePanxoContext(value) {
  return isPlainObject(value) && typeof value.ai === 'boolean' ? { ai: value.ai } : null;
}

// The Panxo namespace carries only the ephemeral AI marker. Other inventory
// extensions remain forward-compatible; this is not a general context scrub.
function cloneInventoryExt(value) {
  if (!isPlainObject(value)) return null;
  const ext = cloneOrtbObjectExcept(value, new Set(['data']));
  if (isPlainObject(value.data)) {
    ext.data = cloneOrtbObjectExcept(value.data, new Set(['panxo']));
    const panxo = normalizePanxoContext(value.data.panxo);
    if (panxo) ext.data.panxo = panxo;
  }
  return ext;
}

function normalizeBannerSizes(bid) {
  // Core also fills bid.sizes from video.playerSize. Only legacy requests
  // without mediaTypes may infer Banner support from bid.sizes alone.
  if (isPlainObject(bid && bid.mediaTypes) && !isPlainObject(bid.mediaTypes.banner)) return [];
  const mediaTypeSizes = deepAccess(bid, 'mediaTypes.banner.sizes');
  const rawSizes = Array.isArray(mediaTypeSizes) ? mediaTypeSizes : bid && bid.sizes;
  if (!Array.isArray(rawSizes)) return [];

  const seen = new Set();
  return rawSizes.reduce((sizes, size) => {
    if (
      !Array.isArray(size) ||
      size.length < 2 ||
      !Number.isSafeInteger(size[0]) ||
      !Number.isSafeInteger(size[1]) ||
      size[0] <= 0 ||
      size[1] <= 0
    ) return sizes;

    const key = `${size[0]}x${size[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      sizes.push([size[0], size[1]]);
    }
    return sizes;
  }, []);
}

function buildBanner(sizes) {
  if (sizes.length === 0) return null;

  return {
    format: sizes.map(size => ({ w: size[0], h: size[1] })),
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

function isPositiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function normalizeFirstSize(value) {
  const candidate = Array.isArray(value) && isPositiveInteger(value[0])
    ? value
    : Array.isArray(value) && Array.isArray(value[0])
      ? value[0]
      : null;
  return candidate && isPositiveInteger(candidate[0]) && isPositiveInteger(candidate[1])
    ? [candidate[0], candidate[1]]
    : null;
}

function normalizeVideoArray(value, validator) {
  if (!Array.isArray(value)) return null;
  const normalized = [...new Set(value.filter(validator))];
  return normalized.length > 0 ? normalized : null;
}

function buildVideo(bid) {
  const ortbVideo = deepAccess(bid, 'ortb2Imp.video');
  const mediaVideo = deepAccess(bid, 'mediaTypes.video');
  if (!isPlainObject(ortbVideo) && !isPlainObject(mediaVideo)) return null;

  const video = isPlainObject(ortbVideo) ? cloneOrtbValue(ortbVideo) : {};
  if (isPlainObject(mediaVideo)) {
    VIDEO_ORTB_FIELDS.forEach(key => {
      if (video[key] === undefined && mediaVideo[key] !== undefined) {
        video[key] = cloneOrtbValue(mediaVideo[key]);
      }
    });

    const playerSize = normalizeFirstSize(mediaVideo.playerSize);
    if (playerSize) {
      if (!isPositiveInteger(video.w)) video.w = playerSize[0];
      if (!isPositiveInteger(video.h)) video.h = playerSize[1];
    }

    const context = normalizeNonEmptyString(mediaVideo.context);
    if (context) {
      video.ext = isPlainObject(video.ext) ? video.ext : {};
      video.ext.prebid = isPlainObject(video.ext.prebid) ? video.ext.prebid : {};
      video.ext.prebid.context = context;
    }
  }

  const normalizedMimes = Array.isArray(video.mimes)
    ? [...new Set(video.mimes.map(normalizeNonEmptyString).filter(Boolean))]
    : [];
  const mimes = normalizedMimes.length > 0 ? normalizedMimes : null;
  const protocols = normalizeVideoArray(video.protocols, isPositiveInteger);
  const protocol = isPositiveInteger(video.protocol) ? video.protocol : null;
  if (!mimes || (!protocols && !protocol) || !isPositiveInteger(video.w) || !isPositiveInteger(video.h)) {
    return null;
  }

  video.mimes = mimes;
  if (protocols) video.protocols = protocols;
  else delete video.protocols;
  if (!protocol) delete video.protocol;
  return video;
}

function parseNativePayload(value) {
  let payload = value;
  if (typeof value === 'string') {
    try {
      payload = JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
  return isPlainObject(payload) && Array.isArray(payload.assets) && payload.assets.length > 0
    ? payload
    : null;
}

function buildNative(bid) {
  if (!FEATURES.NATIVE) return null;
  const ortbNative = deepAccess(bid, 'ortb2Imp.native');
  const nativeRequest = parseNativePayload(bid && bid.nativeOrtbRequest) ||
    parseNativePayload(ortbNative && ortbNative.request);
  if (!nativeRequest) return null;

  const native = isPlainObject(ortbNative) ? cloneOrtbValue(ortbNative) : {};
  native.request = JSON.stringify(cloneOrtbValue(nativeRequest));
  const version = normalizeNonEmptyString(native.ver) || normalizeNonEmptyString(nativeRequest.ver);
  if (version) native.ver = version;
  return native;
}

function buildMediaObjects(bid) {
  const media = {};
  const banner = buildBanner(normalizeBannerSizes(bid));
  const video = buildVideo(bid);
  const native = buildNative(bid);
  if (banner) media[BANNER] = banner;
  if (video) media[VIDEO] = video;
  if (native) media[NATIVE] = native;
  return media;
}

function getOfferedMediaTypes(imp) {
  return [BANNER, VIDEO, NATIVE].filter(mediaType => isPlainObject(imp && imp[mediaType]));
}

function getResponseMediaType(bid, imp) {
  if (bid.mtype !== undefined) return MTYPE_TO_MEDIA_TYPE[bid.mtype] || null;
  const offeredMediaTypes = getOfferedMediaTypes(imp);
  return offeredMediaTypes.length === 1 ? offeredMediaTypes[0] : null;
}

function normalizeCurrency(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeAdvertiserDomains(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(normalizeNonEmptyString)
    .filter(Boolean))];
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeNonEmptyString).filter(Boolean))];
}

function normalizeIntegerArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPositiveInteger))];
}

// Demand sources can enrich bid.ext.prebid.meta without requiring a
// publisher adapter release. Standard OpenRTB bid fields remain authoritative
// when both representations are present, matching Prebid's ORTB converter.
function buildBidResponseMeta(bid, mediaType) {
  const providedMeta = deepAccess(bid, 'ext.prebid.meta');
  const meta = isPlainObject(providedMeta) ? cloneOrtbValue(providedMeta) : {};
  const bidDomains = normalizeAdvertiserDomains(bid.adomain);
  const metaDomains = normalizeAdvertiserDomains(meta.advertiserDomains);
  meta.advertiserDomains = bidDomains.length > 0 ? bidDomains : metaDomains;
  meta.mediaType = mediaType;

  const dsa = deepAccess(bid, 'ext.dsa');
  if (isPlainObject(dsa)) {
    meta.dsa = cloneOrtbValue(dsa);
  } else if (!isPlainObject(meta.dsa)) {
    delete meta.dsa;
  }
  const dchain = deepAccess(bid, 'ext.dchain');
  if (isPlainObject(dchain)) {
    meta.dchain = cloneOrtbValue(dchain);
  } else if (!isPlainObject(meta.dchain)) {
    delete meta.dchain;
  }

  const categories = normalizeStringArray(bid.cat);
  if (categories.length > 0) {
    meta.primaryCatId = categories[0];
    meta.secondaryCatIds = categories.slice(1);
  } else {
    const primaryCategory = normalizeNonEmptyString(meta.primaryCatId);
    const secondaryCategories = normalizeStringArray(meta.secondaryCatIds);
    if (primaryCategory) meta.primaryCatId = primaryCategory;
    else delete meta.primaryCatId;
    if (secondaryCategories.length > 0) meta.secondaryCatIds = secondaryCategories;
    else delete meta.secondaryCatIds;
  }
  const attributes = normalizeIntegerArray(bid.attr);
  const metaAttributes = normalizeIntegerArray(meta.attr);
  if (attributes.length > 0) meta.attr = attributes;
  else if (metaAttributes.length > 0) meta.attr = metaAttributes;
  else delete meta.attr;
  if (isPositiveInteger(bid.cattax)) meta.cattax = bid.cattax;
  else if (!isPositiveInteger(meta.cattax)) delete meta.cattax;

  return meta;
}

function getEventTrackers(bid) {
  const trackers = deepAccess(bid, 'ext.eventtrackers');
  if (!Array.isArray(trackers)) return [];
  return trackers
    .filter(tracker => isPlainObject(tracker) && isPositiveInteger(tracker.event) &&
      isPositiveInteger(tracker.method) && normalizeNonEmptyString(tracker.url))
    .map(tracker => ({ ...cloneOrtbValue(tracker), url: tracker.url.trim() }));
}

function getAuctionCurrency(bidderRequest) {
  const configuredCurrency = deepAccess(bidderRequest, 'ortb2.ext.prebid.adServerCurrency');
  if (configuredCurrency === undefined || configuredCurrency === null) return DEFAULT_CURRENCY;
  // Panxo prices bids in USD. Prebid's Currency module converts the response
  // into the publisher's ad-server currency after the adapter validates it.
  return normalizeCurrency(configuredCurrency) ? DEFAULT_CURRENCY : null;
}

function normalizeGppSections(value) {
  if (!Array.isArray(value)) return null;
  // Prebid uses the singleton [-1] when no GPP section applies to the
  // transaction. It is a valid sentinel, but must never be mixed with real
  // section IDs.
  if (value.length === 1 && value[0] === -1) return [-1];
  if (!value.every(section => Number.isSafeInteger(section) && section > 0)) return null;
  return [...new Set(value)];
}

function getRequestTimeout(bidderRequest) {
  const timeout = bidderRequest && bidderRequest.timeout;
  return Number.isFinite(timeout) && timeout > 0 ? Math.floor(timeout) : 1000;
}

function getFloorInfo(bid, mediaType, size, currency) {
  // Price Floors attaches this metadata before core creates bidder requests.
  // A missing data set permits the legacy fallback; an active model, an A/B
  // skip or noFloorSignalBidders must never restore a bidder-specific minimum.
  const floorData = bid.floorData;
  const standardFloorControl = isPlainObject(floorData) && (
    floorData.noFloorSignaled === true ||
    floorData.skipped === false ||
    (floorData.skipped === true && floorData.skippedReason !== 'not_found')
  );
  if (isFn(bid.getFloor)) {
    try {
      const floorInfo = bid.getFloor({
        currency: currency,
        mediaType: mediaType,
        size: size
      });
      const floorCurrency = floorInfo && floorInfo.currency
        ? normalizeCurrency(floorInfo.currency)
        : currency;
      if (
        floorInfo &&
        Number.isFinite(floorInfo.floor) &&
        floorInfo.floor >= 0 &&
        floorCurrency
      ) {
        // Core may return its original currency if conversion is unavailable.
        // Keep the pair intact until transport conversion. A conversion failure
        // must not fall through to a zero or legacy floor below.
        return { floor: floorInfo.floor, currency: floorCurrency };
      }
    } catch (e) {
      // Floor module error
    }
  }
  if (standardFloorControl) return { floor: 0, currency };

  const staticFloor = deepAccess(bid, 'ortb2Imp.bidfloor');
  if (staticFloor !== undefined) {
    const staticCurrency = deepAccess(bid, 'ortb2Imp.bidfloorcur');
    const floorCurrency = staticCurrency === undefined ? DEFAULT_CURRENCY : normalizeCurrency(staticCurrency);
    if (!Number.isFinite(staticFloor) || staticFloor < 0 || !floorCurrency) return null;
    return { floor: staticFloor, currency: floorCurrency };
  }

  const fallbackFloor = deepAccess(bid, 'params.floor');
  // The published legacy parameter is denominated in USD, independently of
  // the currency requested for bids. Do not silently relabel existing prices.
  return { floor: Number.isFinite(fallbackFloor) && fallbackFloor >= 0 ? fallbackFloor : 0, currency: DEFAULT_CURRENCY };
}

function convertFloorInfo(floorInfo, currency) {
  if (!floorInfo || !Number.isFinite(floorInfo.floor) || floorInfo.floor < 0 || !floorInfo.currency) return null;
  if (floorInfo.floor === 0 || floorInfo.currency === currency) {
    return { floor: floorInfo.floor, currency };
  }
  try {
    // bestEffort=false is required: the helper's default returns the original
    // amount when conversion is unavailable, which would mislabel the floor.
    const floor = convertCurrency(floorInfo.floor, floorInfo.currency, currency, false);
    return Number.isFinite(floor) && floor > 0 ? { floor, currency } : null;
  } catch (e) {
    return null;
  }
}

function convertDealFloors(imp, currency) {
  const deals = deepAccess(imp, 'pmp.deals');
  if (!Array.isArray(deals)) return true;
  return deals.every(deal => {
    if (!isPlainObject(deal) || deal.bidfloor === undefined) return true;
    const floorInfo = convertFloorInfo({
      floor: deal.bidfloor,
      currency: deal.bidfloorcur === undefined ? DEFAULT_CURRENCY : normalizeCurrency(deal.bidfloorcur)
    }, currency);
    if (!floorInfo) return false;
    deal.bidfloor = floorInfo.floor;
    deal.bidfloorcur = floorInfo.currency;
    return true;
  });
}

function buildUser(bidderRequest) {
  // Keep existing OpenRTB consent locations without forwarding the user's
  // identity, audience memberships, history or arbitrary extension payloads.
  const user = { ext: {} };
  const rootConsent = normalizeNonEmptyString(deepAccess(bidderRequest, 'ortb2.user.consent'));
  const legacyConsent = normalizeNonEmptyString(deepAccess(bidderRequest, 'ortb2.user.ext.consent'));
  if (rootConsent) user.consent = rootConsent;
  if (legacyConsent) user.ext.consent = legacyConsent;
  const consentString = normalizeNonEmptyString(deepAccess(bidderRequest, 'gdprConsent.consentString'));
  if (consentString) {
    user.consent = consentString;
    user.ext.consent = consentString;
  }
  return user;
}

function buildRegs(bidderRequest) {
  const fpd = deepAccess(bidderRequest, 'ortb2.regs');
  const regs = isPlainObject(fpd) ? cloneOrtbValue(fpd) : {};
  regs.ext = isPlainObject(regs.ext) ? regs.ext : {};

  // Normalize legacy placements to the OpenRTB 2.6 root fields. Retain the
  // legacy copies during the compatibility window so existing consumers keep
  // seeing exactly the privacy signals they receive today.
  if (!regs.gpp && typeof regs.ext.gpp === 'string') regs.gpp = regs.ext.gpp;
  if (!regs.gpp_sid && Array.isArray(regs.ext.gpp_sid)) regs.gpp_sid = regs.ext.gpp_sid;
  if (regs.gdpr === undefined && (regs.ext.gdpr === 0 || regs.ext.gdpr === 1)) {
    regs.gdpr = regs.ext.gdpr;
  }
  if (!regs.us_privacy && typeof regs.ext.us_privacy === 'string') {
    regs.us_privacy = regs.ext.us_privacy;
  }

  // GDPR - only set when gdprApplies is explicitly true or false, not undefined
  const gdprConsent = deepAccess(bidderRequest, 'gdprConsent');
  if (gdprConsent && typeof gdprConsent.gdprApplies === 'boolean') {
    const gdpr = gdprConsent.gdprApplies ? 1 : 0;
    regs.gdpr = gdpr;
    regs.ext.gdpr = gdpr;
  }

  // CCPA / US Privacy
  const uspConsent = deepAccess(bidderRequest, 'uspConsent');
  const normalizedUspConsent = normalizeNonEmptyString(uspConsent);
  if (normalizedUspConsent) {
    regs.us_privacy = normalizedUspConsent;
    regs.ext.us_privacy = normalizedUspConsent;
  }

  // GPP
  const gppConsent = deepAccess(bidderRequest, 'gppConsent');
  if (isPlainObject(gppConsent)) {
    const gppString = normalizeNonEmptyString(gppConsent.gppString);
    const applicableSections = normalizeGppSections(gppConsent.applicableSections || []);
    if (gppString) {
      regs.gpp = gppString;
      regs.ext.gpp = gppString;
      if (applicableSections && applicableSections.length > 0) {
        regs.gpp_sid = applicableSections;
        regs.ext.gpp_sid = cloneOrtbValue(applicableSections);
      }
    }
  }

  // COPPA
  const coppa = deepAccess(bidderRequest, 'ortb2.regs.coppa');
  if (coppa) {
    regs.coppa = 1;
  }

  return regs;
}

function buildDevice(bidderRequest) {
  const fpd = deepAccess(bidderRequest, 'ortb2.device');
  const device = cloneOrtbObjectExcept(fpd, new Set([...DEVICE_ID_FIELDS, 'ext']));

  // Prebid owns device detection and activity-control normalization.
  // Preserve publisher-supplied App/CTV values without reading browser globals.
  device.js = 1;
  // Prebid normalizes browser privacy context into ortb2.device. Direct access
  // to navigator.doNotTrack is deprecated and prohibited by Prebid's linting.
  if (device.dnt !== 0 && device.dnt !== 1) delete device.dnt;

  return device;
}

function buildSite(bidderRequest) {
  const fpd = deepAccess(bidderRequest, 'ortb2.site');
  // Full URLs may contain publisher identity; omit both locations entirely.
  const site = cloneOrtbObjectExcept(fpd, new Set(['page', 'ref', 'ext']));
  const ext = cloneInventoryExt(fpd && fpd.ext);
  if (ext) site.ext = ext;
  site.domain = site.domain || deepAccess(bidderRequest, 'refererInfo.domain') || '';

  return site;
}

function buildApp(bidderRequest) {
  const fpd = deepAccess(bidderRequest, 'ortb2.app');
  if (!isPlainObject(fpd)) return null;
  const app = cloneOrtbObjectExcept(fpd, new Set(['ext']));
  const ext = cloneInventoryExt(fpd.ext);
  if (ext) app.ext = ext;
  return app;
}

function buildSource(bidderRequest) {
  const fpd = deepAccess(bidderRequest, 'ortb2.source');
  const source = isPlainObject(fpd) ? cloneOrtbValue(fpd) : {};
  source.ext = isPlainObject(source.ext) ? source.ext : {};
  source.tid = source.tid || bidderRequest.auctionId;

  // Prebid exposes schain directly on bidderRequest; ortb2 is retained as a
  // compatibility fallback.
  const schain = bidderRequest.schain || deepAccess(bidderRequest, 'ortb2.source.ext.schain');
  if (isPlainObject(schain)) {
    source.ext.schain = cloneOrtbValue(schain);
  }

  return source;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: 1527, // IAB TCF Global Vendor List ID
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    if (!normalizeNonEmptyString(deepAccess(bid, 'params.propertyKey'))) {
      logWarn('Panxo: Missing required param "propertyKey"');
      return false;
    }
    if (Object.keys(buildMediaObjects(bid)).length === 0) {
      logWarn('Panxo: At least one valid banner, video or native mediaType is required');
      return false;
    }
    return true;
  },

  buildRequests(validBidRequests, bidderRequest) {
    const requestId = normalizeNonEmptyString(bidderRequest && bidderRequest.bidderRequestId);
    if (!requestId) {
      logWarn('Panxo: Missing bidder request ID');
      return [];
    }

    const auctionCurrency = getAuctionCurrency(bidderRequest);
    if (!auctionCurrency) {
      logWarn('Panxo: Invalid ad-server currency');
      return [];
    }

    // Group bids by propertyKey to handle multiple properties on same page.
    // Cache normalized media objects: validating and then rebuilding large
    // Native/Video payloads for the same impression adds avoidable auction
    // latency and allocations.
    const bidsByPropertyKey = new Map();
    (Array.isArray(validBidRequests) ? validBidRequests : []).forEach(bid => {
      const key = normalizeNonEmptyString(deepAccess(bid, 'params.propertyKey'));
      const bidId = normalizeNonEmptyString(bid && bid.bidId);
      const media = buildMediaObjects(bid);
      if (!key || !bidId || Object.keys(media).length === 0) {
        logWarn('Panxo: Skipping invalid bid request');
        return;
      }
      const bidsForKey = bidsByPropertyKey.get(key) || [];
      bidsForKey.push({ bid, media });
      bidsByPropertyKey.set(key, bidsForKey);
    });

    // Build one request per propertyKey
    const requests = [];
    bidsByPropertyKey.forEach((bidEntriesForKey, propertyKey) => {
      const reviewer = REVIEW_PROPERTY_KEYS.has(propertyKey);
      if (reviewer && deepAccess(bidderRequest, 'ortb2.test') !== 1) {
        logWarn('Panxo: Synthetic reviewer inventory requires OpenRTB test: 1');
        return;
      }
      const endpoint = reviewer ? REVIEW_ENDPOINT_URL : ENDPOINT_URL;
      const impressions = bidEntriesForKey.map(({ bid, media }) => {
        const offeredMediaTypes = Object.keys(media);
        if (offeredMediaTypes.length === 0) return null;

        // Build impression object
        const imp = {
          id: bid.bidId,
          bidfloorcur: auctionCurrency,
          secure: 1,
          tagid: bid.adUnitCode
        };
        offeredMediaTypes.forEach(mediaType => {
          imp[mediaType] = media[mediaType];
        });

        const floors = offeredMediaTypes.map(mediaType => {
          const mediaObject = media[mediaType];
          const size = mediaType === BANNER
            ? [mediaObject.w, mediaObject.h]
            : mediaType === VIDEO
              ? [mediaObject.w, mediaObject.h]
              : '*';
          return convertFloorInfo(getFloorInfo(bid, mediaType, size, auctionCurrency), auctionCurrency);
        });
        if (floors.some(floor => floor === null)) {
          logWarn('Panxo: Skipping impression with an invalid floor or unavailable currency conversion');
          return null;
        }
        imp.bidfloor = Math.max(...floors.map(floor => floor.floor));
        imp.bidfloorcur = auctionCurrency;

        // Preserve impression context and deals, omitting the extension container.
        const ortb2Imp = deepAccess(bid, 'ortb2Imp');
        if (isPlainObject(ortb2Imp)) {
          Object.keys(ortb2Imp).forEach(key => {
            if (key === 'ext') return;
            if (key === BANNER) {
              if (isPlainObject(imp.banner) && isPlainObject(ortb2Imp.banner)) {
                imp.banner = { ...cloneOrtbValue(ortb2Imp.banner), ...imp.banner };
              }
            } else if (key !== VIDEO && key !== NATIVE && imp[key] === undefined) {
              // Video/Native already include normalized ortb2Imp fields.
              // Never restore rejected media or invalid fields in this fallback.
              imp[key] = cloneOrtbValue(ortb2Imp[key]);
            }
          });
        }
        // imp.pmp is already cloned. Reject the whole impression when a deal's
        // floor cannot be honored; removing that deal could bypass its minimum.
        if (!convertDealFloors(imp, auctionCurrency)) {
          logWarn('Panxo: Skipping impression with an invalid deal floor or unavailable currency conversion');
          return null;
        }

        return imp;
      }).filter(Boolean);

      if (impressions.length === 0) return;

      // Currency and floors were read from the original inputs above. Omit
      // request extensions; build user, device and site without removed fields.
      const normalizedOrtb2 = deepAccess(bidderRequest, 'ortb2');
      const openrtbRequest = cloneOrtbObjectExcept(normalizedOrtb2, new Set(['user', 'device', 'site', 'app', 'ext']));

      openrtbRequest.id = requestId;
      openrtbRequest.imp = impressions;

      // OpenRTB permits one distribution channel. Web traffic keeps today's
      // site behaviour; an explicit app-only context is transported as app.
      const app = buildApp(bidderRequest);
      if (app) {
        // RTD enriches global context through site.ext.data.panxo, including
        // for app auctions. An enrichment fragment must never rewrite the
        // publisher's explicit OpenRTB distribution channel. Preserve that
        // contextual signal under the equivalent app extension instead.
        const panxoContext = normalizePanxoContext(deepAccess(bidderRequest, 'ortb2.site.ext.data.panxo'));
        if (panxoContext) {
          app.ext = isPlainObject(app.ext) ? app.ext : {};
          app.ext.data = isPlainObject(app.ext.data) ? app.ext.data : {};
          app.ext.data.panxo = panxoContext;
        }
        openrtbRequest.app = app;
        delete openrtbRequest.site;
      } else {
        openrtbRequest.site = buildSite(bidderRequest);
        delete openrtbRequest.app;
      }

      openrtbRequest.device = buildDevice(bidderRequest);
      openrtbRequest.user = buildUser(bidderRequest);
      openrtbRequest.regs = buildRegs(bidderRequest);
      openrtbRequest.source = buildSource(bidderRequest);
      openrtbRequest.at = 1;
      openrtbRequest.cur = [auctionCurrency];
      openrtbRequest.tmax = getRequestTimeout(bidderRequest);

      requests.push({
        method: 'POST',
        url: `${endpoint}?key=${encodeURIComponent(propertyKey)}&source=prebid`,
        data: openrtbRequest,
        options: { contentType: 'text/plain', withCredentials: false },
        bidderRequest: bidderRequest
      });
    });

    return requests;
  },

  interpretResponse(serverResponse, request) {
    const bids = [];
    const response = deepAccess(serverResponse, 'body');

    if (!isPlainObject(response) || !Array.isArray(response.seatbid)) return bids;
    if (typeof response.id !== 'string' || response.id !== deepAccess(request, 'data.id')) {
      logWarn('Panxo: Ignoring bid response with an unexpected request ID');
      return bids;
    }

    const requestedCurrencyValue = deepAccess(request, 'data.cur.0');
    const requestedCurrency = requestedCurrencyValue === undefined
      ? DEFAULT_CURRENCY
      : normalizeCurrency(requestedCurrencyValue);
    if (!requestedCurrency) return bids;
    // OpenRTB defaults an omitted BidResponse.cur to USD. Do not infer the
    // requested currency here or an EUR request could accept an unlabelled USD
    // response and corrupt the auction's currency lane.
    const responseCurrency = response.cur === undefined
      ? DEFAULT_CURRENCY
      : normalizeCurrency(response.cur);
    if (!responseCurrency || responseCurrency !== requestedCurrency) {
      logWarn(`Panxo: Ignoring bid response in unexpected currency ${response.cur || 'unknown'}`);
      return bids;
    }

    const requestImps = deepAccess(request, 'data.imp');
    const requestImpMap = new Map((Array.isArray(requestImps) ? requestImps : [])
      .filter(isPlainObject)
      .map(imp => [imp.id, imp]));
    const requestImpIds = new Set(requestImpMap.keys());
    const bidRequestMap = new Map();
    if (Array.isArray(deepAccess(request, 'bidderRequest.bids'))) {
      request.bidderRequest.bids.forEach(bid => {
        if (isPlainObject(bid) && requestImpIds.has(bid.bidId)) {
          bidRequestMap.set(bid.bidId, bid);
        }
      });
    }

    response.seatbid.forEach(seatbid => {
      if (!seatbid || !Array.isArray(seatbid.bid)) return;

      seatbid.bid.forEach(bid => {
        if (!isPlainObject(bid)) return;
        const impId = normalizeNonEmptyString(bid.impid);
        const bidId = normalizeNonEmptyString(bid.id);
        const adm = normalizeNonEmptyString(bid.adm);
        const originalBid = impId && bidRequestMap.get(impId);
        const originalImp = impId && requestImpMap.get(impId);
        const mediaType = originalImp && getResponseMediaType(bid, originalImp);
        if (!originalBid) return;
        if (
          !bidId ||
          !mediaType ||
          !isPlainObject(originalImp[mediaType]) ||
          typeof bid.price !== 'number' ||
          !Number.isFinite(bid.price) ||
          bid.price <= 0 ||
          !adm
        ) return;

        const bidResponse = {
          requestId: impId,
          cpm: bid.price,
          currency: responseCurrency,
          creativeId: normalizeNonEmptyString(bid.crid) || bidId,
          dealId: normalizeNonEmptyString(bid.dealid),
          netRevenue: NET_REVENUE,
          ttl: Number.isFinite(bid.exp) && bid.exp > 0 ? Math.floor(bid.exp) : TTL,
          mediaType: mediaType,
          meta: buildBidResponseMeta(bid, mediaType)
        };

        const eventtrackers = getEventTrackers(bid);
        if (eventtrackers.length > 0) bidResponse.eventtrackers = eventtrackers;

        if (mediaType === BANNER) {
          if (!isPositiveInteger(bid.w) || !isPositiveInteger(bid.h)) return;
          const requestedSizes = normalizeBannerSizes(originalBid);
          if (!requestedSizes.some(size => size[0] === bid.w && size[1] === bid.h)) return;
          bidResponse.width = bid.w;
          bidResponse.height = bid.h;
          bidResponse.ad = bid.adm;
        } else if (mediaType === VIDEO) {
          const playerWidth = originalImp.video.w;
          const playerHeight = originalImp.video.h;
          if (!isPositiveInteger(playerWidth) || !isPositiveInteger(playerHeight)) return;
          if (bid.w !== undefined && (!isPositiveInteger(bid.w) || bid.w !== playerWidth)) return;
          if (bid.h !== undefined && (!isPositiveInteger(bid.h) || bid.h !== playerHeight)) return;
          bidResponse.width = playerWidth;
          bidResponse.height = playerHeight;
          bidResponse.playerWidth = playerWidth;
          bidResponse.playerHeight = playerHeight;
          bidResponse.vastXml = bid.adm;
          if (Number.isFinite(bid.dur) && bid.dur > 0) bidResponse.duration = bid.dur;
        } else if (mediaType === NATIVE) {
          if (!FEATURES.NATIVE) return;
          const nativeResponse = parseNativePayload(bid.adm);
          if (!nativeResponse) return;
          bidResponse.native = { ortb: nativeResponse };
        }

        const nurl = normalizeNonEmptyString(bid.nurl);
        if (nurl) bidResponse.nurl = nurl;
        const burl = normalizeNonEmptyString(bid.burl);
        if (burl) bidResponse.burl = burl;
        bids.push(bidResponse);
      });
    });

    return bids;
  },

  getUserSyncs() {
    // This adapter does not register user syncs.
    return [];
  },

  onBidWon(bid) {
    const nurl = normalizeNonEmptyString(bid && bid.nurl);
    const price = Number.isFinite(bid && bid.originalCpm) ? bid.originalCpm : bid && bid.cpm;
    if (nurl && Number.isFinite(price)) triggerPixel(replaceAuctionPrice(nurl, price));
  },

  onBidBillable(bid) {
    const burl = normalizeNonEmptyString(bid && bid.burl);
    const price = Number.isFinite(bid && bid.originalCpm) ? bid.originalCpm : bid && bid.cpm;
    if (burl && Number.isFinite(price)) {
      const url = replaceAuctionPrice(burl, price);
      // Core fires impression event trackers before calling onBidBillable.
      const trackedByCore = Array.isArray(bid.eventtrackers) && bid.eventtrackers.some(tracker =>
        isPlainObject(tracker) && tracker.event === EVENT_TYPE_IMPRESSION &&
        tracker.method === TRACKER_METHOD_IMG && tracker.url === url
      );
      if (!trackedByCore) triggerPixel(url);
    }
  },

  onTimeout() {
    logWarn('Panxo: Bid timeout');
  }
};

registerBidder(spec);
