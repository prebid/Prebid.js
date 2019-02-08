import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'gjirafa';
const ENDPOINT_URL = 'https://gjc.gjirafa.com/Home/GetBid';
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
  isBidRequestValid: function(bid) {
    return bid.params && (!!bid.params.placementId || (!!bid.params.minCPM && !!bid.params.minCPC));
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      let gjid = Math.floor(Math.random() * 99999999);
      let sizes = generateSizeParam(bidRequest.sizes);
      let configId = bidRequest.params.placementId || '';
      let minCPM = bidRequest.params.minCPM || 0.0;
      let minCPC = bidRequest.params.minCPC || 0.0;
      let allowExplicit = bidRequest.params.explicit || 0;
      const body = {
        gjid: gjid,
        sizes: sizes,
        configId: configId,
        minCPM: minCPM,
        minCPC: minCPC,
        allowExplicit: allowExplicit,
        referrer: utils.getTopWindowUrl(),
        requestid: bidRequest.bidderRequestId,
        bidid: bidRequest.bidId
      };
      if (document.referrer) {
        body.referrer = document.referrer;
      }
      if (bidderRequest && bidderRequest.gdprConsent) {
        body.consent_string = bidderRequest.gdprConsent.consentString;
        body.consent_required = (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true;
      }
      return {
        method: 'GET',
        url: ENDPOINT_URL,
        data: body
      };
    });
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const serverBody = serverResponse.body;
    const bidResponses = [];
    const bidResponse = {
      requestId: bidRequest.data.bidid,
      cpm: serverBody.CPM,
      width: serverBody.Width,
      height: serverBody.Height,
      creativeId: serverBody.CreativeId,
      currency: serverBody.Currency,
      netRevenue: serverBody.NetRevenue,
      ttl: serverBody.TTL,
      referrer: serverBody.Referrer,
      ad: serverBody.Ad
    };
    bidResponses.push(bidResponse);
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
