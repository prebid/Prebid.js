import {registerBidder} from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'cleanmedianet';
const AD_URL = 'https://cleanmediaads.com/bidr/p.ashx';


function isBidResponseValid(bid) {
  if (!bid.bidderRequest || !bid.price || !bid.adId) {
    return false;
  }
  switch (bid['mediaType']) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.adm);
    case VIDEO:
      return Boolean(bid.vastUrl);
    default:
      return false;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.supplyPartnerId));
  },

  buildRequests: (validBidRequests = [], bidderRequest) => {
   return {
      method: 'POST',
      url: AD_URL,
      data: bidderRequest,
      options: {
        withCredentials: false,
        crossOrigin: true
      }
    };
  },

  interpretResponse: (serverResponse) => {
    let response = [];
    serverResponse = serverResponse.body.bid;
    for (let i = 0; i < serverResponse.length; i++) {
      let resItem = serverResponse[i];
      if (isBidResponseValid(resItem)) {
         let bidResponse = {
          requestId: resItem.bidderRequest,
          bidderCode: BIDDER_CODE,
          bidder: BIDDER_CODE,
          cpm: parseFloat(resItem.price),
          width: resItem.width,
          height: resItem.height,
          creativeId: resItem.crid || resItem.adId,
          currency: 'USD',
          netRevenue: true,
          ttl: 350,
          mediaType: resItem.mediaType || 'banner'
        };

        if (bidResponse.mediaType === 'video') {
          bidResponse.vastUrl = resItem.vastUrl;
          bidResponse.ttl = 600;
        } else {
          bidResponse.ad = resItem.adm;
        }
		response.push(bidResponse);
      }
    }
    return response;
  },

  getUserSyncs: (syncOptions, serverResponses) => {
    return [];
  }

};

registerBidder(spec);
