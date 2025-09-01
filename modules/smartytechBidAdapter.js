import {buildUrl, deepAccess, isArray} from '../src/utils.js'
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {config} from '../src/config.js';

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
      const video = deepAccess(validBidRequest, 'mediaTypes.video', false);
      const banner = deepAccess(validBidRequest, 'mediaTypes.banner', false);
      const sizes = validBidRequest.params.sizes;

      const oneRequest = {
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

      // Add user IDs if available
      const userIds = deepAccess(validBidRequest, 'userIdAsEids');
      if (userIds && isArray(userIds) && userIds.length > 0) {
        oneRequest.userIds = userIds;
      }

      // Add GDPR consent if available
      if (bidderRequest && bidderRequest.gdprConsent) {
        oneRequest.gdprConsent = {
          gdprApplies: bidderRequest.gdprConsent.gdprApplies,
          consentString: bidderRequest.gdprConsent.consentString || ''
        };

        if (bidderRequest.gdprConsent.addtlConsent) {
          oneRequest.gdprConsent.addtlConsent = bidderRequest.gdprConsent.addtlConsent;
        }
      }

      // Add CCPA/USP consent if available
      if (bidderRequest && bidderRequest.uspConsent) {
        oneRequest.uspConsent = bidderRequest.uspConsent;
      }

      // Add GPP consent if available
      if (bidderRequest && bidderRequest.gppConsent) {
        oneRequest.gppConsent = {
          gppString: bidderRequest.gppConsent.gppString,
          applicableSections: bidderRequest.gppConsent.applicableSections
        };
      }

      // Add COPPA flag if configured
      const coppa = config.getConfig('coppa');
      if (coppa) {
        oneRequest.coppa = coppa;
      }

      return oneRequest
    });

    const adPartnerRequestUrl = buildUrl({
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
      mediaType: BANNER,
      meta: {}
    };

    if (response.mediaType === VIDEO) {
      bidObject.vastXml = response.ad;
      bidObject.mediaType = VIDEO;
    }

    if (response.meta) {
      bidObject.meta = response.meta;
    }

    return bidObject;
  },

}

registerBidder(spec);
