import {BANNER, NATIVE} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {_each, isArray} from '../src/utils.js';

const BEDIGITECH_CODE = 'bedigitech';
const BEDIGITECH_ENDPOINT = 'https://bid.bedigitech.com/bid/pub_bid.php';
const BEDIGITECH_REQUEST_METHOD = 'GET';
const BEDIGITECH_CURRENCY = 'USD';
let requestId = '';
function interpretResponse(placementResponse, bids) {
  const bid = {
    id: placementResponse.id,
    requestId: requestId || placementResponse.id,
    bidderCode: 'bedigitech',
    cpm: placementResponse.cpm,
    ad: decodeURIComponent(placementResponse.ad),
    width: placementResponse.width || 0,
    height: placementResponse.height || 0,
    currency: placementResponse.currency || BEDIGITECH_CURRENCY,
    ttl: placementResponse.ttl || 300,
    creativeId: placementResponse.crid,
    requestTimestamp: placementResponse.requestTime,
    timeToRespond: placementResponse.timeToRespond || 300,
    netRevenue: placementResponse.netRevenue,
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
    requestId = '';
    requestId = bid.bidId
    return !!bid.params.placementId && !!bid.bidId && bid.bidder === 'bedigitech'
  },

  buildRequests: (bidRequests) => {
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

  interpretResponse: function(serverResponse) {
    let bids = [];
    if (isArray(serverResponse.body)) {
      _each(serverResponse.body, function(placementResponse) {
        interpretResponse(placementResponse, bids);
      });
    }
    return bids;
  },

};

registerBidder(spec);
