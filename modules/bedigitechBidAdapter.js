import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { _each, isArray } from '../src/utils.js';

const BEDIGITECH_CODE = 'bedigitech';
const BEDIGITECH_ENDPOINT = 'https://bedigitalhb.s3.amazonaws.com/hb.js';
const BEDIGITECH_REQUEST_METHOD = 'GET';
const BEDIGITECH_CURRENCY = 'USD';

function interpretResponse(placementResponse, bidRequest, bids) {
  const bid = {
    id: placementResponse.id,
    requestId: placementResponse.requestId,
    cpm: placementResponse.cpm,
    ad: decodeURIComponent(placementResponse.ad),
    width: placementResponse.width || 0,
    height: placementResponse.height || 0,
    currency: placementResponse.currency || BEDIGITECH_CURRENCY,
    ttl: placementResponse.ttl || 300,
    creativeId: placementResponse.creativeId || 0,
    meta: {
      mediaType: BANNER,
    },
  };
  bids.push(bid);
}

export const spec = {
  code: BEDIGITECH_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  isBidRequestValid: bid => {
    return !!bid.params.placementId && !!bid.bidId && bid.bidder === 'bedigitech'
  },

  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map(bid => {
      let url = BEDIGITECH_ENDPOINT;
      const data = {'pid': bid.params.placementId};

      return {
        method: BEDIGITECH_REQUEST_METHOD,
        url,
        data,
        options: {
          contentType: 'application/json',
          withCredentials: false,
          crossOrigin: true,
        },
      };
    });
  },

  interpretResponse: function(serverResponse, bidRequest) {
    let bids = [];

    if (isArray(serverResponse.body)) {
      _each(serverResponse.body, function(placementResponse) {
        interpretResponse(placementResponse, bidRequest, bids);
      });
    }

    return bids;
  },

};

registerBidder(spec);
