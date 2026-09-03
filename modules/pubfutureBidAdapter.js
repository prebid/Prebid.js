import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, logInfo } from '../src/utils.js';
import { CLIENT_SECTIONS, hasSection } from '../src/fpd/oneClient.js';

/**
 * PubFuture bidder adapter (oRTB 2.x).
 *
 * Required params:
 *   adUnitId       {string} PubFuture ad unit / placement id (mapped to imp.tagid)
 * Optional params:
 *   publisherId  {string} mapped to site.publisher.id
 *   bidfloor     {number} CPM floor, USD
 *   test         {boolean} when true, ignore adUnitId and request PubFuture's
 *                well-known test ad unit instead (server always returns a
 *                canned isTestAd creative for it) and flag the oRTB request
 *                as non-billable (test: 1).
 *
 * Note: the endpoint is intentionally NOT publisher-configurable — Prebid
 * module rules forbid endpoint override via params.
 */

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./pubfutureBidAdapter.d.ts').PubfutureBidParams} PubfutureBidParams
 * @typedef {BidRequest & { params: PubfutureBidParams }} PubfutureBidRequest
 */

const BIDDER_CODE = 'pubfuture';
const ENDPOINT = 'https://ortb2.pubstar-ad.com/v1/bid'; // production exchange URL
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
// PubFuture's server-recognized test ad unit — always returns a canned
// isTestAd creative regardless of the publisher's real inventory.
const TEST_AD_UNIT_ID = '1247/99228313862_68e5e38e1a65f400287e6845';

/**
 * True when `params.bidfloor` is a floor that can legally go on the wire.
 *
 * `typeof x === 'number'` is not enough: NaN and Infinity are numbers that
 * `JSON.stringify` turns into `null`, and a negative floor is not meaningful.
 *
 * @param {unknown} bidfloor
 * @returns {boolean}
 */
function isValidFloor(bidfloor) {
  return typeof bidfloor === 'number' && isFinite(bidfloor) && bidfloor >= 0;
}

/**
 * True when the priceFloors module supplies a dynamic floor for this bid.
 *
 * `imp.bidfloor` being set is not sufficient to tell: the converter's fpd
 * processor also copies `ortb2Imp.bidfloor` into it, and those two sources
 * rank differently against `params.bidfloor` — a floors-module result outranks
 * the param, while generic ortb2 request data is exactly what the param exists
 * to override. Mirrors the validity check in priceFloors' own `tryGetFloor`.
 *
 * @param {PubfutureBidRequest} bidRequest
 * @param {object} context
 * @returns {boolean}
 */
function hasFloorsModuleFloor(bidRequest, context) {
  if (typeof bidRequest.getFloor !== 'function') {
    return false;
  }
  try {
    const floor = bidRequest.getFloor({
      currency: context?.currency || DEFAULT_CURRENCY,
      mediaType: context?.mediaType || '*',
      size: '*',
    });
    return floor?.currency != null && !!floor.floor && !isNaN(parseFloat(floor.floor));
  } catch (e) {
    // A publisher-supplied getFloor that throws must not break the auction.
    return false;
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  /**
   * @param {(bidRequest: PubfutureBidRequest, context: object) => object} buildImp
   * @param {PubfutureBidRequest} bidRequest
   * @param {object} context
   */
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // Strict `=== true`, matching isBidRequestValid() and buildRequests(): a
    // truthy non-boolean (e.g. the string 'false') would otherwise swap in the
    // test placement here while buildRequests() still grouped the bid as live,
    // sending a canned test creative as billable traffic — and dropping the
    // publisher's real adUnitId in the process.
    imp.tagid = bidRequest.params.test === true ? TEST_AD_UNIT_ID : bidRequest.params.adUnitId;
    // Floor precedence: priceFloors module > params.bidfloor > ortb2Imp.
    // The module's dynamic floor must not be clobbered by a stale static
    // param, but an ortb2Imp.bidfloor inherited through the converter's fpd
    // processor must yield to the param — overriding generic request data is
    // precisely what bidder params are for.
    // The value must also be a usable floor: NaN and Infinity serialize to
    // `null` and a negative floor is meaningless, so a typo in the publisher's
    // config would otherwise put an invalid bidfloor on the wire — and since
    // imps are grouped, that can cost the whole request rather than one imp.
    // An unusable param is ignored, leaving whatever the request already had.
    if (isValidFloor(bidRequest.params.bidfloor) && !hasFloorsModuleFloor(bidRequest, context)) {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const publisherId = context.publisherId;
    if (publisherId) {
      // Write into whichever client section the converter kept: `dooh`, `app`
      // and `site` are mutually exclusive, and the converter's onlyOneClient
      // processor has already dropped the others by this point. Always
      // targeting `site` would resurrect it on app/dooh inventory, producing a
      // request with two client sections that the exchange may reject or
      // misclassify. Falls back to `site` for a plain web request where the
      // publisher supplied no ortb2 client section at all.
      const section = CLIENT_SECTIONS.find((s) => hasSection(request, s)) || 'site';
      deepSetValue(request, `${section}.publisher.id`, publisherId);
    }
    if (context.isTest) {
      // Standard oRTB signal: this auction is non-billable/test traffic.
      request.test = 1;
    }
    deepSetValue(request, 'ext.pubfuture.adapterVersion', '1.0.0');
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    // TEMP (remove once the gateway sends `mtype` on every bid): the gateway
    // is still missing `mtype` (oRTB 2.6) specifically on the well-known test
    // ad unit's response while that's being fixed server-side. Scope the
    // banner fallback to ONLY that tagid — real ad units still require the
    // gateway to send `mtype`, so a real bid missing it is correctly dropped
    // rather than silently masked as banner.
    if (!bid.mtype && context.imp?.tagid === TEST_AD_UNIT_ID) {
      context.mediaType = BANNER;
    }
    return buildBidResponse(bid, context);
  },
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid(bid) {
    if (bid?.params?.test === true) {
      return true; // adUnitId is ignored/optional in test mode
    }
    return typeof bid?.params?.adUnitId === 'string' && bid.params.adUnitId.length > 0;
  },

  /**
   * @param {PubfutureBidRequest[]} validBidRequests
   * @param {object} bidderRequest
   */
  buildRequests(validBidRequests, bidderRequest) {
    // `test` and `publisher.id` are both request-wide oRTB fields, so bids that
    // disagree on either cannot share a request: one `params.test` bid would
    // mark every co-bid live imp as non-billable, and only the first bid's
    // `params.publisherId` would be applied, silently sending the rest under
    // the wrong account. Group by both, then emit one request per group — a
    // typical auction is homogeneous and still produces a single request.
    const groups = new Map();
    validBidRequests.forEach((bidRequest) => {
      const isTest = bidRequest.params.test === true;
      const publisherId = bidRequest.params.publisherId;
      const key = `${isTest}|${publisherId ?? ''}`;
      if (!groups.has(key)) {
        groups.set(key, { bidRequests: [], isTest, publisherId });
      }
      groups.get(key).bidRequests.push(bidRequest);
    });

    return Array.from(groups.values()).map(({ bidRequests, isTest, publisherId }) => {
      const data = converter.toORTB({
        bidRequests,
        bidderRequest,
        context: { publisherId, isTest },
      });
      logInfo(`[pubfuture] auction -> ${ENDPOINT}`, data);
      return {
        method: 'POST',
        url: ENDPOINT,
        data,
        // No explicit contentType: Prebid defaults to `text/plain`, which is a
        // CORS-safelisted request content type, so the browser skips the
        // OPTIONS preflight and saves a round trip on every auction. The
        // gateway parses the JSON body regardless of the header.
        options: { withCredentials: false },
      };
    });
  },

  interpretResponse(serverResponse, request) {
    if (!serverResponse?.body?.seatbid) {
      return [];
    }
    return converter.fromORTB({
      response: serverResponse.body,
      request: request.data,
    }).bids;
  },

  getUserSyncs() {
    // No cookie sync yet; add iframe/pixel syncs here when the server supports them.
    return [];
  },
};

registerBidder(spec);
