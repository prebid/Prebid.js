import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'welect';
const DEFAULT_DOMAIN = 'www.welect.de';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['wlt'],
  gvlid: 282,
  supportedMediaTypes: ['video'],

  // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return (
      utils.deepAccess(bid, 'mediaTypes.video.context') === 'instream' &&
      !!bid.params.placementId
    );
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    return validBidRequests.map((bidRequest) => {
      let rawSizes =
        utils.deepAccess(bidRequest, 'mediaTypes.video.playerSize') ||
        bidRequest.sizes;
      let size = rawSizes[0];

      let domain = bidRequest.params.domain || DEFAULT_DOMAIN;

      let url = `https://${domain}/api/v2/preflight/by_alias/${bidRequest.params.placementId}`;

      let gdprConsent = null;

      if (bidRequest && bidRequest.gdprConsent) {
        gdprConsent = {
          gdpr_consent: {
            gdprApplies: bidRequest.gdprConsent.gdprApplies,
            tcString: bidRequest.gdprConsent.gdprConsent,
          },
        };
      }

      const data = {
        width: size[0],
        height: size[1],
        bid_id: bidRequest.bidId,
        ...gdprConsent,
      };

      return {
        method: 'POST',
        url: url,
        data: data,
        options: {
          contentType: 'application/json',
          withCredentials: false,
          crossOrigin: true,
        },
      };
    });
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const responseBody = serverResponse.body;

    if (typeof responseBody !== 'object' || responseBody.available !== true) {
      return [];
    }

    const bidResponses = [];
    const bidResponse = responseBody.bidResponse;
    bidResponses.push(bidResponse);
    return bidResponses;
  },
};
registerBidder(spec);
