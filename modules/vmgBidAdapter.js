import {registerBidder} from '../src/adapters/bidderFactory.js';
const BIDDER_CODE = 'vmg';
const ENDPOINT = 'https://predict.vmg.nyc';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bidRequest) {
    if (typeof bidRequest !== 'undefined') {
      return true;
    } else {
      return false;
    }
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let bidRequests = [];
    let referer = window.location.href;
    try {
      referer = typeof bidderRequest.refererInfo === 'undefined'
        ? window.top.location.href
        : bidderRequest.refererInfo.referer;
    } catch (e) {}

    validBidRequests.forEach(function(validBidRequest) {
      bidRequests.push({
        adUnitCode: validBidRequest.adUnitCode,
        referer: referer,
        bidId: validBidRequest.bidId
      });
    });

    return {
      method: 'POST',
      url: ENDPOINT,
      data: JSON.stringify(bidRequests)
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * Some required bid params are not needed for this so default
   * values are used.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const validBids = JSON.parse(bidRequest.data);
    let bidResponses = [];
    if (typeof serverResponse.body !== 'undefined') {
      const deals = serverResponse.body;
      validBids.forEach(function(validBid) {
        if (typeof deals[validBid.adUnitCode] !== 'undefined') {
          const bidResponse = {
            requestId: validBid.bidId,
            ad: '<div></div>',
            cpm: 0.01,
            width: 0,
            height: 0,
            dealId: deals[validBid.adUnitCode],
            ttl: 300,
            creativeId: '1',
            netRevenue: '0',
            currency: 'USD'
          };

          bidResponses.push(bidResponse);
        }
      });
    }

    return bidResponses;
  }
}

registerBidder(spec);
