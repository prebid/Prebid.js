import {registerBidder} from '../src/adapters/bidderFactory.js';
import {triggerPixel} from '../src/utils.js';
import {NATIVE} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'adrino';
const REQUEST_METHOD = 'POST';
const BIDDER_HOST = 'https://prd-prebid-bidder.adrino.io';
const GVLID = 1072;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [NATIVE],

  getBidderConfig: function (property) {
    return config.getConfig(`${BIDDER_CODE}.${property}`);
  },

  isBidRequestValid: function (bid) {
    return !!(bid.bidId) &&
      !!(bid.params) &&
      !!(bid.params.hash) &&
      (typeof bid.params.hash === 'string') &&
      !!(bid.mediaTypes) &&
      Object.keys(bid.mediaTypes).includes(NATIVE) &&
      (bid.bidder === BIDDER_CODE);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
    const bidRequests = [];

    for (let i = 0; i < validBidRequests.length; i++) {
      let host = this.getBidderConfig('host') || BIDDER_HOST;

      let requestData = {
        bidId: validBidRequests[i].bidId,
        nativeParams: validBidRequests[i].nativeParams,
        placementHash: validBidRequests[i].params.hash,
        userId: validBidRequests[i].userId,
        referer: bidderRequest.refererInfo.page,
        userAgent: navigator.userAgent,
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        requestData.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: bidderRequest.gdprConsent.gdprApplies
        }
      }

      bidRequests.push({
        method: REQUEST_METHOD,
        url: host + '/bidder/bid/',
        data: requestData,
        options: {
          contentType: 'application/json',
          withCredentials: false,
        }
      });
    }

    return bidRequests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse.body;
    const bidResponses = [];
    if (!response.noAd) {
      bidResponses.push(response);
    }
    return bidResponses;
  },

  onBidWon: function (bid) {
    if (bid['requestId']) {
      let host = this.getBidderConfig('host') || BIDDER_HOST;
      triggerPixel(host + '/bidder/won/' + bid['requestId']);
    }
  }
};

registerBidder(spec);
