import * as utils from '../src/utils.js';
// import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, NATIVE } from '../src/mediaTypes.js';
const VERSION = '0.0.1';
const BIDDER_CODE = 'pubwise';
const ENDPOINT_URL = 'https://bid.pubwise.io/prebid';
// const USERSYNC_URL = '//127.0.0.1:8080/usersync'

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: function (bid) {
    return !!(bid.params.siteId || bid.params.spotId);
  },
  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bids
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function (validBidRequests) {
    var i;
    for (i = 0; i < validBidRequests.length; i++) {
      if (validBidRequests[i].sizes) {
        validBidRequests[i].sizes = transformSizes(validBidRequests[i].sizes);
      }
    }

    const payloadString = {'pbdata': validBidRequests, 'version': VERSION};
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      options: {
        contentType: 'application/json'
      },
      data: payloadString,
    };
  },
  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function (serverResponse, bidRequest) {
    const serverResponseBody = serverResponse.body;
    const bidResponses = [];

    utils.logInfo(serverResponseBody);

    if (serverResponseBody.Responses) {
      serverResponseBody.Responses.forEach(serverBid => {
        utils.logInfo(serverBid);
        if (rtbBid.rtb[NATIVE]) {
        const bidResponse = {
          requestId: serverBid.RequestID,
          cpm: serverBid.CPM,
          width: serverBid.Width,
          height: serverBid.Height,
          creativeId: serverBid.CreativeID,
          dealId: serverBid.DealID,
          currency: serverBid.Currency,
          netRevenue: serverBid.NetRevenue,
          ttl: serverBid.TTL,
          referrer: '',
          ad: serverBid.Ad
        };
        bidResponses.push(bidResponse);
      });
    }

    return bidResponses;
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    return syncs;
  }
}

/* Modify sizes into more compatible format for downstream processing */
function transformSizes(requestSizes) {
  let sizes = [];
  let sizeObj = {};

  if (utils.isArray(requestSizes) && requestSizes.length === 2 &&
    !utils.isArray(requestSizes[0])) {
    sizeObj.width = parseInt(requestSizes[0], 10);
    sizeObj.height = parseInt(requestSizes[1], 10);
    sizes.push(sizeObj);
  } else if (typeof requestSizes === 'object') {
    for (let i = 0; i < requestSizes.length; i++) {
      let size = requestSizes[i];
      sizeObj = {};
      sizeObj.width = parseInt(size[0], 10);
      sizeObj.height = parseInt(size[1], 10);
      sizes.push(sizeObj);
    }
  }

  return sizes;
}

registerBidder(spec);
