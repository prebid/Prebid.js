import { deepAccess, logWarn } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { hasPurpose1Consent } from '../src/utils/gdpr.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'optout';
const GVLID = 227;
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'EUR';

/**
 * Sanitizes a URL by removing query parameters and fragments to prevent data leakage
 * @param {string} rawUrl - The URL to sanitize
 * @returns {string} Sanitized URL (origin + pathname) or empty string if invalid
 */
function sanitizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl, deepAccess(window, 'location.href'));
    // Avoid leaking query params / fragments
    return `${u.origin}${u.pathname}`;
  } catch (e) {
    // If it's not a valid URL, return an empty string to avoid leaking potentially sensitive data
    logWarn(`${BIDDER_CODE}: Invalid URL provided: ${rawUrl}`);
    return '';
  }
}

/**
 * Gets the domain/URL from bidderRequest with fallbacks
 * Priority: canonicalUrl > page > window.location.href
 * @param {Object} bidderRequest - The bidder request object
 * @returns {string} Sanitized domain URL
 */
function getDomain(bidderRequest) {
  const fromCanonical = deepAccess(bidderRequest, 'refererInfo.canonicalUrl');
  if (fromCanonical) return sanitizeUrl(fromCanonical);

  const fromPage = deepAccess(bidderRequest, 'refererInfo.page');
  if (fromPage) return sanitizeUrl(fromPage);

  const href = deepAccess(window, 'location.href');
  return sanitizeUrl(href);
}

/**
 * Gets currency configuration from Prebid config
 * @returns {Object} Currency config object with adServerCurrency and granularityMultiplier
 */
function getCurrency() {
  const cur = config.getConfig('currency');
  if (!cur) {
    return { adServerCurrency: DEFAULT_CURRENCY, granularityMultiplier: 1 };
  }
  return cur;
}

/**
 * Normalize customs:
 * - arrays -> CSV string
 * - null/undefined -> removed
 * - objects -> JSON string (removed if not serializable / circular)
 * - primitives -> String(value)
 *
 * Returns a new object (never mutates input).
 */
function normalizeCustoms(input) {
  if (!input || typeof input !== 'object') {
    return {};
  }

  const out = Object.assign({}, input);

  Object.entries(out).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      out[key] = value.join(',');
      return;
    }

    if (value === null || value === undefined) {
      delete out[key];
      return;
    }

    if (typeof value === 'object') {
      try {
        const str = JSON.stringify(value);
        if (str === undefined) {
          delete out[key];
        } else {
          out[key] = str;
        }
      } catch (e) {
        // e.g. circular structure
        delete out[key];
      }
      return;
    }

    out[key] = String(value);
  });

  return out;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  /**
   * Determines if a bid request is valid
   * @param {Object} bid - The bid to validate
   * @returns {boolean} True if valid, false otherwise
   */
  isBidRequestValid: function (bid) {
    const params = bid && bid.params;
    const adSlot = params && (params.adSlot || params.adslot);
    return !!(params && params.publisher && adSlot);
  },

  /**
   * Builds bid requests from valid bid requests
   * @param {Array} validBidRequests - Array of valid bid requests
   * @param {Object} bidderRequest - The bidder request object
   * @returns {Array} Array containing the bid request object
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (!Array.isArray(validBidRequests) || validBidRequests.length === 0) {
      return [];
    }

    const firstBid = validBidRequests[0];

    let endPoint = 'https://prebid.optoutadserving.com/prebid/display';

    const gdprConsent =
      bidderRequest && typeof bidderRequest === 'object' ? bidderRequest.gdprConsent : null;

    let consentString = '';
    let gdpr = 0;

    if (gdprConsent && typeof gdprConsent === 'object') {
      gdpr =
        typeof gdprConsent.gdprApplies === 'boolean'
          ? Number(gdprConsent.gdprApplies)
          : 0;

      consentString = gdprConsent.consentString || '';

      if (!gdpr || hasPurpose1Consent(gdprConsent)) {
        endPoint = 'https://prebid.optinadserving.com/prebid/display';
      }
    }

    const shouldIncludeOrtb2 = validBidRequests.some((b) => !!b?.params?.includeOrtb2);

    const slots = validBidRequests.map((b) => {
      const slotCustoms = normalizeCustoms(b?.params?.customs);
      const adSlotValue = b.params.adSlot || b.params.adslot;

      const slot = {
        adSlot: adSlotValue,
        requestId: b.bidId,
      };

      // Use explicit id if provided, otherwise use adSlot value
      if (b.params && b.params.id != null) {
        slot.id = String(b.params.id);
      } else {
        slot.id = adSlotValue;
      }
      
      if (Object.keys(slotCustoms).length) slot.customs = slotCustoms;
      return slot;
    });

    const mergedCustoms = Object.assign(
      {},
      firstBid?.params?.customs,
      bidderRequest?.ortb2?.ext?.data,
      bidderRequest?.ortb2?.site?.ext?.data,
      bidderRequest?.ortb2?.app?.ext?.data,
      bidderRequest?.ortb2?.user?.ext?.data
    );

    const customs = normalizeCustoms(mergedCustoms);

    const data = {
      publisher: firstBid.params.publisher, // intentionally uses the first bid's publisher when batching
      slots,
      cur: getCurrency(),
      url: getDomain(bidderRequest),
      sdk_version: 'prebid',
      consent: consentString,
      gdpr
    };

    if (Object.keys(customs).length) data.customs = customs;

    if (shouldIncludeOrtb2 && bidderRequest?.ortb2) {
      data.ortb2 = JSON.stringify(bidderRequest.ortb2);
    }

    return [
      {
        method: 'POST',
        url: endPoint,
        data
      }
    ];
  },

  /**
   * Interprets the server response and returns valid bids
   * @param {Object} serverResponse - The server response object
   * @param {Object} bidRequest - The original bid request
   * @returns {Array} Array of valid bid objects
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const body = serverResponse?.body;

    const bids = Array.isArray(body)
      ? body
      : Array.isArray(body?.bids)
        ? body.bids
        : [];

    const sentSlots = bidRequest?.data?.slots || [];

    const slotIdToPrebidId = new Map(
      sentSlots.map((s) => [String(s.id), String(s.requestId)])
    );

    const prebidIds = new Set(sentSlots.map((s) => String(s.requestId)));

    return bids
      .map((bid) => {
        // Defensive handling of malformed bids
        if (!bid || !bid.requestId) return null;
        if (!bid.currency || !bid.ad || bid.width == null || bid.height == null) return null;

        const cpmNum = Number(bid.cpm);
        if (bid.cpm == null || Number.isNaN(cpmNum) || cpmNum <= 0) return null;

        const w = Number(bid.width);
        const h = Number(bid.height);
        if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) return null;

        const serverSlotOrReq = String(bid.requestId);

        const prebidRequestId = prebidIds.has(serverSlotOrReq)
          ? serverSlotOrReq
          : slotIdToPrebidId.get(serverSlotOrReq);

        if (!prebidRequestId) return null;

        return {
          requestId: prebidRequestId,
          cpm: cpmNum,
          currency: bid.currency,
          width: w,
          height: h,
          ad: bid.ad,
          ttl: Number(bid.ttl) || DEFAULT_TTL,
          creativeId: bid.creativeId || String(bid.requestId),
          netRevenue: true,
          optOutExt: bid.optOutExt,
          meta: bid.meta
        };
      })
      .filter(Boolean);
  },

  /**
   * Returns user sync pixels/iframes based on consent
   * @param {Object} syncOptions - Sync options from Prebid
   * @param {Array} responses - Server responses
   * @param {Object} gdprConsent - GDPR consent data
   * @returns {Array} Array of user sync objects
   */
  getUserSyncs: function (syncOptions, responses, gdprConsent) {
    if (!gdprConsent || typeof gdprConsent !== 'object') return [];

    const gdprApplies = typeof gdprConsent.gdprApplies === 'boolean'
      ? gdprConsent.gdprApplies
      : false;

    const gdpr = gdprApplies ? 1 : 0;

    if (
      syncOptions.iframeEnabled &&
      (!gdprApplies || hasPurpose1Consent(gdprConsent))
    ) {
      return [
        {
          type: 'iframe',
          url:
            'https://umframe.optinadserving.com/matching/iframe?gdpr=' +
            gdpr +
            '&gdpr_consent=' +
            encodeURIComponent(gdprConsent.consentString || '')
        }
      ];
    }

    return [];
  }
};

registerBidder(spec);
