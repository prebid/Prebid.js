import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes';
import * as utils from '../src/utils';

const BIDDER_CODE = 'colossusssp';
const G_URL = 'https://colossusssp.com/?c=o&m=multi';
const G_URL_SYNC = 'https://colossusssp.com/?c=o&m=cookie';

function isBidResponseValid(bid) {
  if (!bid.requestId || !bid.cpm || !bid.creativeId || !bid.ttl || !bid.currency) {
    return false;
  }

  switch (bid.mediaType) {
    case BANNER:
      return Boolean(bid.width && bid.height && bid.ad);
    case VIDEO:
      return Boolean(bid.vastUrl);
    case NATIVE:
      return Boolean(bid.native);
    default:
      return false;
  }
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.placement_id));
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
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
      'secure': location.protocol === 'https:' ? 1 : 0,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };

    if (bidderRequest) {
      if (bidderRequest.uspConsent) {
        request.ccpa = bidderRequest.uspConsent;
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
      url: G_URL,
      data: request
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: (serverResponse) => {
    let response = [];
    try {
      serverResponse = serverResponse.body;
      for (let i = 0; i < serverResponse.length; i++) {
        let resItem = serverResponse[i];
        if (isBidResponseValid(resItem)) {
          response.push(resItem);
        }
      }
    } catch (e) {
      utils.logMessage(e);
    };
    return response;
  },

  getUserSyncs: () => {
    return [{
      type: 'image',
      url: G_URL_SYNC
    }];
  }
};

registerBidder(spec);
