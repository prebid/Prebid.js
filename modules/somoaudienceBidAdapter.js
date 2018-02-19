import {getTopWindowReferrer, getTopWindowLocation} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

export const spec = {

  code: 'somoaudience',

  aliases: ['somo'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.placementId)
  ),

  buildRequests: function(bidRequests) {
    return bidRequests.map(bidRequest => {
      return {
        method: 'POST',
        url: '//publisher-east.mobileadtrading.com/rtb/bid?s=' + bidRequest.params.placementId.toString(),
        data: openRtbRequest(bidRequest),
        bidRequest: bidRequest
      };
    });
  },

  interpretResponse(response, request) {
    return bidResponseAvailable(request, response);
  }
};

function bidResponseAvailable(bidRequest, bidResponse) {
  let bidResponses = [];
  let bidId = 1;
  if (typeof bidRequest != 'undefined' && typeof bidRequest.bidRequest != 'undefined' && typeof bidRequest.bidRequest.bidId != 'undefined') {
    bidId = bidRequest.bidRequest.bidId;
  }
  if (bidResponse.body) {
    let bidData = bidResponse.body.seatbid[0].bid[0];
    const bid = {
      requestId: bidId,
      cpm: bidData.price,
      width: bidData.w,
      height: bidData.h,
      ad: bidData.adm,
      ttl: 360,
      creativeId: bidData.crid,
      adId: bidId,
      netRevenue: false,
      currency: 'USD',
    };
    bidResponses.push(bid);
  }
  return bidResponses;
}

function openRtbRequest(bidRequest) {
  return {
    id: bidRequest.bidderRequestId,
    imp: [openRtbImpression(bidRequest)],
    at: 1,
    tmax: 400,
    site: openRtbSite(bidRequest),
    app: openRtbApp(bidRequest),
    device: openRtbDevice()
  };
}

function openRtbImpression(bidRequest) {
  return {
    id: bidRequest.bidId,
    banner: {}
  };
}

function isApp(bidRequest) {
  if (bidRequest.params.app) {
    return true;
  } else {
    return false;
  }
}

function openRtbSite(bidRequest) {
  if (!isApp(bidRequest)) {
    const pageUrl = getTopWindowLocation().href;
    const domain = getTopWindowLocation().hostname;
    return {
      ref: getTopWindowReferrer(),
      page: pageUrl,
      domain: domain
    }
  } else {
    return null;
  }
}

function openRtbApp(bidRequest) {
  if (isApp(bidRequest)) {
    const appParams = bidRequest.params.app;
    return {
      bundle: appParams.bundle ? appParams.bundle : null,
      storeurl: appParams.storeUrl ? appParams.storeUrl : null,
      domain: appParams.domain ? appParams.domain : null,
      name: appParams.name ? appParams.name : null,
    }
  } else {
    return null;
  }
}

function openRtbDevice() {
  return {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
  };
}

registerBidder(spec);
