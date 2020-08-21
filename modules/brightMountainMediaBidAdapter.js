import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'brightmountainmedia';
const AD_URL = 'https://console.brightmountainmedia.com/hb/bid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.placement_id);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
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
    if (bidderRequest) {
      if (bidderRequest.gdprConsent) {
        request.gdpr_consent = bidderRequest.gdprConsent.consentString || 'ALL'
        request.gdpr_require = bidderRequest.gdprConsent.gdprApplies ? 1 : 0
      }
    }
    for (let i = 0; i < validBidRequests.length; i++) {
      let bid = validBidRequests[i];
      let traff = bid.params.traffic || BANNER
      let placement = {
        placementId: bid.params.placement_id,
        bidId: bid.bidId,
        sizes: bid.mediaTypes[traff].sizes,
        traffic: traff
      };
      if (bid.schain) {
        placement.schain = bid.schain;
      }
      placements.push(placement);
    }
    return {
      method: 'POST',
      url: AD_URL,
      data: request
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    try {
      serverResponse = serverResponse.body;
      for (let i = 0; i < serverResponse.length; i++) {
        let resItem = serverResponse[i];

        response.push(resItem);
      }
    } catch (e) {
      utils.logMessage(e);
    };
    return response;
  },

  getUserSyncs: (syncOptions) => {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://console.brightmountainmedia.com:4444/cookieSync'
      }];
    }
  },

};

registerBidder(spec);
