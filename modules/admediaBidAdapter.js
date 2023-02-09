import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const BIDDER_CODE = 'admedia';
const ENDPOINT_URL = 'https://prebid.admedia.com/bidder/';

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
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @return Array Info describing the request to the server.
   * @param validBidRequests
   * @param bidderRequest
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (validBidRequests.length === 0) {
      return [];
    }
    return validBidRequests.map(bidRequest => {
      let sizes = []
      if (bidRequest.mediaTypes && bidRequest.mediaTypes[BANNER] && bidRequest.mediaTypes[BANNER].sizes) {
        sizes = bidRequest.mediaTypes[BANNER].sizes;
      }

      var tagData = [];

      var tagObjects = [];
      tagObjects['tags'] = [];
      for (var i = 0, j = sizes.length; i < j; i++) {
        let tag = {};
        tag.sizes = [];
        tag.id = bidRequest.params.placementId;
        tag.aid = bidRequest.params.aid;
        tag.sizes.push(sizes[i].toString().replace(',', 'x'));
        tagObjects.push(tag);
      }

      Object.assign(tagData, tagObjects);

      // console.log(bidRequest);
      const payload = {
        id: bidRequest.params.placementId,
        aid: bidRequest.params.aid,
        tags: tagData,
        bidId: bidRequest.bidId,
        referer: encodeURIComponent(bidderRequest.refererInfo.page)
      };
      // console.log(payload);
      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const requiredKeys = ['requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency'];
    const validBidResponses = [];
    serverResponse = serverResponse.body.tags;
    // console.log(serverResponse);
    if (serverResponse && (serverResponse.length > 0)) {
      serverResponse.forEach((bid) => {
        const bidResponse = {};
        for (const requiredKey of requiredKeys) {
          if (!bid.hasOwnProperty(requiredKey)) {
            return [];
          }
          bidResponse[requiredKey] = bid[requiredKey];
        }
        validBidResponses.push(bidResponse);
      });
    }
    // console.log(JSON.stringify(validBidResponses));
    return validBidResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {},
  onTimeout: function(timeoutData) {},
  onBidWon: function (bid) {}
};

registerBidder(spec);
