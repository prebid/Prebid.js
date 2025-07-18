import { deepAccess, getUniqueIdentifierStr } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const SUPPORTED_AD_TYPES = [BANNER];
const BIDDER_CODE = 'truereach';
const BIDDER_URL = 'https://ads-sg.momagic.com/exchange/openrtb25/';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  isBidRequestValid: function (bidRequest) {
    return (bidRequest.params.site_id &&
    deepAccess(bidRequest, 'mediaTypes.banner') && (deepAccess(bidRequest, 'mediaTypes.banner.sizes.length') > 0));
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }

    const queryParams = buildCommonQueryParamsFromBids(validBidRequests, bidderRequest);

    const siteId = deepAccess(validBidRequests[0], 'params.site_id');

    // TODO: should this use auctionId? see #8573
    // TODO: fix transactionId leak: https://github.com/prebid/Prebid.js/issues/9781
    const url = BIDDER_URL + siteId + '?hb=1&transactionId=' + validBidRequests[0].transactionId;

    return {
      method: 'POST',
      url: url,
      data: queryParams,
      options: { withCredentials: true }
    };
  },

  interpretResponse: function ({ body: serverResponse }, serverRequest) {
    const bidResponses = [];

    if ((!serverResponse || !serverResponse.id) ||
      (!serverResponse.seatbid || serverResponse.seatbid.length === 0 || !serverResponse.seatbid[0].bid || serverResponse.seatbid[0].bid.length === 0)) {
      return bidResponses;
    }

    const adUnits = serverResponse.seatbid[0].bid;
    const bidderBid = adUnits[0];

    const responseCPM = parseFloat(bidderBid.price);
    if (responseCPM === 0) {
      return bidResponses;
    }

    let responseAd = bidderBid.adm;

    if (bidderBid.nurl) {
      const responseNurl = '<img src="' + bidderBid.nurl + '" height="0px" width="0px">';
      responseAd += responseNurl;
    }

    const bidResponse = {
      requestId: bidderBid.impid,
      cpm: responseCPM,
      currency: serverResponse.cur || 'USD',
      width: parseInt(bidderBid.w),
      height: parseInt(bidderBid.h),
      ad: decodeURIComponent(responseAd),
      ttl: 180,
      creativeId: bidderBid.crid,
      netRevenue: false
    };
    if (bidderBid.adomain && bidderBid.adomain.length) {
      bidResponse.meta = {
        advertiserDomains: bidderBid.adomain,
      };
    }

    bidResponses.push(bidResponse);

    return bidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    var gdprParams = '';
    if (gdprConsent) {
      if (typeof gdprConsent.gdprApplies === 'boolean') {
        gdprParams = `?gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
      } else {
        gdprParams = `?gdpr_consent=${gdprConsent.consentString}`;
      }
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: 'https://ads-sg.momagic.com/jsp/usersync.jsp' + gdprParams
      });
    }
    return syncs;
  }

};

function buildCommonQueryParamsFromBids(validBidRequests, bidderRequest) {
  let adW = 0;
  let adH = 0;
  const adSizes = Array.isArray(validBidRequests[0].params.sizes) ? validBidRequests[0].params.sizes : validBidRequests[0].sizes;
  const sizeArrayLength = adSizes.length;
  if (sizeArrayLength === 2 && typeof adSizes[0] === 'number' && typeof adSizes[1] === 'number') {
    adW = adSizes[0];
    adH = adSizes[1];
  } else {
    adW = adSizes[0][0];
    adH = adSizes[0][1];
  }

  const domain = window.location.host;
  const page = window.location.host + window.location.pathname + location.search + location.hash;

  const defaultParams = {
    id: getUniqueIdentifierStr(),
    imp: [
      {
        id: validBidRequests[0].bidId,
        banner: {
          w: adW,
          h: adH
        }
      }
    ],
    site: {
      domain: domain,
      page: page
    },
    device: {
      ua: window.navigator.userAgent
    },
    tmax: bidderRequest.timeout
  };

  return defaultParams;
}

registerBidder(spec);
