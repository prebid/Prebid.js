import { parseSizesInput, isEmpty } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 */

const BIDDER_CODE = 'ownadx';
const DEFAULT_CURRENCY = 'USD';
const CREATIVE_TTL = 300;

let tkn;
let seatid;
let sspid;
let mtype = 0;
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
    if (bid.mediaTypes[BANNER]) {
      mtype = 1;
    } else {
      mtype = 2;
    }

    tkn = bid.params.tokenId;
    seatid = bid.params.seatId;
    sspid = bid.params.sspId;
    return !!(bid.params.tokenId);
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
      token: response.tokenId,
      requestId: response.slotBidId,
      cpm: response.cpm,
      currency: response.currency || DEFAULT_CURRENCY,
      adType: response.adType || '1',
      width: response.adWidth,
      height: response.adHeight,
      ttl: CREATIVE_TTL,
      creativeId: response.creativeId || 0,
      netRevenue: response.netRevenue || false,
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
