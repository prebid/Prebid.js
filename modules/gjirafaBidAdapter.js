import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'gjirafa';
const ENDPOINT_URL = 'https://central.gjirafa.com/bid';
const DIMENSION_SEPARATOR = 'x';
const SIZE_SEPARATOR = ';';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.propertyId && bid.params.placementId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    let response = validBidRequests.map(bidRequest => {
      let sizes = generateSizeParam(bidRequest.sizes);
      let propertyId = bidRequest.params.propertyId;
      let placementId = bidRequest.params.placementId;
      let adUnitId = bidRequest.adUnitCode;
      let pageViewGuid = bidRequest.params.pageViewGuid || '';
      let contents = bidRequest.params.contents || [];
      const body = {
        sizes: sizes,
        adUnitId: adUnitId,
        placementId: placementId,
        propertyId: propertyId,
        pageViewGuid: pageViewGuid,
        url: bidderRequest ? bidderRequest.refererInfo.referer : '',
        requestid: bidRequest.bidderRequestId,
        bidid: bidRequest.bidId,
        contents: contents
      };
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: body
      };
    });
    return response
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    window.adnResponse = serverResponse;
    const responses = serverResponse.body;
    const bidResponses = [];
    for (var i = 0; i < responses.length; i++) {
      const bidResponse = {
        requestId: bidRequest.data.bidid,
        cpm: responses[i].CPM,
        width: responses[i].Width,
        height: responses[i].Height,
        creativeId: responses[i].CreativeId,
        currency: responses[i].Currency,
        netRevenue: responses[i].NetRevenue,
        ttl: responses[i].TTL,
        referrer: responses[i].Referrer,
        ad: responses[i].Ad
      };
      bidResponses.push(bidResponse);
    }
    return bidResponses;
  }
}

/**
* Generate size param for bid request using sizes array
*
* @param {Array} sizes Possible sizes for the ad unit.
* @return {string} Processed sizes param to be used for the bid request.
*/
function generateSizeParam(sizes) {
  return sizes.map(size => size.join(DIMENSION_SEPARATOR)).join(SIZE_SEPARATOR);
}

registerBidder(spec);
