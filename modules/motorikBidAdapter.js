import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { isPlainObject, isStr, logWarn } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('./motorikBidAdapter.d.ts').MotorikBidderParams} MotorikBidderParams
 * @typedef {BidRequest & { params: MotorikBidderParams }} MotorikBidRequest
 */

const BIDDER_CODE = 'motorik';
const AD_REQUEST_URL = 'https://lb-east.motorik.io/pjs';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

// Order matters: if an ad unit declares several formats, the first supported one is requested
const MEDIA_TYPES_PRIORITY = [BANNER, VIDEO, NATIVE];

/**
 * Motorik accepts a single ad format per impression.
 * @param {MotorikBidRequest} bid
 * @returns {string|undefined}
 */
const getMediaType = (bid) => MEDIA_TYPES_PRIORITY.find((mediaType) => isPlainObject(bid.mediaTypes?.[mediaType]));

/**
 * Native adm may come wrapped into `{ native: {...} }` (OpenRTB Native 1.0 style).
 * @param {string|object} adm
 * @returns {string|object}
 */
const unwrapNativeAdm = (adm) => {
  let parsed = adm;

  if (isStr(adm)) {
    try {
      parsed = JSON.parse(adm);
    } catch (e) {
      return adm;
    }
  }

  return isPlainObject(parsed?.native) ? parsed.native : adm;
};

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },

  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    request.cur = [DEFAULT_CURRENCY];

    return request;
  },

  bidResponse(buildBidResponse, bid, context) {
    if (context.mediaType === NATIVE) {
      bid = { ...bid, adm: unwrapNativeAdm(bid.adm) };
    }

    return buildBidResponse(bid, context);
  },
});

/**
 * @param {MotorikBidRequest} bid
 * @returns {string}
 */
const buildUrl = (bid) => `${AD_REQUEST_URL}?k=${encodeURIComponent(bid.params.accountId)}&name=${encodeURIComponent(bid.params.placementId)}`;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  /**
   * @param {MotorikBidRequest} bid
   * @returns {boolean}
   */
  isBidRequestValid: (bid) => {
    const { accountId, placementId } = bid?.params || {};

    if (!isStr(accountId) || !accountId.length || !isStr(placementId) || !placementId.length) {
      logWarn(`${BIDDER_CODE}: accountId and placementId must be non-empty strings`, bid?.params);

      return false;
    }

    if (!getMediaType(bid)) {
      logWarn(`${BIDDER_CODE}: ad unit has no supported media type`, bid.mediaTypes);

      return false;
    }

    return true;
  },

  /**
   * One request per bid: Motorik responds to the first impression only.
   * @param {MotorikBidRequest[]} validBidRequests
   * @param bidderRequest
   */
  buildRequests: (validBidRequests = [], bidderRequest) => validBidRequests.map((bid) => ({
    method: 'POST',
    url: buildUrl(bid),
    data: converter.toORTB({
      bidRequests: [bid],
      bidderRequest,
      context: { mediaType: getMediaType(bid) },
    }),
  })),

  interpretResponse: (serverResponse, bidRequest) => {
    if (!Array.isArray(serverResponse?.body?.seatbid)) return [];

    return converter.fromORTB({ response: serverResponse.body, request: bidRequest.data }).bids;
  },
};

registerBidder(spec);
