import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { isEmpty, getAdUnitSizes, parseSizesInput, deepAccess } from '../src/utils.js';

const BIDDER_CODE = 'ras';
const GET_ENDPOINT = (network) => `https://csr.onet.pl/${encodeURIComponent(network)}/csr-006/csr.json?`;
const VERSION = '1.0';

function parseParams(params) {
  const newParams = {};
  const pageContext = params.pageContext;
  if (!pageContext) {
    return {};
  }
  if (pageContext.dr) {
    newParams.dr = pageContext.dr
  }
  if (pageContext.dv) {
    newParams.DV = pageContext.dv
  }
  if (pageContext.keyWords && Array.isArray(pageContext.keyWords)) {
    newParams.kwrd = pageContext.keyWords.join('+')
  }
  if (pageContext.capping) {
    newParams.local_capping = pageContext.capping;
  }
  if (pageContext.keyValues && typeof pageContext.keyValues === 'object') {
    for (const param in pageContext.keyValues) {
      if (pageContext.keyValues.hasOwnProperty(param)) {
        const kvName = 'kv' + param;
        newParams[kvName] = pageContext.keyValues[param]
      }
    }
  }
  return newParams;
}

const buildBid = (ad) => {
  if (ad.type === 'empty') {
    return null;
  }
  return {
    requestId: ad.id,
    cpm: ad.bid_rate ? ad.bid_rate.toFixed(2) : 0,
    width: ad.width || 0,
    height: ad.height || 0,
    ttl: 300,
    creativeId: ad.adid ? parseInt(ad.adid.split(',')[2], 10) : 0,
    netRevenue: true,
    currency: ad.currency || 'USD',
    dealId: null,
    meta: {
      mediaType: BANNER
    },
    ad: ad.html || null
  };
};

const getContextParams = (bidRequests) => {
  const bid = bidRequests[0];
  const { params } = bid;
  const requestParams = {
    nid: encodeURIComponent(params.network),
    site: params.site,
    area: params.area,
    cre_format: 'html',
    systems: 'das',
    kvprver: VERSION,
    ems_url: 1,
    bid_rate: 1,
    ...parseParams(params)
  };
  return Object.keys(requestParams).map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(requestParams[key])).join('&');
};

const getSlots = (bidRequests) => {
  let queryString = '';
  const batchSize = bidRequests.length;
  for (let i = 0; i < batchSize; i++) {
    const adunit = bidRequests[i];
    const { slot } = adunit.params;
    const sizes = parseSizesInput(getAdUnitSizes(adunit)).join(',');
    queryString += `&slot${i}=${encodeURIComponent(slot)}&id${i}=${encodeURIComponent(adunit.bidId)}&composition${i}=CHILD`;
    queryString += sizes.length ? `&iusizes${i}=${encodeURIComponent(sizes)}` : ''
  }
  return queryString;
};

const getGdprParams = (bidderRequest) => {
  const gdprApplies = deepAccess(bidderRequest, 'gdprConsent.gdprApplies');
  let consentString = deepAccess(bidderRequest, 'gdprConsent.consentString');
  let queryString = '';
  if (gdprApplies !== undefined) {
    queryString += `&gdpr_applies=${encodeURIComponent(gdprApplies)}`;
  }
  if (consentString !== undefined) {
    queryString += `&euconsent=${encodeURIComponent(consentString)}`;
  }
  return queryString;
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bidRequest) {
    if (!bidRequest || !bidRequest.params || typeof bidRequest.params !== 'object') {
      return;
    }
    const { params } = bidRequest;
    return Boolean(params.network && params.site && params.area && params.slot);
  },

  buildRequests: function (bidRequests, bidderRequest) {
    const slotsQuery = getSlots(bidRequests);
    const contextQuery = getContextParams(bidRequests);
    const gdprQuery = getGdprParams(bidderRequest);
    const bidIds = bidRequests.map((bid) => ({ slot: bid.params.slot, bidId: bid.bidId }));
    const network = bidRequests[0].params.network;
    return [{
      method: 'GET',
      url: GET_ENDPOINT(network) + contextQuery + slotsQuery + gdprQuery,
      bidIds: bidIds
    }];
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse.body;
    if (!response || !response.ads || response.ads.length === 0) {
      return [];
    }
    return response.ads.map(buildBid).filter((bid) => !isEmpty(bid));
  }
};

registerBidder(spec);
