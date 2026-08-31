import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
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
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // The Exchange requires banner.w/h, so mirror the first format entry into
    // w/h. Prebid's default banner processor only emits format.
    const format = deepAccess(imp, 'banner.format');
    if (isArray(format) && format.length &&
        (imp.banner.w === undefined || imp.banner.w === null ||
         imp.banner.h === undefined || imp.banner.h === null)) {
      imp.banner.w = format[0].w;
      imp.banner.h = format[0].h;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    // Prebid.js leaves `at` unset (neither core nor the ORTB converter
    // populates it), unlike Prebid Server, which fills in the same default (`at
    // == 0` -> 1) server side:
    // https://github.com/prebid/prebid-server/blob/0ba352315253f6692af6497d553cfb12909a1b8b/endpoints/openrtb2/auction.go#L1540-L1546
    // An `at` supplied by the publisher through ortb2 FPD (merged in before
    // this processor runs) is left alone.
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
});

/**
 * Builds the Exchange URL. The partnerId is carried as the `id` query parameter
 * (`/exchange?id=YOUR_ID`), which is how the Exchange authorizes the request.
 * An optional placementId is appended as `placement`
 * (`/exchange?id=YOUR_ID&placement=YOUR_PLACEMENT`) so Geniee reports can be
 * broken down by ad unit; it is passed through as written (only percent-encoded
 * so it cannot break the query string) and validated by the Exchange.
 */
function resolveEndpoint(validBidRequests) {
  const partnerId = deepAccess(validBidRequests, '0.params.partnerId');
  const placementId = deepAccess(validBidRequests, '0.params.placementId');
  const url = `${DEFAULT_ENDPOINT}?id=${encodeURIComponent(partnerId)}`;
  return placementId ? `${url}&placement=${encodeURIComponent(placementId)}`
    : url;
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
        JSON.stringify(partnerId)})`;
  }
  return null;
}

/**
 * Validates that the bid declares the banner media type (mediaTypes.banner).
 *
 * @param {BidRequest} bid - the bid whose mediaTypes to validate.
 * @return {string|null} the reason to reject the bid, or null when it is
 *     acceptable.
 */
function validateBanner(bid) {
  const banner = deepAccess(bid, 'mediaTypes.banner');
  if (banner === undefined || banner === null) {
    return 'mediaTypes.banner is required (this adapter is banner-only)';
  }
  return null;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

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

    // The Geniee Exchange requires imp.banner (banner-only adapter); core does
    // not filter out non-banner adUnits for client-side adapters, so reject
    // them here. No need to also check banner.sizes: core's
    // validateBannerMediaType (src/prebid.ts) deletes mediaTypes.banner when it
    // has no valid sizes, so a surviving banner always has non-empty sizes.
    const bannerError = validateBanner(bid);
    if (bannerError !== null) {
      logError(`[${BIDDER_CODE}] ${bannerError}.`);
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
