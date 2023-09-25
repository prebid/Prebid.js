import {registerBidder} from '../src/adapters/bidderFactory.js';
import {triggerPixel} from '../src/utils.js';
import {NATIVE, BANNER} from '../src/mediaTypes.js';
import {config} from '../src/config.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';

const BIDDER_CODE = 'adrino';
const REQUEST_METHOD = 'POST';
const BIDDER_HOST = 'https://prd-prebid-bidder.adrino.io';
const GVLID = 1072;

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [NATIVE, BANNER],

  getBidderConfig: function (property) {
    return config.getConfig(`${BIDDER_CODE}.${property}`);
  },

  isBidRequestValid: function (bid) {
    return !!(bid.bidId) &&
      !!(bid.params) &&
      !!(bid.params.hash) &&
      (typeof bid.params.hash === 'string') &&
      !!(bid.mediaTypes) &&
      (Object.keys(bid.mediaTypes).includes(NATIVE) || Object.keys(bid.mediaTypes).includes(BANNER)) &&
      (bid.bidder === BIDDER_CODE);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    // convert Native ORTB definition to old-style prebid native definition
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    let bids = [];
    for (let i = 0; i < validBidRequests.length; i++) {
      let requestData = {
        adUnitCode: validBidRequests[i].adUnitCode,
        bidId: validBidRequests[i].bidId,
        placementHash: validBidRequests[i].params.hash,
        userId: validBidRequests[i].userId,
        referer: bidderRequest.refererInfo.page,
        userAgent: navigator.userAgent,
      }

      if (validBidRequests[i].sizes != null && validBidRequests[i].sizes.length > 0) {
        requestData.bannerParams = { sizes: validBidRequests[i].sizes };
      }

      if (validBidRequests[i].nativeParams != null) {
        requestData.nativeParams = validBidRequests[i].nativeParams;
      }

      if (bidderRequest && bidderRequest.gdprConsent) {
        requestData.gdprConsent = {
          consentString: bidderRequest.gdprConsent.consentString,
          consentRequired: bidderRequest.gdprConsent.gdprApplies
        }
      }

      bids.push(requestData);
    }

    let host = this.getBidderConfig('host') || BIDDER_HOST;
    let bidRequests = [];
    bidRequests.push({
      method: REQUEST_METHOD,
      url: host + '/bidder/bids/',
      data: bids,
      options: {
        contentType: 'application/json',
        withCredentials: false,
      }
    });

    return bidRequests;
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const response = serverResponse.body;
    const output = [];

    if (response.bidResponses) {
      for (const bidResponse of response.bidResponses) {
        if (!bidResponse.noAd) {
          output.push(bidResponse);
        }
      }
    }

    return output;
  },

  onBidWon: function (bid) {
    if (bid['requestId']) {
      let host = this.getBidderConfig('host') || BIDDER_HOST;
      triggerPixel(host + '/bidder/won/' + bid['requestId']);
    }
  }
};

registerBidder(spec);
