import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'adman';
const AD_URL = 'https://pub.admanmedia.com/?c=o&m=multi';
const URL_SYNC = 'https://pub.admanmedia.com/?c=o&m=sync';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId ||
    !bid.ttl || !bid.currency) {
    return false;
  }
  switch (bid['mediaType']) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl);
    case NATIVE:
      return Boolean(bid.native && bid.native.title && bid.native.image && bid.native.impressionTrackers);
    default:
      return false;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.placementId));
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
    let winTop = window;
    let location;
    try {
      location = new URL(bidderRequest.refererInfo.referer)
      winTop = window.top;
    } catch (e) {
      location = winTop.location;
      utils.logMessage(e);
    };
    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': 1,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };
    request.language.indexOf('-') != -1 && (request.language = request.language.split('-')[0])
    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
      }
      if (bidderRequest.gdprConsent) {
        request.gdpr = bidderRequest.gdprConsent
      }
    }
    const len = validBidRequests.length;

    for (let i = 0; i < len; i++) {
      let bid = validBidRequests[i];
      let traff = bid.params.traffic || BANNER

      placements.push({
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        sizes: bid.mediaTypes && bid.mediaTypes[traff] && bid.mediaTypes[traff].sizes ? bid.mediaTypes[traff].sizes : [],
        traffic: traff
      });
      if (bid.schain) {
        placements.schain = bid.schain;
      }
    }
    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    serverResponse = serverResponse.body;
    for (let i = 0; i < serverResponse.length; i++) {
      let resItem = serverResponse[i];
      if (isBidResponseValid(resItem)) {
        response.push(resItem);
      }
    }
    return response;
  },

  getUserSyncs: (syncOptions, serverResponses) => {
    return [{
      type: 'image',
      url: URL_SYNC
    }];
  }

};

registerBidder(spec);
