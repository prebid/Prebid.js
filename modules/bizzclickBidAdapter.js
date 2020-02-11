import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER, NATIVE, VIDEO } from 'src/mediaTypes';
import * as utils from 'src/utils';

const BIDDER_CODE = 'bizzclick';
const URL = '//supply.bizzclick.com/?c=o&m=multi';
const URL_SYNC = '//supply.bizzclick.com/?c=o&m=cookie';

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
  }
  return false;
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
    return Boolean(bid.bidId && bid.params && !isNaN(bid.params.placementId) && bid.params.type);
  },

  /**
    * Make a server request from the list of BidRequests.
    *
    * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
    * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests) => {
    let winTop = window;
    try {
      window.top.location.toString();
      winTop = window.top;
    } catch (e) {
      utils.logMessage(e);
    };
    const location = utils.getTopWindowLocation();
    const placements = [];
    const len = validBidRequests.length;
    for (let i = 0; i < len; i++) {
      const bid = validBidRequests[i];
      const placement = {
        placementId: bid.params.placementId,
        bidId: bid.bidId,
        sizes: bid.sizes,
        type: bid.params.type
      };
      placements.push(placement);
    }
    return {
      method: 'POST',
      url: URL,
      data: {
        'deviceWidth': winTop.screen.width,
        'deviceHeight': winTop.screen.height,
        'secure': (location.protocol === 'https:') ? 1 : 0,
        'host': location.host,
        'page': location.pathname,
        'placements': placements
      }
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
  */
  interpretResponse: (bidResponses) => {
    const res = [];
    bidResponses = bidResponses.body;
    const len = bidResponses.length;
    for (let i = 0; i < len; i++) {
      const bid = bidResponses[i];
      if (isBidResponseValid(bid)) {
        res.push(bid);
      }
    }
    return res;
  },

  getUserSyncs: () => {
    return [{
      type: 'image',
      url: URL_SYNC
    }];
  }
};

registerBidder(spec);
