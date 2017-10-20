import {logError, getTopWindowLocation} from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';

export const spec = {

  code: 'somoaudience',

  aliases: ['somo'],

  supportedMediaTypes: ['banner'],

  isBidRequestValid: bid => (
    !!(bid && bid.params && bid.params.placementId)
  ),

  buildRequests: function(bidRequests) {
    logError('bidRequests', 'ERROR', bidRequests);
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
  if(typeof bidRequest != 'undefined' && typeof bidRequest.bidRequest != 'undefined' && typeof bidRequest.bidRequest.bidId != 'undefined') {
    bidId = bidRequest.bidRequest.bidId;
  }
  if (bidResponse) {
    let bidData = bidResponse.body.seatbid[0].bid[0];
    const bid = {
      requestId: bidId,
      cpm: bidData.price,
      width: bidData.w,
      height: bidData.h,
      ad: bidData.adm,
      ttl: 360,
      creativeId: bidData.crid,
      creative_id: bidData.crid,
      ad_id: bidId,
      adid: bidId,
      adId: bidId,
      netRevenue: false,
      currency: 'USD',
    };
    logError('bidResponseAvailable', 'ERROR', bidResponses);
    bidResponses.push(bid);
  }
  return bidResponses;
}

function openRtbRequest(bidRequest) {
  logError('openRtbRequest', 'ERROR', bidRequest);
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
      ref: getReferrer(),
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

function getReferrer() {
  try {
    return window.top.document.referrer;
  } catch (e) {
    return document.referrer;
  }
}

function openRtbDevice() {
  return {
    ua: navigator.userAgent,
    language: (navigator.language || navigator.browserLanguage || navigator.userLanguage || navigator.systemLanguage),
  };
}

registerBidder(spec);
