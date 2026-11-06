import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO, type MediaType } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { isPlainObject, isStr, logWarn } from '../src/utils.js';
import { parseUntrustedJSON } from '../src/utils/untrustedJson.js';

const BIDDER_CODE = 'motorik';
const GVLID = 1409;
const AD_REQUEST_URL = 'https://lb-east.motorik.io/pjs';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

export type MotorikBidderParams = {
  /**
   * Account ID on platform.
   */
  accountId: string;
  /**
   * Placement ID on platform.
   */
  placementId: string;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MotorikBidderParams;
  }
}

/**
 * Formats of the ad unit that can be requested from Motorik.
 * Native is requested only when Prebid core managed to derive an ORTB native request with assets.
 */
const getMediaTypes = (bid): MediaType[] => {
  const mediaTypes: MediaType[] = [];

  if (isPlainObject(bid?.mediaTypes?.[BANNER])) mediaTypes.push(BANNER);
  if (FEATURES.VIDEO && isPlainObject(bid?.mediaTypes?.[VIDEO])) mediaTypes.push(VIDEO);
  if (FEATURES.NATIVE && isPlainObject(bid?.mediaTypes?.[NATIVE]) && bid.nativeOrtbRequest?.assets?.length) {
    mediaTypes.push(NATIVE);
  }

  return mediaTypes;
};

/**
 * Native adm may come wrapped into `{ native: {...} }` (OpenRTB Native 1.0 style).
 */
const unwrapNativeAdm = (adm) => {
  let parsed = adm;

  if (isStr(adm)) {
    try {
      parsed = parseUntrustedJSON(adm);
    } catch (e) {
      return adm;
    }
  }

  return isPlainObject(parsed?.native) ? parsed.native : parsed;
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

const buildUrl = (params: MotorikBidderParams) =>
  `${AD_REQUEST_URL}?k=${encodeURIComponent(params.accountId)}&name=${encodeURIComponent(params.placementId)}`;

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    const { accountId, placementId } = bid?.params || ({} as MotorikBidderParams);

    if (!isStr(accountId) || !accountId.length || !isStr(placementId) || !placementId.length) {
      logWarn(`${BIDDER_CODE}: accountId and placementId must be non-empty strings`, bid?.params);

      return false;
    }

    if (!getMediaTypes(bid).length) {
      logWarn(`${BIDDER_CODE}: ad unit has no supported media type`, bid.mediaTypes);

      return false;
    }

    return true;
  },

  /**
   * Motorik accepts a single impression with a single format per request,
   * so every declared format of the ad unit is sent as a separate request.
   */
  buildRequests: (validBidRequests = [], bidderRequest) => {
    const requests = [];

    validBidRequests.forEach((bid) => {
      const url = buildUrl(bid.params);

      getMediaTypes(bid).forEach((mediaType) => {
        requests.push({
          method: 'POST' as const,
          url,
          data: converter.toORTB({
            bidRequests: [bid],
            bidderRequest,
            context: { mediaType },
          }),
        });
      });
    });

    return requests;
  },

  interpretResponse: (serverResponse, bidRequest) => {
    if (!Array.isArray(serverResponse?.body?.seatbid)) return [];

    const result = converter.fromORTB({ response: serverResponse.body, request: bidRequest.data });

    return (result as { bids: any[] }).bids;
  },
};

registerBidder(spec);
