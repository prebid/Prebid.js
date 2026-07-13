/**
 * superEdge Bid Adapter
 *
 * Connects to the superEdge bidding server to fetch
 * demand for banner and native ad slots. This adapter sends an OpenRTB 2.5
 * bid request and parses the response into Prebid-compatible bid objects.
 *
 * Supported media types: banner, native
 *
 * Quick start:
 *   gulp serve --modules=superEdgeBidAdapter --nolint --notest
 */

import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getPageTitle, getPageDescription, getPageKeywords, getConnectionDownLink, getReferrer } from '../libraries/fpdUtils/pageInfo.js';
import { getDevice } from '../libraries/fpdUtils/deviceInfo.js';
import { getBidFloor } from '../libraries/currencyUtils/floor.js';
import { transformSizesOrtb, normalAdSize } from '../libraries/sizeUtils/tranformSize.js';
import { getHLen } from '../libraries/navigatorData/navigatorData.js';
import { getOsInfo } from '../libraries/nexverseUtils/index.js';
import { getConnectionType } from '../libraries/connectionInfo/connectionUtils.js';

// ---- Constants ----

/** Bidder code registered with Prebid.js. Used to match the bidder in ad unit configs. */
const BIDDER_CODE = 'superEdge';

/** Endpoint of the superEdge bidding server. The secret key (sk) is appended as a query parameter. */
const ENDPOINT_URL = 'https://rtb-us.superedge.co.jp/bid?sk=';

/** Default time-to-live (seconds) for cached bid responses. */
const TIME_TO_LIVE = 500;

/** Key names for params and globals lookups. */
const SK = 'sk';
const PUBLISHER = 'publisher';

/**
 * Module-level globals populated by isBidRequestValid and consumed by buildRequests.
 * This is a standard Prebid.js pattern for passing publisher-supplied params between
 * lifecycle methods when they are needed outside individual bid requests.
 */
const globals = {};

/** Counter incremented per call to buildRequestData. Sent to the server to track repeated requests. */
let reqTimes = 0;

/** Set of supported ad sizes recognized by the bidding server. */
const supportedAdSize = normalAdSize;

// ---- Navigator Helpers ----

/**
 * Read device properties from the ORTB2 first-party data object that Prebid core
 * already populates. AGENTS.md requires vendor modules to route navigator reads
 * through shared libraries rather than accessing navigator.* directly.
 *
 * @param {Object} bidderRequest
 * @returns {{ua: string, language: string}}
 */
function getDeviceInfo(bidderRequest) {
  const dev = bidderRequest.ortb2?.device || {};
  return {
    ua: dev.ua || '',
    language: dev.language || 'en'
  };
}

// ---- Impression Builder ----

/**
 * Build the `imp` array for the OpenRTB request body.
 *
 * Iterates over each valid bid request and constructs an impression object
 * for every supported media type (banner, native). Non-supported or incomplete
 * media types are skipped (filtered out via `.filter(Boolean)`).
 *
 * @param {Array}   validBidRequests - Array of validated bid request objects.
 * @param {Object}  bidderRequest    - The master bidder request object (contains refererInfo, gdprConsent, etc.).
 * @returns {Array} Array of OpenRTB impression objects.
 */
function buildImp(validBidRequests, bidderRequest) {
  return validBidRequests.flatMap((req, i) => {
    const mediaTypes = req.mediaTypes;
    const sizes = transformSizesOrtb(req.sizes);

    // Try to match one of the requested sizes against the server's supported sizes.
    // If no match is found, fall back to the first requested size (or 0×0 if none).
    let matchSize = sizes.find(size =>
      supportedAdSize.find(item => size.w === item.w && size.h === item.h));
    if (!matchSize) {
      matchSize = sizes[0] ? { h: sizes[0].h || 0, w: sizes[0].w || 0 } : { h: 0, w: 0 };
    }

    // Global Placement ID: standard ORTB path first, legacy param as fallback.
    const gpid =
      utils.deepAccess(req, 'ortb2Imp.ext.gpid') ||
      utils.deepAccess(req, 'params.placementId', '');

    // Build GDPR consent object if consent data is available on the bidder request.
    const gdprConsent = {};
    if (bidderRequest && bidderRequest.gdprConsent) {
      gdprConsent.consent = bidderRequest.gdprConsent.consentString;
      gdprConsent.gdpr = bidderRequest.gdprConsent.gdprApplies ? 1 : 0;
    }

    // Generate a unique impression ID. Prefer the Prebid-generated bidId,
    // but fall back to a random id when multiple requests share the same page
    // to guarantee uniqueness across impressions.
    const id = req.bidId || ('' + (i + 1) + Math.random().toString(36).substring(2, 15));

    // Build the common impression extension shared by all media types.
    const ext = {
      adUnitCode: req.adUnitCode,
      referrer: getReferrer(req, bidderRequest),
      ortb2Imp: req.ortb2Imp,
      gpid: gpid + '',
      adslot: utils.deepAccess(req, 'ortb2Imp.ext.data.adserver.adslot', '', ''),
      publisher: req.params.publisher || '',
      transactionId: utils.deepAccess(req, 'ortb2Imp.ext.tid') || req.transactionId || '',
      ...gdprConsent
    };

    const imps = [];

    // ---- Banner impression ----
    if (mediaTypes?.banner) {
      imps.push({
        id: `${id}-banner`,
        bidfloor: getBidFloor(req),
        banner: {
          h: matchSize.h,
          w: matchSize.w,
          pos: utils.deepAccess(req, 'mediaTypes.banner.pos') ?? 1,
          format: sizes
        },
        ext: { ...ext, _bidId: id },
        tagid: req.params && req.params.tagid
      });
    }

    // ---- Native impression ----
    if (mediaTypes?.native) {
      // Prebid.js core pre-builds the ORTB native request object from the
      // publisher's mediaTypes.native config. We just need to stringify it.
      const nativeOrtbRequest = req.nativeOrtbRequest;
      if (nativeOrtbRequest && nativeOrtbRequest.assets?.length) {
        imps.push({
          id: `${id}-native`,
          bidfloor: getBidFloor(req),
          native: {
            request: JSON.stringify(nativeOrtbRequest),
            ver: '1.2'
          },
          ext: { ...ext, _bidId: id },
          tagid: req.params && req.params.tagid
        });
      }
    }
    // Media type not supported or incomplete — skip this bid request.
    return imps;
  });
}

// ---- Request Builder ----

/**
 * Build the full OpenRTB 2.5 bid request body.
 *
 * Aggregates device info, site info, user identifiers, first-party data,
 * GDPR consent, page metadata, and impressions into a single request object.
 *
 * @param {Array}   validBidRequests - Array of validated bid request objects.
 * @param {Object}  bidderRequest    - The master bidder request object.
 * @returns {Object|null} The OpenRTB request body, or null if no valid impressions.
 */
function buildRequestData(validBidRequests, bidderRequest) {
  // Increment the per-page request counter so the server can de-duplicate.
  reqTimes += 1;

  // Extended identifiers (EIDs) supplied by userId modules.
  const eids = validBidRequests[0].userIdAsEids;

  // Build the imp array from validated bid requests.
  const imp = buildImp(validBidRequests, bidderRequest);

  // Site domain — prefer the refererInfo from Prebid, fall back to document.domain.
  const domain = utils.deepAccess(bidderRequest, 'refererInfo.domain') || document.domain;

  // Page URL — prefer the canonical page, fall back to the browser location.
  const page = utils.deepAccess(bidderRequest, 'refererInfo.page') ||
    utils.deepAccess(bidderRequest, 'refererInfo.location');

  // Only construct and return the request if there is at least one valid impression.
  if (imp?.length > 0) {
    return {
      // Unique request id scoped to this bidder.
      id: 'se_' + (bidderRequest.bidderRequestId || ''),

      // Test flag: truthy → 1, falsy → 0. Publisher sets params.test for debugging.
      test: validBidRequests[0].params.test ? 1 : 0,

      // OpenRTB auction type: 1 = first-price.
      at: 1,

      // All bids in USD.
      cur: ['USD'],

      // ---- Device object (ORTB 2.5 §3.2.18) ----
      device: {
        connectiontype: getConnectionType(),
        js: 1,                      // JavaScript is enabled
        os: getOsInfo().os || '',   // parsed from UA / platform hints
        ua: getDeviceInfo(bidderRequest).ua,
        // Normalize all English variants to "en"; preserve other locales.
        language: /^en/.test(getDeviceInfo(bidderRequest).language) ? 'en' : getDeviceInfo(bidderRequest).language
      },

      // ---- Request-level extension ----
      ext: {
        pbjsversion: '$prebid.version$',  // replaced at build time with the current Prebid version
        eids,
        bidsUserIdAsEids: eids,
        firstPartyData: bidderRequest.ortb2,
        content: utils.deepAccess(bidderRequest, 'ortb2.site.content'),
        cat: utils.deepAccess(bidderRequest, 'ortb2.site.cat'),
        reqTimes,
        page: {
          title: getPageTitle()?.slice(0, 100) || undefined,
          desc: getPageDescription()?.slice(0, 300) || undefined,
          keywords: getPageKeywords()?.slice(0, 100) || undefined,
          hLen: getHLen(),
        },
        device: {
          nbw: getConnectionDownLink(),   // estimated network bandwidth (Mbps)
        }
      },

      // ---- User object (ORTB 2.5 §3.2.20) ----
      user: {
        // Legacy PubCommonId: read from the old crumbs.pubcid path.
        id: utils.deepAccess(validBidRequests[0], 'crumbs.pubcid'),
      },

      // Top-level EIDs (also present in ext for maximum compatibility).
      eids,

      // ---- Site object (ORTB 2.5 §3.2.13) ----
      site: {
        name: domain,
        domain: domain,
        page,
        ref: utils.deepAccess(bidderRequest, 'refererInfo.ref'),
        mobile: getDevice() ? 1 : 0,
        cat: [],
        publisher: {
          id: validBidRequests[0].params.publisher || ''
        }
      },

      // Impressions array.
      imp,

      // Auction timeout (ms).
      tmax: bidderRequest.timeout || 2000
    };
  }

  // No valid impressions — nothing to bid on.
  return null;
}

// ---- Bidder Spec ----

/**
 * The bidder specification object registered with Prebid.js.
 * Defines all lifecycle hooks for the superEdge adapter.
 */
export const spec = {
  /** Bidder code used in ad unit configs to route requests here. */
  code: BIDDER_CODE,

  /** Media types this adapter can handle. */
  supportedMediaTypes: [BANNER, NATIVE],

  /**
   * Validate a bid request and cache publisher-supplied params.
   *
   * Called by Prebid.js for every bid before buildRequests.
   * Caches the secret key (sk) and publisher identifier in module-level
   * globals so they are available when building the server request.
   *
   * @param {Object} bid - The bid to validate.
   * @returns {boolean} True if the bid contains a non-empty `sk` param.
   */
  isBidRequestValid: function (bid) {
    if (bid.params.sk) {
      globals[SK] = bid.params.sk;
    }
    if (bid.params.publisher) {
      globals[PUBLISHER] = bid.params.publisher;
    }
    return !!bid.params.sk;
  },

  /**
   * Build the HTTP request sent to the superEdge bidding server.
   *
   * Constructs an OpenRTB 2.5 JSON payload and POSTs it to the endpoint.
   * The secret key (sk) is appended directly to the URL as a query parameter.
   *
   * @param {Array}   validBidRequests - Array of validated bid request objects.
   * @param {Object}  bidderRequest    - The master bidder request object.
   * @returns {Object} An object with `method`, `url`, and `data` properties.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const payload = buildRequestData(validBidRequests, bidderRequest);

    const mediaTypeMap = {};
    const impIdToBidId = {};
    if (payload && payload.imp) {
      payload.imp.forEach(imp => {
        impIdToBidId[imp.id] = imp.ext._bidId;
        delete imp.ext._bidId;
        if (imp.native) {
          mediaTypeMap[imp.id] = NATIVE;
        } else {
          mediaTypeMap[imp.id] = BANNER;
        }
      });
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL + globals[SK],
      data: JSON.stringify(payload),
      _mediaTypeMap: mediaTypeMap,
      _impIdToBidId: impIdToBidId,
    };
  },

  /**
   * Parse the server response into Prebid bid objects.
   *
   * Traverses the OpenRTB 2.5 response structure (body.seatbid[].bid[])
   * and converts each bid into the Prebid.js bid format. Supports multiple
   * seatbid entries and per-seat currency overrides.
   *
   * @param {Object} serverResponse - The HTTP response from the server.
   * @param {Object} bidRequest     - The original bid request (unused).
   * @returns {Object[]} Array of Prebid-compatible bid objects.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    // Default currency for all seats; individual seats can override with their own `cur`.
    const defaultCur = utils.deepAccess(serverResponse, 'body.cur', '');
    const seatbids = utils.deepAccess(serverResponse, 'body.seatbid') || [];
    const mediaTypeMap = (bidRequest && bidRequest._mediaTypeMap) || {};
    const impIdToBidId = (bidRequest && bidRequest._impIdToBidId) || {};

    const bidResponses = [];
    for (const seat of seatbids) {
      // Per-seat currency override (ORTB 2.5 §4.2.1).
      const cur = seat.cur || defaultCur;
      const bids = seat.bid || [];

      for (const bid of bids) {
        // A bid without an impid cannot be matched to a request impression — skip it.
        if (bid.impid) {
          // Map the imp id (which may include a -banner/-native suffix) back to
          // the original Prebid bidId so the core can match it to the ad unit.
          const requestId = impIdToBidId[bid.impid] || bid.impid || '';
          const mediaType = mediaTypeMap[bid.impid] || BANNER;
          const bidResponse = {
            requestId: requestId,
            cpm: bid.price,
            creativeId: bid.crid || '',
            dealId: '',
            currency: cur,
            netRevenue: true,
            ttl: TIME_TO_LIVE,
            nurl: bid.nurl || '',
            meta: {
              advertiserDomains: bid.adomain || []
            }
          };

          if (mediaType === NATIVE) {
            bidResponse.mediaType = NATIVE;
            try {
              const admObj = JSON.parse(bid.adm);
              const nativeObj = admObj.native || admObj;
              bidResponse.native = { ortb: nativeObj };
            } catch (e) {
              // Native adm must be valid JSON; skip this bid if parsing fails.
              continue;
            }
            bidResponse.width = 1;
            bidResponse.height = 1;
          } else {
            bidResponse.mediaType = BANNER;
            bidResponse.ad = bid.adm || '';
            bidResponse.width = bid.w;
            bidResponse.height = bid.h;
          }

          bidResponses.push(bidResponse);
        }
      }
    }

    return bidResponses;
  },

  /**
   * Called when a bid from this adapter wins the auction.
   *
   * Fires the win notice pixel (nurl) so the server can record the win event.
   * If nurl is not present, this is a no-op.
   *
   * @param {Object} bid - The winning bid object.
   */
  onBidWon: function (bid) {
    if (bid.nurl) {
      utils.triggerPixel(bid.nurl);
    }
  }
};

// Register the adapter with Prebid.js.
registerBidder(spec);
