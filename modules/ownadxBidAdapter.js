import { parseSizesInput, isEmpty } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'ownadx';
const CUR = 'USD';
const CREATIVE_TTL = 300;

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.tokenId && bid.params.sspId && bid.params.seatId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param validBidRequests
   * @param bidderRequest
   * @return Array Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const sizes = parseSizesInput(bidRequest.params.size || bidRequest.sizes);
      let mtype = 0;
      if (bidRequest.mediaTypes[BANNER]) {
        mtype = 1;
      } else {
        mtype = 2;
      }

      let tkn = bidRequest.params.tokenId;
      let seatid = bidRequest.params.seatId;
      let sspid = bidRequest.params.sspId;

      const payload = {
        sizes: sizes,
        slotBidId: bidRequest.bidId,
        PageUrl: bidderRequest.refererInfo.page,
        mediaChannel: mtype
      };
      return {
        method: 'POST',
        url: `https://pbs-js.prebid-ownadx.com/publisher/prebid/${seatid}/${sspid}?token=${tkn}`,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const response = serverResponse.body;
    const bids = [];
    if (isEmpty(response)) {
      return bids;
    }
    const responseBid = {
      width: response.width,
      height: response.height,
      token: response.tokenId,
      ttl: CREATIVE_TTL,
      requestId: response.slotBidId,
      aType: response.adType || '1',
      cpm: response.cpm,
      creativeId: response.creativeId || 0,
      netRevenue: response.netRevenue || false,
      currency: response.currency || CUR,
      meta: {
        mediaType: response.mediaType || BANNER,
        advertiserDomains: response.advertiserDomains || []
      },
      ad: response.adm
    };
    bids.push(responseBid);
    return bids;
  }

};

registerBidder(spec);
