import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';

const BIDDER_CODE = 'roundhouseads';
const BIDADAPTERVERSION = 'RHA-PREBID-2024.10.01';
const USER_SYNC_ENDPOINT = 'https://roundhouseads.com/sync';

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const ENDPOINT_URL = isLocalhost
  ? 'http://localhost:3000/bid'
  : 'https://Rhapbjsv3-env.eba-aqkfquti.us-east-1.elasticbeanstalk.com/bid';

function isBidRequestValid(bid) {
  return !!(bid.params && bid.params.publisherId && typeof bid.params.publisherId === 'string');
}

function buildRequests(validBidRequests, bidderRequest) {
  return validBidRequests.map(bid => {
    const data = {
      id: bid.bidId,
      publisherId: bid.params.publisherId,
      placementId: bid.params.placementId || '',
      currency: bid.params.currency || 'USD',
      sizes: bid.mediaTypes?.banner?.sizes,
      video: bid.mediaTypes?.video || null,
      native: bid.mediaTypes?.native || null,
      ext: {
        ver: BIDADAPTERVERSION,
      },
      // Simplified referer field; adjust as per server's needs
      referer: bidderRequest.refererInfo?.page || ''
    };

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data,
    };
  });
}

function interpretResponse(serverResponse, request) {
  const bidResponses = [];
  const response = serverResponse.body;

  if (response && response.bids && Array.isArray(response.bids)) {
    response.bids.forEach(bid => {
      const bidResponse = {
        requestId: bid.requestId,
        cpm: bid.cpm || 0,
        width: bid.width || 300,
        height: bid.height || 250,
        creativeId: bid.creativeId || 'defaultCreative',
        currency: bid.currency || 'USD',
        netRevenue: true,
        ttl: bid.ttl || 360,
        ad: bid.ad || '<div>Test Ad</div>',
        mediaType: bid.mediaType || BANNER,
        meta: {
          advertiserDomains: bid.advertiserDomains || [],
          advertiserId: bid.advertiserId || null,
          advertiserName: bid.advertiserName || null,
          agencyId: bid.agencyId || null,
          agencyName: bid.agencyName || null,
          brandId: bid.brandId || null,
          brandName: bid.brandName || null,
          dchain: bid.dchain || null,
          demandSource: bid.demandSource || null,
          dsa: bid.dsa || null,
          primaryCatId: bid.primaryCatId || null,
          secondaryCatIds: bid.secondaryCatIds || [],
          mediaType: bid.mediaType || BANNER,
          networkId: bid.networkId || null,
          networkName: bid.networkName || null,
        }
      };

      if (bid.mediaType === VIDEO) {
        bidResponse.vastUrl = bid.vastUrl;
      } else if (bid.mediaType === NATIVE) {
        bidResponse.native = bid.native;
      }

      bidResponses.push(bidResponse);
    });
  }

  return bidResponses;
}

function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  const syncs = [];
  const gdprParams = gdprConsent
    ? `&gdpr=${gdprConsent.gdprApplies ? 1 : 0}&gdpr_consent=${encodeURIComponent(gdprConsent.consentString)}`
    : '';
  const uspParam = uspConsent ? `&us_privacy=${encodeURIComponent(uspConsent)}` : '';

  if (syncOptions.iframeEnabled) {
    syncs.push({ type: 'iframe', url: `${USER_SYNC_ENDPOINT}?${gdprParams}${uspParam}` });
  } else if (syncOptions.pixelEnabled) {
    syncs.push({ type: 'image', url: `${USER_SYNC_ENDPOINT}?${gdprParams}${uspParam}` });
  }

  return syncs;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
