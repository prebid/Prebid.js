import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isNumber, logWarn } from '../src/utils.js';

/**
 * BidDigi Prebid.js bidder adapter.
 *
 * Registers `biddigi` as a bidder in the standard Prebid.js unified auction, builds an
 * OpenRTB 2.5+ request against BidDigi's own auction endpoint, and interprets the response
 * back into standard Prebid bid objects.
 *
 * Endpoint: packages/auction-service's real `POST /openrtb2/auction` handler, live on
 * Cloudflare Workers (see packages/auction-service/README.md "Cloudflare Workers deployment
 * (Phase 9)") at biddigi-auction-service.biddigi25.workers.dev. One global Worker, not one host
 * per region — Cloudflare's edge network already routes each request to the nearest PoP, so
 * the region-keyed BIDDIGI_ENDPOINTS map below intentionally resolves every region to the same
 * URL rather than standing up separate regional hostnames. `region` stays a closed enum (not an
 * arbitrary publisher-supplied URL) so a compromised/malicious ad unit config can't redirect
 * BidDigi's bid traffic anywhere — Prebid.org's adapter review rejects that pattern outright.
 * TODO: point at custom domains (e.g. auction.biddigi.com) once those exist — see
 * packages/auction-service/README.md's "custom domain" note for why that's not live yet
 * (Cloudflare Workers Custom Domains need biddigi.com's nameservers on Cloudflare; the
 * workers.dev URL is fully functional in the meantime).
 */
const BIDDER_CODE = 'biddigi';
const DEFAULT_CURRENCY = 'INR'; // BidDigi's own endpoint bids natively in INR to match GAM/adServerCurrency (see packages/wrapper), avoiding a lossy USD->INR round trip that third-party bidders need.
const DEFAULT_TTL = 300;

const BIDDIGI_AUCTION_URL = 'https://biddigi-auction-service.biddigi25.workers.dev/openrtb2/auction';
const BIDDIGI_ENDPOINTS = {
  in: BIDDIGI_AUCTION_URL,
  us: BIDDIGI_AUCTION_URL,
};
const DEFAULT_REGION = 'in';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY, // fallback when the response doesn't set ortbResponse.cur — see libraries/ortbConverter/processors/default.js props processor
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);

    if (isNumber(bidRequest.params.bidfloor) && !imp.bidfloor) {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = bidRequest.params.bidfloorcur || DEFAULT_CURRENCY;
    }

    imp.ext = Object.assign({}, imp.ext, {
      [BIDDER_CODE]: {
        placementId: String(bidRequest.params.placementId),
        publisherId: String(bidRequest.params.publisherId),
      },
    });

    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.test = config.getConfig('debug') ? 1 : 0;
    if (!request.cur) request.cur = [DEFAULT_CURRENCY];
    return request;
  },
  // currency, cpm, dealId, creativeId, meta.advertiserDomains etc. are all handled by the
  // default `props` bidResponse processor (see libraries/ortbConverter/processors/default.js) —
  // no per-bidder override needed here.
});

function endpointFor(validBidRequests) {
  const region = validBidRequests?.[0]?.params?.region;
  if (region && !BIDDIGI_ENDPOINTS[region]) {
    logWarn(`[${BIDDER_CODE}] unrecognized region "${region}", falling back to "${DEFAULT_REGION}"`);
  }
  return BIDDIGI_ENDPOINTS[region] || BIDDIGI_ENDPOINTS[DEFAULT_REGION];
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * @param {object} bid
   * @return {boolean} true if this bid request has the minimum params BidDigi's endpoint needs.
   */
  isBidRequestValid: function (bid) {
    const params = bid && bid.params;
    return Boolean(params && params.placementId && params.publisherId);
  },

  /**
   * @param {object[]} validBidRequests
   * @param {object} bidderRequest
   * @return {object|object[]} one POST request per call (BidDigi's endpoint accepts a single
   *   oRTB request covering every imp in the auction, matching standard Prebid.js practice for
   *   endpoints that support multi-imp requests).
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (!validBidRequests || validBidRequests.length === 0) return [];

    const request = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });

    return {
      method: 'POST',
      url: endpointFor(validBidRequests),
      data: request,
      // No explicit `options.contentType: 'application/json'` here: this is a cross-origin
      // request (see packages/auction-service's CORS_HEADERS / app.js CORS middleware), and
      // `application/json` is not a CORS-safelisted content type, so setting it forces a
      // preflight OPTIONS round trip before every single auction POST. bidderFactory's default
      // ajax path already JSON.stringifies an object `data` while sending it as `text/plain`
      // (safelisted, no preflight) -- auction-service's `express.json()` / `request.json()`
      // parse the body the same way regardless of the declared content-type, so nothing on the
      // server side needs to change for this.
    };
  },

  /**
   * @param {object} response the http response from BidDigi's auction endpoint
   * @param {object} request the request object returned by buildRequests
   * @return {object[]} array of Prebid bid response objects
   */
  interpretResponse: function (response, request) {
    if (!response || !response.body) return [];
    const bids = converter.fromORTB({ response: response.body, request: request.data }).bids;
    return bids || [];
  },

  /**
   * @param {object} syncOptions
   * @param {object[]} serverResponses
   * @param {object} gdprConsent
   * @param {string} uspConsent
   * @param {object} gppConsent
   * @return {object[]} user sync pixels, if BidDigi's endpoint returned any in its response ext.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) {
    const syncs = [];
    const ext = serverResponses?.[0]?.body?.ext;
    if (!ext || !Array.isArray(ext.syncs)) return syncs;

    ext.syncs.forEach(function (sync) {
      if (sync.type === 'iframe' && syncOptions.iframeEnabled) {
        syncs.push({ type: 'iframe', url: sync.url });
      } else if (sync.type === 'image' && syncOptions.pixelEnabled) {
        syncs.push({ type: 'image', url: sync.url });
      }
    });

    return syncs;
  },
};

registerBidder(spec);
