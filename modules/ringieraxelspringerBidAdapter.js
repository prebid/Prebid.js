import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import {
  isEmpty,
  parseSizesInput,
  deepAccess
} from '../src/utils.js';
import { getAllOrtbKeywords } from '../libraries/keywords/keywords.js';
import { getAdUnitSizes } from '../libraries/sizeUtils/sizeUtils.js';

const BIDDER_CODE = 'ringieraxelspringer';
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
  if (bidderRequest?.ortb2?.regs?.ext?.dsa?.required !== undefined) {
    newParams.dsainfo = bidderRequest?.ortb2?.regs?.ext?.dsa?.required;
  }
  return newParams;
}

function parseNativeResponse(ad) {
  if (!(ad.data?.fields && ad.data?.meta)) {
    return false;
  }

  const { thirdPartyClickTracker2, imp, impression, impression1, impressionJs1, image, Image, title, leadtext, url, Calltoaction, Body, Headline, Thirdpartyclicktracker, adInfo, partner_logo: partnerLogo } = ad.data.fields;
  const { dsaurl, height, width, adclick } = ad.data.meta;
  const emsLink = ad.ems_link;
  const link = adclick + (url || Thirdpartyclicktracker);
  const nativeResponse = {
    sendTargetingKeys: false,
    title: title || Headline || '',
    image: {
      url: image || Image || '',
      width,
      height
    },
    icon: {
      url: partnerLogo || '',
      width,
      height
    },
    clickUrl: link,
    cta: Calltoaction || '',
    body: leadtext || Body || '',
    body2: adInfo || '',
    sponsoredBy: deepAccess(ad, 'data.meta.advertiser_name', null) || '',
  };

  nativeResponse.impressionTrackers = [emsLink, imp, impression, impression1].filter(Boolean);
  nativeResponse.javascriptTrackers = [impressionJs1].map(url => url ? `<script async src=${url}></script>` : null).filter(Boolean);
  nativeResponse.clickTrackers = [thirdPartyClickTracker2].filter(Boolean);

  if (dsaurl) {
    nativeResponse.privacyLink = dsaurl;
  }

  return nativeResponse
}

const buildBid = (ad, mediaType) => {
  if (ad.type === 'empty' || mediaType === undefined) {
    return null;
  }

  const data = {
    requestId: ad.id,
    cpm: ad.bid_rate ? ad.bid_rate.toFixed(2) : 0,
    ttl: 300,
    creativeId: ad.adid ? parseInt(ad.adid.split(',')[2], 10) : 0,
    netRevenue: true,
    currency: ad.currency || 'USD',
    dealId: ad.prebid_deal || null,
    actgMatch: ad.actg_match || 0,
    meta: { mediaType: BANNER },
    mediaType: BANNER,
    ad: ad.html || null,
    width: ad.width || 0,
    height: ad.height || 0
  }

  if (ad.type === 'native') {
    data.meta = { mediaType: NATIVE };
    data.mediaType = NATIVE;
    data.native = parseNativeResponse(ad) || {};

    delete data.ad;
  }

  return data;
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
    const creFormats = getAdUnitCreFormats(adunit);
    const sizes = parseSizesInput(getAdUnitSizes(adunit))?.filter(Boolean);

    if (creFormats.includes('native') && sizes?.indexOf('fluid') === -1) {
      sizes.push('fluid');
    }

    queryString += `&slot${i}=${encodeURIComponent(adunit.params.slot)}&id${i}=${encodeURIComponent(adunit.bidId)}&composition${i}=CHILD`;

    queryString += `&cre_format${i}=${encodeURIComponent(creFormats.join())}`;

    // change 'html' format to 'banner'
    queryString += `&kvhb_format${i}=${encodeURIComponent(creFormats.map(format => format === 'html' ? 'banner' : format).join())}`;

    if (Array.isArray(sizes)) {
      queryString += `&iusizes${i}=${encodeURIComponent(sizes.join(','))}`;
    }

    if (slotSequence !== undefined && slotSequence !== null) {
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
  if (isEmpty(bidRequest)) {
    return null;
  }
  const auctionConfigs = [];
  const gctx = serverResponse && serverResponse.body?.gctx;

  bidRequest.bidIds.filter(bid => bid.fledgeEnabled).forEach((bid) => {
    auctionConfigs.push({
      'bidId': bid.bidId,
      'config': {
        'seller': 'https://csr.onet.pl',
        'decisionLogicUrl': `https://csr.onet.pl/${encodeURIComponent(bid.params.network)}/v1/protected-audience-api/decision-logic.js`,
        'interestGroupBuyers': ['https://csr.onet.pl'],
        'auctionSignals': {
          'params': bid.params,
          'sizes': bid.sizes,
          'gctx': gctx
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

const getAdUnitCreFormats = (adUnit) => {
  if (!adUnit) {
    return;
  }

  let creFormats = [];

  if (adUnit.mediaTypes) {
    if (adUnit.mediaTypes.banner) {
      creFormats.push('html');
    }

    if (adUnit.mediaTypes.native) {
      creFormats.push('native');
    }
  }

  return creFormats;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],

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
      sizes: getAdUnitSizes(bid),
      params: bid.params,
      fledgeEnabled: fledgeEligible,
      mediaType: (bid.mediaTypes && bid.mediaTypes.banner) ? 'display' : NATIVE
    }));

    return [{
      method: 'GET',
      url: getEndpoint(network) + contextQuery + slotsQuery + gdprQuery,
      bidIds: bidIds
    }];
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse.body;
    const fledgeAuctionConfigs = parseAuctionConfigs(serverResponse, bidRequest);
    const bids = (!response || !response.ads || response.ads.length === 0) ? [] : response.ads.map((ad, index) => buildBid(
      ad,
      bidRequest?.bidIds?.[index]?.mediaType || 'banner'
    )).filter((bid) => !isEmpty(bid));

    if (fledgeAuctionConfigs) {
      // Return a tuple of bids and auctionConfigs. It is possible that bids could be null.
      return {bids, fledgeAuctionConfigs};
    } else {
      return bids;
    }
  }
};

registerBidder(spec);
