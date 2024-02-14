import {deepAccess, deepSetValue, logInfo} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const ENDPOINT = 'https://dev-exchange-npid.ops.co/pbjs';
const BIDDER_CODE = 'opsco';
const DEFAULT_BID_TTL = 300;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_NET_REVENUE = true;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => !!(bid.params && bid.params.placementId && bid.params.publisherId && bid.mediaTypes?.banner?.sizes),

  buildRequests: (validBidRequests, bidderRequest) => {
    const { publisherId } = validBidRequests[0].params;
    const siteId = validBidRequests[0].params.siteId;

    const payload = {
      id: bidderRequest.bidderRequestId,
      imp: buildOpenRtbImps(validBidRequests),
      site: {
        id: siteId,
        publisher: { id: publisherId },
        domain: bidderRequest.refererInfo?.domain,
        page: bidderRequest.refererInfo?.page,
        ref: bidderRequest.refererInfo?.ref,
      },
      test: isTest(validBidRequests[0])
    };

    attachParams(payload, 'schain', bidderRequest);
    attachParams(payload, 'gdprConsent', bidderRequest);
    attachParams(payload, 'uspConsent', bidderRequest);
    attachParams(payload, 'userIdAsEids', validBidRequests[0]);

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: (response) => (response.body?.bids || []).map(({ bidId, cpm, width, height, creativeId, currency, netRevenue, ttl, ad, mediaType }) => ({
    requestId: bidId,
    cpm,
    width,
    height,
    creativeId,
    currency: currency || DEFAULT_CURRENCY,
    netRevenue: netRevenue || DEFAULT_NET_REVENUE,
    ttl: ttl || DEFAULT_BID_TTL,
    ad,
    mediaType
  })),

  getUserSyncs: (syncOptions, serverResponses) => {
    logInfo('opsco.getUserSyncs', 'syncOptions', syncOptions, 'serverResponses', serverResponses);

    if (!syncOptions.iframeEnabled && !syncOptions.pixelEnabled) {
      return [];
    }

    let syncs = [];

    serverResponses.forEach(resp => {
      const userSync = deepAccess(resp, 'body.ext.usersync');
      if (userSync) {
        const syncDetails = Object.values(userSync).flatMap(value => value.syncs || []);
        syncDetails.forEach(syncDetail => {
          const type = syncDetail.type === 'iframe' ? 'iframe' : 'image';
          if ((type === 'iframe' && syncOptions.iframeEnabled) || (type === 'image' && syncOptions.pixelEnabled)) {
            syncs.push({ type, url: syncDetail.url });
          }
        });
      }
    });

    logInfo('opsco.getUserSyncs result=%o', syncs);
    return syncs;
  }
};

function buildOpenRtbImps(validBidRequests) {
  const placementId = validBidRequests[0].params.placementId;
  return validBidRequests.map(bidRequest => ({
    id: bidRequest.bidId,
    banner: { format: extractSizes(bidRequest) },
    ext: { placementId }
  }));
}

function extractSizes(bidRequest) {
  return (bidRequest.mediaTypes?.banner?.sizes || []).map(([width, height]) => ({ w: width, h: height }));
}

function attachParams(payload, paramName, request) {
  if (request[paramName]) {
    deepSetValue(payload, `source.ext.${paramName}`, request[paramName]);
  }
}

function isTest(validBidRequest) {
  return validBidRequest.params?.test === true;
}

registerBidder(spec);
