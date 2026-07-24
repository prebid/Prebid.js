import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

export const BIDDER_CODE = 'nexbid';
export const ENDPOINT = 'https://nexbid.uk/api/v1/prebid/bid';
const TEST_PUBLISHER_ID = 'nexbid-test';
const TEST_PLACEMENT_ID = 'banner-300x250';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    const params = bid && bid.params;
    return Boolean(
      params &&
      isNonEmptyString(params.publisherId) &&
      isNonEmptyString(params.placementId) &&
      (params.configId === undefined || isNonEmptyString(params.configId)) &&
      (params.test === undefined || typeof params.test === 'boolean') &&
      (params.test !== true || isApprovedTestPlacement(params))
    );
  },

  buildRequests(validBidRequests, bidderRequest = {}) {
    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify({
        bidder: BIDDER_CODE,
        auctionId: bidderRequest.auctionId,
        bidderRequestId: bidderRequest.bidderRequestId,
        timeout: bidderRequest.timeout,
        refererInfo: bidderRequest.refererInfo,
        ortb2: bidderRequest.ortb2,
        privacy: privacyFrom(bidderRequest),
        bids: validBidRequests.map((bid) => toNexBidRequest(bid, bidderRequest))
      }),
      options: {
        withCredentials: false
      }
    };
  },

  interpretResponse(serverResponse) {
    const body = serverResponse && serverResponse.body;
    if (!body || !Array.isArray(body.bids)) return [];

    return body.bids.map(toPrebidResponse).filter(Boolean);
  }
};

function toNexBidRequest(bid, bidderRequest) {
  const params = bid.params;
  const sizes = bannerSizes(bid);

  return {
    requestId: bid.bidId,
    adUnitCode: bid.adUnitCode,
    transactionId: bid.transactionId,
    sizes,
    mediaTypes: bid.mediaTypes,
    publisherId: params.publisherId,
    placementId: params.placementId,
    configId: params.configId || '',
    test: params.test === true && isApprovedTestPlacement(params),
    schain: schainFrom(bid, bidderRequest),
    ortb2Imp: bid.ortb2Imp || null,
    floor: floorForBid(bid, sizes)
  };
}

function isApprovedTestPlacement(params) {
  return params.publisherId === TEST_PUBLISHER_ID && params.placementId === TEST_PLACEMENT_ID;
}

function schainFrom(bid, bidderRequest) {
  return bid.schain || schainFromOrtb(bid.ortb2) || schainFromOrtb(bidderRequest.ortb2) || null;
}

function schainFromOrtb(ortb2) {
  return ortb2 && ortb2.source && ortb2.source.ext && ortb2.source.ext.schain;
}

function toPrebidResponse(bid) {
  const requestId = bid && bid.requestId;
  const cpm = numberValue(bid && bid.cpm);
  const width = numberValue(bid && bid.width);
  const height = numberValue(bid && bid.height);
  const currency = bid && bid.currency;
  const ad = bid && bid.ad;
  const advertiserDomains = bid && bid.advertiserDomains;

  if (!isNonEmptyString(requestId) || cpm <= 0 || width <= 0 || height <= 0) return null;
  if (!/^[A-Z]{3}$/.test(currency || '') || !isNonEmptyString(ad)) return null;
  if (!Array.isArray(advertiserDomains) || !advertiserDomains.some(isNonEmptyString)) return null;

  const response = {
    requestId,
    cpm,
    width,
    height,
    creativeId: isNonEmptyString(bid.creativeId) ? bid.creativeId : `${BIDDER_CODE}-${requestId}`,
    currency,
    netRevenue: bid.netRevenue !== false,
    ttl: numberValue(bid.ttl) > 0 ? numberValue(bid.ttl) : 300,
    ad,
    mediaType: BANNER,
    meta: {
      advertiserDomains: advertiserDomains.filter(isNonEmptyString)
    }
  };

  if (isNonEmptyString(bid.dealId)) response.dealId = bid.dealId;
  return response;
}

function privacyFrom(bidderRequest) {
  const gdpr = bidderRequest.gdprConsent;
  const gpp = bidderRequest.gppConsent;

  return {
    gdpr: gdpr ? {
      applies: gdpr.gdprApplies,
      consentString: gdpr.consentString || ''
    } : undefined,
    usp: bidderRequest.uspConsent,
    gpp: gpp ? {
      string: gpp.gppString || '',
      applicableSections: gpp.applicableSections || []
    } : undefined
  };
}

function floorForBid(bid, sizes) {
  if (typeof bid.getFloor !== 'function') return null;

  try {
    const result = bid.getFloor({
      currency: 'USD',
      mediaType: BANNER,
      size: sizes[0] || '*'
    });
    const floor = numberValue(result && result.floor);
    return floor >= 0 && isNonEmptyString(result && result.currency)
      ? { currency: result.currency, value: floor }
      : null;
  } catch (_) {
    return null;
  }
}

function bannerSizes(bid) {
  const mediaTypeSizes = bid && bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes;
  const sizes = mediaTypeSizes || (bid && bid.sizes) || [];
  if (!Array.isArray(sizes)) return [];
  return sizes.length === 2 && sizes.every(Number.isFinite) ? [sizes] : sizes;
}

function numberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

registerBidder(spec);

