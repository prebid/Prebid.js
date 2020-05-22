import {registerBidder} from '../src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes';
import * as utils from '../src/utils';

const BIDDER_CODE = 'smartyads';
const URL = '//ssp-nj.webtradehub.com/?c=o&m=multi';
const URL_SYNC = '//ssp-nj.webtradehub.com/?c=o&m=cookie';

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
      return Boolean(bid.title && bid.image && bid.impressionTrackers);
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

  buildRequests: (validBidRequests = []) => {
    let winTop = window;
    try {
      window.top.location.toString();
      winTop = window.top;
    } catch (e) {
      utils.logMessage(e);
    }
    let location = utils.getTopWindowLocation();
    let placements = [];
    let request = {
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'language': (navigator && navigator.language) ? navigator.language : '',
      'secure': location.protocol === 'https:' ? 1 : 0,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };
    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      let bid = validBidRequests[i];
      placements.push({
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        traffic: bid.params.traffic || BANNER
      });
    }
    return {
      method: 'POST',
      url: URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    serverResponse = serverResponse.body;
    for (let i = 0; i < serverResponse.length; i++) {
      let resItem = serverResponse[i];
      if (isBidResponseValid(resItem)) {
        delete resItem.mediaType;
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
