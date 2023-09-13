import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { isEmpty, getAdUnitSizes, parseSizesInput, deepAccess } from '../src/utils.js';
import {getAllOrtbKeywords} from '../libraries/keywords/keywords.js';

const BIDDER_CODE = 'ras';
const VERSION = '1.0';

const getEndpoint = (network) => {
  return `https://csr.onet.pl/${encodeURIComponent(network)}/csr-006/csr.json?nid=${encodeURIComponent(network)}&`;
};

function parseParams(params, bidderRequest) {
  const newParams = {};
  if (params.customParams && typeof params.customParams === 'object') {
    for (const param in params.customParams) {
      if (params.customParams.hasOwnProperty(param)) {
        newParams[param] = params.customParams[param];
      }
    }
  }
  const du = deepAccess(bidderRequest, 'refererInfo.page');
  const dr = deepAccess(bidderRequest, 'refererInfo.ref');
  if (du) {
    newParams.du = du;
  }
  if (dr) {
    newParams.dr = dr;
  }
  const pageContext = params.pageContext;
  if (!pageContext) {
    return newParams;
  }
  if (pageContext.du) {
    newParams.du = pageContext.du;
  }
  if (pageContext.dr) {
    newParams.dr = pageContext.dr;
  }
  if (pageContext.dv) {
    newParams.DV = pageContext.dv;
  }
  const keywords = getAllOrtbKeywords(bidderRequest?.ortb2, pageContext.keyWords)
  if (keywords.length > 0) {
    newParams.kwrd = keywords.join('+')
  }
  if (pageContext.capping) {
    newParams.local_capping = pageContext.capping;
  }
  if (pageContext.keyValues && typeof pageContext.keyValues === 'object') {
    for (const param in pageContext.keyValues) {
      if (pageContext.keyValues.hasOwnProperty(param)) {
        const kvName = 'kv' + param;
        newParams[kvName] = pageContext.keyValues[param];
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

const getContextParams = (bidRequests, bidderRequest) => {
  const bid = bidRequests[0];
  const { params } = bid;
  const requestParams = {
    site: params.site,
    area: params.area,
    cre_format: 'html',
    systems: 'das',
    kvprver: VERSION,
    ems_url: 1,
    bid_rate: 1,
    ...parseParams(params, bidderRequest)
  };
  return Object.keys(requestParams).map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(requestParams[key])).join('&');
};

const getSlots = (bidRequests) => {
  let queryString = '';
  const batchSize = bidRequests.length;
  for (let i = 0; i < batchSize; i++) {
    const adunit = bidRequests[i];
    const slotSequence = deepAccess(adunit, 'params.slotSequence');

    const sizes = parseSizesInput(getAdUnitSizes(adunit)).join(',');

    queryString += `&slot${i}=${encodeURIComponent(adunit.params.slot)}&id${i}=${encodeURIComponent(adunit.bidId)}&composition${i}=CHILD`;

    if (sizes.length) {
      queryString += `&iusizes${i}=${encodeURIComponent(sizes)}`;
    }
    if (slotSequence !== undefined) {
      queryString += `&pos${i}=${encodeURIComponent(slotSequence)}`;
    }
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

const parseAuctionConfigs = (serverResponse, bidRequest) => {
  if (isEmpty(serverResponse) || isEmpty(bidRequest)) {
    return null;
  }
  let auctionConfigs = [];
  const bidConfigs = Object.fromEntries(bidRequest.bidIds.map(x => [x.bidId, x]));

  serverResponse.ads.filter(bid => bidConfigs.hasOwnProperty(bid.id) && bidConfigs[bid.id].fledgeEnabled).forEach((bid) => {
    auctionConfigs.push({
      'bidId': bidConfigs[bid.id].bidId,
      'config': {
        'seller': 'https://csr.onet.pl',
        'decisionLogicUrl': `https://csr.onet.pl/${bidConfigs[bid.id].network}/v1/protected-audience-api/decision-logic.js`,
        'interestGroupBuyers': ['https://csr.onet.pl'],
        'auctionSignals': {
          'site': bidConfigs[bid.id].site,
          'kvismobile': bidConfigs[bid.id].isMobile,
          'iusizes': bidConfigs[bid.id].iusizes
        }
      }
    });
  });

  if (auctionConfigs.length === 0) {
    return null;
  } else {
    return auctionConfigs;
  }
}

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
    const contextQuery = getContextParams(bidRequests, bidderRequest);
    const gdprQuery = getGdprParams(bidderRequest);
    const fledgeEligible = Boolean(bidderRequest && bidderRequest.fledgeEnabled);
    const network = bidRequests[0].params.network;
    const bidIds = bidRequests.map((bid) => ({
      slot: bid.params.slot,
      bidId: bid.bidId,
      network: network,
      site: bid.params.site,
      isMobile: Boolean(bid.params.pageContext?.keyValues?.ismobile),
      iusizes: getAdUnitSizes(bid),
      fledgeEnabled: fledgeEligible
    }));

    return [{
      method: 'GET',
      url: getEndpoint(network) + contextQuery + slotsQuery + gdprQuery,
      bidIds: bidIds
    }];
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse.body;
    if (!response || !response.ads || response.ads.length === 0) {
      return [];
    }

    const fledgeAuctionConfigs = parseAuctionConfigs(response, bidRequest);
    const bids = response.ads.map(buildBid).filter((bid) => !isEmpty(bid));

    if (fledgeAuctionConfigs) {
      // Return a tuple of bids and auctionConfigs. It is possible that bids could be null.
      return {bids, fledgeAuctionConfigs};
    } else {
      return bids;
    }
  }
};

registerBidder(spec);
