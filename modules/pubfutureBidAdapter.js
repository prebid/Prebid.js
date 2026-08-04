import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { deepSetValue, logInfo } from '../src/utils.js';

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
const BIDDER_CODE = 'pubfuture';
const ENDPOINT = 'https://ortb2.pubstar-ad.com/v1/bid'; // production exchange URL
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;
// PubFuture's server-recognized test ad unit — always returns a canned
// isTestAd creative regardless of the publisher's real inventory.
const TEST_AD_UNIT_ID = '1247/99228313862_68e5e38e1a65f400287e6845';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.params.test ? TEST_AD_UNIT_ID : bidRequest.params.adUnitId;
    // Only fall back to params.bidfloor when the priceFloors module hasn't
    // already populated imp.bidfloor from bidRequest.getFloor() — otherwise
    // this would overwrite a publisher's dynamic floor with a stale/lower
    // static one from the ad unit's bidder params.
    if (imp.bidfloor == null && typeof bidRequest.params.bidfloor === 'number') {
      imp.bidfloor = bidRequest.params.bidfloor;
      imp.bidfloorcur = DEFAULT_CURRENCY;
    }
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const publisherId = context.publisherId;
    if (publisherId) {
      deepSetValue(request, 'site.publisher.id', publisherId);
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

  buildRequests(validBidRequests, bidderRequest) {
    // One oRTB request per auction; every ad unit becomes one imp.
    const first = validBidRequests[0];
    const data = converter.toORTB({
      bidRequests: validBidRequests,
      bidderRequest,
      context: {
        publisherId: first?.params?.publisherId,
        isTest: validBidRequests.some((b) => b.params.test === true),
      },
    });
    logInfo(`[pubfuture] auction -> ${ENDPOINT}`, data);
    return [{
      method: 'POST',
      url: ENDPOINT,
      data,
      // `application/json` is required, not optional: the gateway's body
      // parser only parses the request body when this exact content type is
      // set (verified against production — `text/plain`, Prebid's usual
      // no-preflight default, gets the body dropped server-side and returns
      // "imp[0].tagid is required"). This does cost an extra CORS preflight
      // OPTIONS round trip per auction, but it's required for correctness.
      options: { contentType: 'application/json', withCredentials: false },
    }];
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
