import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { getBidIdParameter, isEmpty } from '../src/utils.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'suim';
const ENDPOINT = 'https://ad.suimad.com/bid';
const SYNC_URL = 'https://ad.suimad.com/usersync';

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
    return !!bid.params.ad_space_id;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} validBidRequests an array of bids
   * @param {BidderRequest} bidderRequest
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const refererInfo = bidderRequest.refererInfo;
    const url = refererInfo.topmostLocation;

    return validBidRequests.map((request) => {
      const adSpaceId = getBidIdParameter('ad_space_id', request.params);
      const data = {
        bids: [
          {
            bidId: request.bidId,
            ad_space_id: adSpaceId,
            sizes: request.sizes,
            src_url: url,
          },
        ],
      };
      return {
        method: 'POST',
        url: ENDPOINT,
        data: data,
        options: {
          contentType: 'text/plain',
        },
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   * @param {ServerResponse} serverResponse
   * @param {BidRequest} bidRequest
   * @returns {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const res = serverResponse.body;
    if (isEmpty(res)) {
      return [];
    }

    return [
      {
        requestId: res.requestId,
        cpm: res.cpm,
        currency: res.currency,
        width: res.width,
        height: res.height,
        ad: res.ad,
        ttl: res.ttl,
        creativeId: res.creativeId,
        netRevenue: res.netRevenue,
        meta: res.meta,
      },
    ];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    return [
      {
        url: SYNC_URL,
        type: 'image',
      },
    ];
  },
};

registerBidder(spec);
