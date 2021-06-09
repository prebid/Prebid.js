import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'collectcent';
const URL_MULTI = 'https://publishers.motionspots.com/?c=o&m=multi';
const URL_SYNC = 'https://publishers.motionspots.com/?c=o&m=cookie';

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
    return Boolean(bid.bidId &&
        bid.params &&
        !isNaN(bid.params.placementId) &&
        spec.supportedMediaTypes.indexOf(bid.params.traffic) !== -1
    );
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests A non-empty list of valid bid requests that should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    let winTop;
    try {
      winTop = window.top;
    } catch (e) {
      utils.logMessage(e);
      winTop = window;
    };

    const placements = [];
    const location = bidderRequest ? new URL(bidderRequest.refererInfo.referer) : winTop.location;
    const request = {
      'secure': (location.protocol === 'https:') ? 1 : 0,
      'deviceWidth': winTop.screen.width,
      'deviceHeight': winTop.screen.height,
      'host': location.host,
      'page': location.pathname,
      'placements': placements
    };

    for (let i = 0; i < validBidRequests.length; i++) {
      const bid = validBidRequests[i];
      const params = bid.params;
      placements.push({
        placementId: params.placementId,
        bidId: bid.bidId,
        sizes: bid.sizes,
        traffic: params.traffic
      });
    }
    return {
      method: 'POST',
      url: URL_MULTI,
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
    try {
      serverResponse = serverResponse.body;
    } catch (e) {
      utils.logMessage(e);
    };
    return serverResponse;
  },

  getUserSyncs: () => {
    return [{
      type: 'image',
      url: URL_SYNC
    }];
  }
};

registerBidder(spec);
