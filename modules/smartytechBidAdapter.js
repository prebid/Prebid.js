import {buildUrl, deepAccess} from '../src/utils.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'smartytech';
export const ENDPOINT_PROTOCOL = 'https';
export const ENDPOINT_DOMAIN = 'server.smartytech.io';
export const ENDPOINT_PATH = '/hb/v2/bidder';

export const spec = {
  supportedMediaTypes: [ BANNER, VIDEO ],
  code: BIDDER_CODE,

  isBidRequestValid: function (bidRequest) {
    return (
      !!parseInt(bidRequest.params.endpointId) &&
      spec._validateBanner(bidRequest) &&
      spec._validateVideo(bidRequest)
    );
  },

  _validateBanner: function(bidRequest) {
    const bannerAdUnit = deepAccess(bidRequest, 'mediaTypes.banner');

    if (bannerAdUnit === undefined) {
      return true;
    }

    if (!Array.isArray(bannerAdUnit.sizes)) {
      return false;
    }

    return true;
  },

  _validateVideo: function(bidRequest) {
    const videoAdUnit = deepAccess(bidRequest, 'mediaTypes.video');

    if (videoAdUnit === undefined) {
      return true;
    }

    if (!Array.isArray(videoAdUnit.playerSize)) {
      return false;
    }

    if (!videoAdUnit.context) {
      return false;
    }

    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const referer = bidderRequest?.refererInfo?.page || window.location.href;

    const bidRequests = validBidRequests.map((validBidRequest) => {
      let video = deepAccess(validBidRequest, 'mediaTypes.video', false);
      let banner = deepAccess(validBidRequest, 'mediaTypes.banner', false);
      let sizes = validBidRequest.params.sizes;

      let oneRequest = {
        endpointId: validBidRequest.params.endpointId,
        adUnitCode: validBidRequest.adUnitCode,
        referer: referer,
        bidId: validBidRequest.bidId
      };

      if (video) {
        oneRequest.video = video;

        if (sizes) {
          oneRequest.video.sizes = sizes;
        }
      } else if (banner) {
        oneRequest.banner = banner;

        if (sizes) {
          oneRequest.banner.sizes = sizes;
        }
      }

      return oneRequest
    });

    let adPartnerRequestUrl = buildUrl({
      protocol: ENDPOINT_PROTOCOL,
      hostname: ENDPOINT_DOMAIN,
      pathname: ENDPOINT_PATH,
    });

    return {
      method: 'POST',
      url: adPartnerRequestUrl,
      data: bidRequests
    };
  },

  interpretResponse: function (serverResponse, bidRequest) {
    if (typeof serverResponse.body === 'undefined') {
      return [];
    }

    const validBids = bidRequest.data;
    const keys = Object.keys(serverResponse.body)
    const responseBody = serverResponse.body;

    return keys.filter(key => {
      return responseBody[key].ad
    }).map(key => {
      return {
        bid: validBids.find(b => b.adUnitCode === key),
        response: responseBody[key]
      }
    }).map(item => spec._adResponse(item.bid, item.response));
  },

  _adResponse: function (request, response) {
    const bidObject = {
      requestId: request.bidId,
      adUnitCode: request.adUnitCode,
      ad: response.ad,
      cpm: response.cpm,
      width: response.width,
      height: response.height,
      ttl: 60,
      creativeId: response.creativeId,
      netRevenue: true,
      currency: response.currency,
      mediaType: BANNER
    }

    if (response.mediaType === VIDEO) {
      bidObject.vastXml = response.ad;
      bidObject.mediaType = VIDEO;
    }

    return bidObject;
  },

}

registerBidder(spec);
