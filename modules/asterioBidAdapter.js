import { registerBidder } from '../src/adapters/bidderFactory.js';
import { deepAccess, deepClone } from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'asterio';
export const ENDPOINT = 'https://bid.asterio.ai/prebid/bid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],

  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.adUnitToken);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const bids = validBidRequests.map(bidRequest => ({
      bidId: bidRequest.bidId,
      adUnitToken: bidRequest.params.adUnitToken,
      pos: getPosition(bidRequest),
      sizes: prepareSizes(bidRequest.sizes)
    }));

    const payload = {
      requestId: bidderRequest.bidderRequestId,
      bids,
      referer: bidderRequest.refererInfo?.page,
      schain: validBidRequests[0]?.ortb2?.source?.ext?.schain
    };

    if (bidderRequest?.gdprConsent) {
      payload.gdprConsent = {
        consentRequired: typeof bidderRequest.gdprConsent.gdprApplies === 'boolean' ? bidderRequest.gdprConsent.gdprApplies : false,
        consentString: bidderRequest.gdprConsent.consentString
      };
    }

    return {
      method: 'POST',
      url: ENDPOINT,
      data: payload,
      options: {
        contentType: 'text/plain',
        customHeaders: {
          'Rtb-Direct': true
        }
      }
    };
  },

  interpretResponse: function (serverResponse, _request) {
    const serverBody = serverResponse.body;
    if (!serverBody || typeof serverBody !== 'object' || !Array.isArray(serverBody.bids)) {
      return [];
    }

    return serverBody.bids.map(bidResponse => {
      const bid = deepClone(bidResponse);

      bid.cpm = parseFloat(bidResponse.cpm);
      bid.requestId = bidResponse.requestId;
      bid.ad = bidResponse.ad;
      bid.width = bidResponse.width;
      bid.height = bidResponse.height;
      bid.currency = bidResponse.currency || 'USD';
      bid.netRevenue = typeof bidResponse.netRevenue === 'boolean' ? bidResponse.netRevenue : true;
      bid.ttl = bidResponse.ttl;
      bid.creativeId = bidResponse.creativeId;
      bid.mediaType = bidResponse.mediaType || bidResponse.format || 'banner';

      if (VIDEO === bid.mediaType && bidResponse.ad) {
        bid.vastXml = bidResponse.ad;
      }

      bid.meta = {};
      bid.meta.advertiserDomains = bid.adomain || [];

      return bid;
    });
  },

  onBidWon: function (bid) {
    if (bid.winUrl) {
      const winUrl = bid.winUrl.replace(/\$\{AUCTION_PRICE}/, bid.cpm);
      ajax(winUrl, null);
      return true;
    }
    return false;
  }
};

function prepareSizes(sizes) {
  if (!Array.isArray(sizes) || sizes.length === 0) {
    return [];
  }
  const normalizedSizes = typeof sizes[0] === 'number' ? [sizes] : sizes;
  return normalizedSizes.map(size => ({ width: size[0], height: size[1] }));
}

function getPosition(bidRequest) {
  return bidRequest.params.pos ?? deepAccess(bidRequest, 'mediaTypes.banner.pos') ?? deepAccess(bidRequest, 'mediaTypes.video.pos');
}

registerBidder(spec);
