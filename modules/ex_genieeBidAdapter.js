import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepAccess, deepSetValue, isArray, isStr, logError, logWarn } from '../src/utils.js';

/**
 * @typedef {import('../src/adapterManager.js').BidRequest<'ex_geniee'>} BidRequest
 * @typedef {import('../src/adapterManager.js').BidderRequest<'ex_geniee'>} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'ex_geniee';
// Geniee Exchange endpoint. Bid requests are POSTed to
// `/yie/ld/exchange?id=YOUR_ID`, where `id` (= partnerId) is required and is
// issued by Geniee during integration.
export const DEFAULT_ENDPOINT = 'https://aladdin.genieesspv.jp/yie/ld/exchange';
const DEFAULT_CURRENCY = 'USD';
const ALLOWED_CURRENCIES = ['JPY', 'USD'];
const NET_REVENUE = true;
// The Exchange does not impose a deadline on impression firing, so bids are
// given a long expiry.
const DEFAULT_TTL = 3600;  // 1 hour

const converter = ortbConverter({
  context: {
    ttl: DEFAULT_TTL,
    netRevenue: NET_REVENUE,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // The Exchange serves banner and video only, but without a fixed
    // context.mediaType the converter also fills imp.native / imp.audio from
    // the ad unit.
    delete imp.native;
    delete imp.audio;
    // A multiformat ad unit whose video part cannot be served still passes
    // isBidRequestValid on its banner part; send it as banner only. imp.video
    // can also come from ortb2Imp alone, with no mediaTypes.video for
    // isBidRequestValid to have checked.
    let videoError = null;
    if (imp.video) {
      const declaresVideo = deepAccess(bidRequest, 'mediaTypes.video') != null;
      videoError = declaresVideo ? validateVideo(bidRequest)
        : 'mediaTypes.video is not declared';
    }
    if (videoError !== null) {
      logWarn(`[${BIDDER_CODE}] ${videoError}; sending the banner part only.`);
      delete imp.video;
    }
    // priceFloors looks imp.bidfloor up with mediaType '*' when the ad unit
    // declares several media types, which misses per-media-type floor rules;
    // redo it for the media types actually sent.
    setLowestFloor(imp, bidRequest, context.currency);
    // The Exchange requires banner.w/h, so mirror the first format entry into
    // w/h. Prebid's default banner processor only emits format.
    const format = deepAccess(imp, 'banner.format');
    if (isArray(format) && format.length &&
        (imp.banner.w === undefined || imp.banner.w === null ||
         imp.banner.h === undefined || imp.banner.h === null)) {
      imp.banner.w = format[0].w;
      imp.banner.h = format[0].h;
    }
    // Send params.placementId as imp.tagid, the standard ORTB slot
    // identifier. A tagid supplied through ortb2Imp is only overridden when
    // the bidder param is set.
    const placementId = deepAccess(bidRequest, 'params.placementId');
    if (isStr(placementId) && placementId) {
      imp.tagid = placementId;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // Prebid.js leaves `at` unset (neither core nor the ORTB converter
    // populates it), unlike Prebid Server, which fills in the same default (`at
    // == 0` -> 1) server side:
    // https://github.com/prebid/prebid-server/blob/0ba352315253f6692af6497d553cfb12909a1b8b/endpoints/openrtb2/auction.go#L1540-L1546
    // A non-1 `at` supplied by the publisher through ortb2 FPD (merged in
    // before this processor runs) is rejected later in buildRequests.
    if (request.at == null) {
      deepSetValue(request, 'at', 1);
    }
    // Prebid consolidates EIDs into the ORTB 2.5 location `user.ext.eids` and
    // deletes `user.eids` (normalizeEIDs in src/fpd/normalize.js), but the
    // Exchange reads the ORTB 2.6 location `user.eids`, so mirror them there.
    // Read from the built request rather than from `bidRequest.userIdAsEids` so
    // that EIDs still come through when the userId module (which defines that
    // alias) is not in the build, e.g. when an RTD module or the publisher
    // puts them straight into ortb2.
    const eids = deepAccess(request, 'user.ext.eids');
    if (isArray(eids) && eids.length) {
      deepSetValue(request, 'user.eids', eids);
    }
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    const bidResponse = buildBidResponse(bid, context);
    // The Exchange omits w/h on video bids. The converter then leaves
    // width/height unset, and they end up as 0 once core merges the response,
    // which a safeRenderer takes as the size of its frame. Fall back to the
    // requested player size, as other adapters do; a complete w/h from the
    // Exchange still wins. Both are replaced together so that a response size
    // is never mixed with the player size.
    const hasSize = Boolean(bidResponse.width && bidResponse.height);
    const hasPlayerSize =
        Boolean(bidResponse.playerWidth && bidResponse.playerHeight);
    if (bidResponse.mediaType === VIDEO && !hasSize && hasPlayerSize) {
      bidResponse.width = bidResponse.playerWidth;
      bidResponse.height = bidResponse.playerHeight;
    }
    return bidResponse;
  },
});

/**
 * Builds the Exchange URL. The partnerId is carried as the `id` query parameter
 * (`/exchange?id=YOUR_ID`), which is how the Exchange authorizes the request.
 * params.placementId is not part of the URL; it travels as `imp.tagid` in the
 * payload.
 */
function resolveEndpoint(validBidRequests) {
  const partnerId = deepAccess(validBidRequests, '0.params.partnerId');
  return `${DEFAULT_ENDPOINT}?id=${encodeURIComponent(partnerId)}`;
}

/**
 * Validates the site section of a built ORTB request against the Exchange spec,
 * which requires site.page (site is normally auto-filled by core's FPD
 * enrichment from the actual page, but site.page can be missing e.g. inside
 * cross-origin iframes).
 *
 * @param {Object} site - the ORTB request's site object.
 * @return {string|null} the reason to skip the request, or null when it is
 *     acceptable.
 */
function validateSite(site) {
  if (!isStr(site.page) || !site.page) {
    return 'site.page is required by the Exchange but is missing';
  }
  return null;
}

/**
 * Validates the app section of a built ORTB request against the Exchange spec,
 * which requires app.bundle.
 *
 * @param {Object} app - the ORTB request's app object.
 * @return {string|null} the reason to skip the request, or null when it is
 *     acceptable.
 */
function validateApp(app) {
  if (!isStr(app.bundle) || !app.bundle) {
    return 'app.bundle is required by the Exchange but is missing';
  }
  return null;
}

// Renders a rejected param value for an error log. Numbers use String()
// (JSON.stringify turns NaN/Infinity into "null"); everything else keeps
// JSON.stringify so the string '123' stays distinguishable from the number.
function formatForLog(value) {
  return typeof value === 'number' ? String(value) : JSON.stringify(value);
}

/**
 * Validates that the bid has a usable params.partnerId: a number that is an
 * integer >= 1. String forms (e.g. '123') are rejected.
 *
 * @param {BidRequest} bid - the bid whose params to validate.
 * @return {string|null} the reason to reject the bid, or null when it is
 *     acceptable.
 */
function validatePartnerId(bid) {
  const partnerId = deepAccess(bid, 'params.partnerId');
  if (typeof partnerId !== 'number' || !Number.isInteger(partnerId) ||
      partnerId < 1) {
    return `params.partnerId is required and must be an integer >= 1 (got ${
        formatForLog(partnerId)})`;
  }
  return null;
}

/**
 * Validates that params.placementId, when set, is a non-empty string. It is
 * optional, but anything else would be silently dropped when mapping it to
 * imp.tagid, so it is rejected here to keep isBidRequestValid consistent with
 * what is actually sent. The Exchange-side format rules (charset, length) are
 * not checked here; the Exchange owns those.
 *
 * @param {BidRequest} bid - the bid whose params to validate.
 * @return {string|null} the reason to reject the bid, or null when it is
 *     acceptable.
 */
function validatePlacementId(bid) {
  const placementId = deepAccess(bid, 'params.placementId');
  if (placementId === undefined || placementId === null) {
    return null;
  }
  if (!isStr(placementId) || !placementId) {
    return `params.placementId must be a non-empty string when set (got ${
        formatForLog(placementId)})`;
  }
  return null;
}

/**
 * Validates that the bid's video part can be sent to the Exchange: the build
 * includes video and a non-empty mimes is set (in mediaTypes.video or
 * ortb2Imp.video).
 *
 * @param {BidRequest} bid - a bid that declares mediaTypes.video.
 * @return {string|null} the reason the video part cannot be sent, or null when
 *     it can.
 */
function validateVideo(bid) {
  // Without the video feature the converter never fills imp.video, while core
  // keeps mediaTypes.video, so a video-only bid would go out with an empty imp.
  if (!FEATURES.VIDEO) {
    return 'video is not included in this Prebid.js build';
  }
  const video = deepAccess(bid, 'mediaTypes.video');
  // Core only drops mimes when it is malformed, so a missing mimes reaches the
  // adapter. A bidder-level ortb2Imp.video is not synced into
  // mediaTypes.video, but the converter merges both into imp.video.
  const hasMimes = [video.mimes, deepAccess(bid, 'ortb2Imp.video.mimes')]
    .some((mimes) => isArray(mimes) && mimes.length > 0);
  if (!hasMimes) {
    return 'mediaTypes.video.mimes (or ortb2Imp.video.mimes) is required by the Exchange';
  }
  return null;
}

/**
 * Reads one media type's floor from the priceFloors module.
 *
 * @param {BidRequest} bidRequest - a bid that has priceFloors' getFloor.
 * @param {string} currency - the currency to request the floor in.
 * @param {string} mediaType - BANNER or VIDEO.
 * @return {{floor: number, currency: string}|null} the floor, or null when the
 *     media type has none.
 */
function getMediaTypeFloor(bidRequest, currency, mediaType) {
  const floor = bidRequest.getFloor({ currency, mediaType, size: '*' }) || {};
  const value = parseFloat(floor.floor);
  // Same acceptance rule as priceFloors' own imp.bidfloor processor
  // (setOrtbImpBidFloor).
  if (floor.currency === undefined || floor.currency === null ||
      !(value > 0)) {
    return null;
  }
  return { floor: value, currency: floor.currency };
}

/**
 * Sets imp.bidfloor / imp.bidfloorcur to the lowest floor among the media
 * types the imp carries (imp.banner / imp.video), and removes them when any of
 * those media types has no floor. Leaves the imp as it is when the priceFloors
 * module is not installed or when getFloor throws.
 *
 * @param {Object} imp - the ORTB imp to update.
 * @param {BidRequest} bidRequest - the bid the imp was built from.
 * @param {string} currency - the currency to request the floors in.
 */
function setLowestFloor(imp, bidRequest, currency) {
  if (typeof bidRequest.getFloor !== 'function') {
    return;
  }
  const mediaTypes = [BANNER, VIDEO].filter(
    (mediaType) => imp[mediaType] !== undefined && imp[mediaType] !== null);
  let floors;
  try {
    floors = mediaTypes.map(
      (mediaType) => getMediaTypeFloor(bidRequest, currency, mediaType));
  } catch (e) {
    // Keep what priceFloors' own processor set from its '*' lookup, i.e. the
    // floor Prebid would send without this recomputation, rather than
    // dropping the floor altogether.
    logWarn(`[${BIDDER_CODE}] Could not compute the floor for ${
        mediaTypes.join(' / ')}; leaving imp.bidfloor as priceFloors set it.`, e);
    return;
  }
  // The Exchange reads only imp.bidfloor. A floor above the cheapest media
  // type's would shut out that media type's bids, and a media type without a
  // floor takes any bid. Both lookups request the same currency from the same
  // floor data, so they come back in the same currency. priceFloors' own
  // processor may already have set imp.bidfloor from a '*' rule, so a media
  // type without a floor has to clear it rather than leave it.
  if (!floors.length || floors.includes(null)) {
    delete imp.bidfloor;
    delete imp.bidfloorcur;
    return;
  }
  const lowest =
      floors.reduce((min, floor) => (floor.floor < min.floor ? floor : min));
  imp.bidfloor = lowest.floor;
  imp.bidfloorcur = lowest.currency;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  // Geniee is not registered in the IAB Global Vendor List (this Exchange does
  // not serve GDPR territories, see buildRequests), so the device-storage
  // disclosure is hosted on Geniee's own domain instead of referenced through a gvlid.
  disclosureURL: 'https://genieesspv.jp/disclosure.json',

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return {boolean} True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    // partnerId is issued by Geniee as an integer >= 1. Only the number form is
    // accepted; reject strings (including numeric strings), zero, negatives,
    // decimals and anything non-numeric.
    const partnerIdError = validatePartnerId(bid);
    if (partnerIdError !== null) {
      logError(`[${BIDDER_CODE}] ${partnerIdError}.`);
      return false;
    }

    // placementId is optional, but when present it must be the non-empty
    // string that will become imp.tagid; accepting other types here would mean
    // silently dropping them later.
    const placementIdError = validatePlacementId(bid);
    if (placementIdError !== null) {
      logError(`[${BIDDER_CODE}] ${placementIdError}.`);
      return false;
    }

    // No need to check banner.sizes: core's validateBannerMediaType
    // (src/prebid.ts) deletes mediaTypes.banner when it has no valid sizes, so
    // a surviving banner always has non-empty sizes.
    const hasBanner = deepAccess(bid, 'mediaTypes.banner') != null;
    const hasVideo = deepAccess(bid, 'mediaTypes.video') != null;
    if (!hasBanner && !hasVideo) {
      logError(`[${
          BIDDER_CODE}] mediaTypes.banner or mediaTypes.video is required.`);
      return false;
    }
    // With a banner part the bid stays valid even when its video part cannot
    // be sent; the imp processor then drops the video.
    const videoError = hasVideo ? validateVideo(bid) : null;
    if (videoError !== null && !hasBanner) {
      logError(`[${BIDDER_CODE}] ${videoError}.`);
      return false;
    }

    const currency = deepAccess(bid, 'params.currency');
    if (currency) {
      if (!ALLOWED_CURRENCIES.includes(currency)) {
        logError(`[${BIDDER_CODE}] Currency "${
            currency}" is not supported. Supported: ${
            ALLOWED_CURRENCIES.join(', ')}.`);
        return false;
      }
    } else {
      // Without params.currency the bid request is made in the page's
      // adServerCurrency; the Exchange only accepts JPY/USD, so anything else
      // means we cannot bid (same policy as the ssp_geniee adapter).
      // bidderRequest is not available here, hence config access.
      const adServerCurrency = config.getConfig('currency.adServerCurrency');
      if (isStr(adServerCurrency) &&
          !ALLOWED_CURRENCIES.includes(adServerCurrency)) {
        logError(`[${BIDDER_CODE}] adServerCurrency "${
            adServerCurrency}" is not supported. Supported: ${
            ALLOWED_CURRENCIES.join(', ')}.`);
        return false;
      }
    }

    return true;
  },

  /**
   * Make server requests from the list of BidRequests.
   *
   * The Geniee Exchange requires the `imp` array to have length exactly 1, so
   * each bid (adUnit) is sent as its own HTTP request instead of being batched
   * into one payload.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @param {BidderRequest} bidderRequest - the master bidRequest object
   * @return {Object[]} Info describing the requests to the server, one per bid.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    // Geniee does not operate this Exchange in GDPR territories, so consent
    // signals are not forwarded and no request is sent when GDPR applies.
    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies')) {
      logWarn(`[${
          BIDDER_CODE}] GDPR applies; skipping request (this Exchange does not serve GDPR territories).`);
      return [];
    }

    const currencyFromBidderRequest =
        getCurrencyFromBidderRequest(bidderRequest);
    return validBidRequests.reduce((requests, bid) => {
      // Priority: per-bid params.currency (publisher's adUnit config, validated
      // as JPY/USD by isBidRequestValid) > the currency module's
      // adServerCurrency > USD. The Exchange only accepts JPY/USD, so when the
      // page's adServerCurrency is anything else (e.g. EUR), do not send a
      // request at all: the same strict policy as the ssp_geniee adapter.
      const paramCurrency = deepAccess(bid, 'params.currency');
      const currency =
          paramCurrency || currencyFromBidderRequest || DEFAULT_CURRENCY;
      if (!ALLOWED_CURRENCIES.includes(currency)) {
        logWarn(`[${BIDDER_CODE}] adServerCurrency "${
            currency}" is not supported; skipping request. Supported: ${
            ALLOWED_CURRENCIES.join(', ')}.`);
        return requests;
      }

      // context.currency is the fallback for bid responses that omit `cur`.
      const data = converter.toORTB(
        { bidRequests: [bid], bidderRequest, context: { currency } });
      deepSetValue(data, 'cur', [currency]);
      // Splitting one auction into one request per imp otherwise leaves the
      // payloads carrying unrelated random ids. Derive the id from the bidder
      // request and the imp instead (`<bidderRequestId>-<impId>`), so the
      // Exchange can tell which requests belong to the same auction and which
      // imp each carries.
      deepSetValue(data, 'id', `${bidderRequest.bidderRequestId}-${bid.bidId}`);

      // The Exchange runs a first price auction only. `at` is 1 here unless
      // the publisher forced another auction type through ortb2 FPD; in that
      // case sending the request would misrepresent the auction, so skip it.
      if (data.at !== 1) {
        logWarn(`[${BIDDER_CODE}] at=${
            data.at} is not supported (the Exchange is first price only); skipping request.`);
        return requests;
      }

      // The Exchange requires exactly one of site or app. The converter already
      // drops the extra client sections when several are set, so only the
      // "neither" case and the per-section required fields are left to check
      // here.
      const hasSite = data.site !== undefined && data.site !== null;
      const hasApp = data.app !== undefined && data.app !== null;
      if (!hasSite && !hasApp) {
        logWarn(`[${
            BIDDER_CODE}] The request has neither site nor app; skipping request (the Exchange requires exactly one of them).`);
        return requests;
      }
      const siteOrAppError =
          hasSite ? validateSite(data.site) : validateApp(data.app);
      if (siteOrAppError !== null) {
        logWarn(`[${BIDDER_CODE}] ${siteOrAppError}; skipping request.`);
        return requests;
      }

      requests.push({
        method: 'POST',
        url: resolveEndpoint([bid]),
        data,
        options: {
          // bidderFactory's POST defaults apply (credentialed `text/plain`).
          // Prebid discourages `application/json`: it adds a CORS preflight
          // (OPTIONS) round trip before the POST.
          withCredentials: true,
        },
      });
      return requests;
    }, []);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the
   *     server.
   * @param {Object} request - the request object returned from buildRequests.
   * @return {Array} - An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, request) {
    const body = serverResponse && serverResponse.body;
    // 204 / empty body => no-bid.
    if (!body || !isArray(body.seatbid) || !body.seatbid.length) {
      return [];
    }

    // No ${AUCTION_PRICE} macro handling here: the Exchange substitutes macros
    // server-side before responding. It also returns no nurl; the impression
    // beacon is embedded in adm, so it fires when the creative renders.
    return converter
      .fromORTB({
        response: body,
        request: request.data,
      })
      .bids;
  },

  /**
   * Registers user syncs for the Exchange.
   *
   * On a winning response the Exchange returns a single cookie-sync URL at
   * `ext.usersync.iframe`, which the adapter registers as an iframe-type sync.
   * Only iframe syncs are supported: the Exchange does not return a pixel/image
   * variant, because the one iframe document carries the sync tags of every
   * demand partner, whereas a pixel variant would need one image per partner
   * and hit Prebid's `syncsPerBidder` cap (default 5). Identical URLs across
   * the responses of a single auction (same partnerId/page) are de-duplicated
   * so the iframe fires once.
   *
   * @param {Object} syncOptions - which sync types the page allows
   *     (iframeEnabled / pixelEnabled).
   * @param {ServerResponse[]} serverResponses - the raw `{body, headers}`
   *     responses that were passed
   *   to interpretResponse (including any that yielded no bids), not
   * interpretResponse's output.
   * @return {Array<{type: string, url: string}>|undefined} the user syncs to
   *     register, or undefined
   *   when there is nothing to register (see the note on the return statement
   * below).
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (!syncOptions.iframeEnabled || !isArray(serverResponses)) {
      return undefined;
    }

    const seen = new Set();
    serverResponses.forEach((serverResponse) => {
      const iframeUrl = deepAccess(serverResponse, 'body.ext.usersync.iframe');
      if (isStr(iframeUrl) && iframeUrl && !seen.has(iframeUrl)) {
        seen.add(iframeUrl);
        syncs.push({ type: 'iframe', url: iframeUrl });
      }
    });
    // The Exchange returns ext.usersync only on a winning response. Returning
    // [] here would let Prebid core call userSync.bidderDone() (it treats [] as
    // truthy), permanently blocking later syncs, so a no-bid auction would
    // suppress sync for the whole page. Return undefined instead.
    return syncs.length ? syncs : undefined;
  },
};

registerBidder(spec);
