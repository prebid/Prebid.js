import { registerBidder } from '../src/adapters/bidderFactory.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'mocktioneer';
const DEFAULT_ENDPOINT = 'https://mocktioneer.edgecompute.app/openrtb2/auction';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 300;

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY
  },

  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    // Basic tagging: use adUnitCode as tagid for traceability
    imp.tagid = bidRequest.adUnitCode;
    // Default to secure
    imp.secure = bidRequest.ortb2Imp?.secure ?? 1;
    // Pass through optional bidder param `bid` into imp.ext.mocktioneer.bid
    const userBidParam = bidRequest.params && bidRequest.params.bid;
    if (userBidParam != null) {
      const num = Number(userBidParam);
      if (!isNaN(num)) {
        imp.ext = imp.ext || {};
        imp.ext.mocktioneer = Object.assign({}, imp.ext.mocktioneer, { bid: num });
      }
    }
    return imp;
  },

  request(buildRequest, imps, bidderRequest, context) {
    const req = buildRequest(imps, bidderRequest, context);
    if (!req.cur) {
      req.cur = [DEFAULT_CURRENCY];
    }
    return req;
  },

  bidResponse(buildBidResponse, bid, context) {
    const br = buildBidResponse(bid, context);
    br.meta = br.meta || {};
    br.meta.advertiserDomains = bid.adomain || [];
    // Echo back bid param if present in bid.ext.mocktioneer.bid for debugging
    const echoedBid = bid.ext && bid.ext.mocktioneer && bid.ext.mocktioneer.bid;
    if (echoedBid != null) {
      br.meta.mocktioneer = Object.assign({}, br.meta.mocktioneer, { bid: echoedBid });
    }
    // Map banner/video rendering hints
    if (br.mediaType === BANNER) {
      br.ad = bid.adm;
      br.width = bid.w;
      br.height = bid.h;
    } else if (br.mediaType === VIDEO) {
      br.vastXml = bid.adm;
      br.width = bid.w;
      br.height = bid.h;
    }
    return br;
  }
});

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid(bid) {
    // Always valid; endpoint can be overridden via params.endpoint
    return !!bid;
  },

  buildRequests(bidRequests, bidderRequest) {
    if (!bidRequests || bidRequests.length === 0) return [];
    const data = converter.toORTB({ bidRequests, bidderRequest });

    // Endpoint selection: allow per-bid override; default to global
    const endpoint = deepAccess(bidRequests[0], 'params.endpoint') || DEFAULT_ENDPOINT;

    return {
      method: 'POST',
      url: endpoint,
      data,
      options: {
        contentType: 'application/json',
        withCredentials: false,
        crossOrigin: true
      },
      bidderRequest
    };
  },

  interpretResponse(response, request) {
    if (response && response.body) {
      return converter.fromORTB({ response: response.body, request: request.data }).bids;
    }
    return [];
  },

  getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
    // No user syncs provided by this mock adapter
    return [];
  }
};

registerBidder(spec);
