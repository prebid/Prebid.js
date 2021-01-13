import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'gjirafa';
const ENDPOINT_URL = 'https://central.gjirafa.com/bid';
const DIMENSION_SEPARATOR = 'x';
const SIZE_SEPARATOR = ';';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
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
    let propertyId = '';
    let pageViewGuid = '';
    let storageId = '';
    let bidderRequestId = '';
    let url = '';
    let contents = [];

    let placements = validBidRequests.map(bidRequest => {
      if (!propertyId) { propertyId = bidRequest.params.propertyId; }
      if (!pageViewGuid && bidRequest.params) { pageViewGuid = bidRequest.params.pageViewGuid || ''; }
      if (!storageId && bidRequest.params) { storageId = bidRequest.params.storageId || ''; }
      if (!bidderRequestId) { bidderRequestId = bidRequest.bidderRequestId; }
      if (!url && bidderRequest) { url = bidderRequest.refererInfo.referer; }
      if (!contents.length && bidRequest.params.contents && bidRequest.params.contents.length) { contents = bidRequest.params.contents }

      let adUnitId = bidRequest.adUnitCode;
      let placementId = bidRequest.params.placementId;
      let sizes = generateSizeParam(bidRequest.sizes);

      return {
        sizes: sizes,
        adUnitId: adUnitId,
        placementId: placementId,
        bidid: bidRequest.bidId,
        count: bidRequest.params.count,
        skipTime: bidRequest.params.skipTime
      };
    });

    let body = {
      propertyId: propertyId,
      pageViewGuid: pageViewGuid,
      storageId: storageId,
      url: url,
      requestid: bidderRequestId,
      placements: placements,
      contents: contents
    }

    return [{
      method: 'POST',
      url: ENDPOINT_URL,
      data: body
    }];
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse) {
    const responses = serverResponse.body;
    const bidResponses = [];
    for (var i = 0; i < responses.length; i++) {
      const bidResponse = {
        requestId: responses[i].BidId,
        cpm: responses[i].CPM,
        width: responses[i].Width,
        height: responses[i].Height,
        creativeId: responses[i].CreativeId,
        currency: responses[i].Currency,
        netRevenue: responses[i].NetRevenue,
        ttl: responses[i].TTL,
        referrer: responses[i].Referrer,
        ad: responses[i].Ad,
        vastUrl: responses[i].VastUrl,
        mediaType: responses[i].MediaType
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
