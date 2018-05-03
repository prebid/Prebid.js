import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

const BIDDER_CODE = 'bridgewell';
const REQUEST_ENDPOINT = '//rec.scupio.com/recweb/prebid.aspx?cb=' + Math.random();

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    let valid = false;
    let typeOfCpmWeight;

    if (bid && bid.params) {
      if (bid.params.ChannelID) {
        // cpmWeight is optinal parameter and should above than zero
        typeOfCpmWeight = typeof bid.params.cpmWeight;
        if (typeOfCpmWeight === 'undefined') {
          bid.params.cpmWeight = 1;
          valid = true;
        } else if (typeOfCpmWeight === 'number' && bid.params.cpmWeight > 0) {
          valid = true;
        } else {
          valid = false;
        }
      }
    }

    return valid;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    const adUnits = [];
    utils._each(validBidRequests, function(bid) {
      adUnits.push({
        ChannelID: bid.params.ChannelID,
        mediaTypes: bid.mediaTypes || {
          banner: {
            sizes: bid.sizes
          }
        }
      });
    });

    return {
      method: 'POST',
      url: REQUEST_ENDPOINT,
      data: {
        adUnits: adUnits
      },
      validBidRequests: validBidRequests
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];

    // map responses to requests
    utils._each(bidRequest.validBidRequests, function(req) {
      const bidResponse = {};

      if (!serverResponse.body) {
        return;
      }

      let matchedResponse = find(serverResponse.body, function(res) {
        let valid = false;

        if (!!res && !res.consumed) { // response exists and not consumed
          if (res.width && res.height) {
            let mediaTypes = req.mediaTypes;
            // for prebid 1.0 and later usage, mediaTypes.banner.sizes
            let sizes = mediaTypes && mediaTypes.banner && mediaTypes.banner.sizes ? mediaTypes.banner.sizes : req.sizes;
            if (sizes) {
              let sizeValid;
              let width = res.width;
              let height = res.height;
              // check response size validation
              if (typeof sizes[0] === 'number') { // for foramt Array[Number] check
                sizeValid = width === sizes[0] && height === sizes[1];
              } else { // for format Array[Array[Number]] check
                sizeValid = find(sizes, function(size) {
                  return (width === size[0] && height === size[1]);
                });
              }

              if (sizeValid) { // dont care native sizes
                valid = true;
              }
            }
          }
        }

        return valid;
      });

      if (matchedResponse) {
        matchedResponse.consumed = true;

        // check required parameters
        if (typeof matchedResponse.cpm !== 'number') {
          return;
        } else if (typeof matchedResponse.ad !== 'string') {
          return;
        } else if (typeof matchedResponse.netRevenue !== 'boolean') {
          return;
        } else if (typeof matchedResponse.currency !== 'string') {
          return;
        }

        bidResponse.requestId = req.bidId;
        bidResponse.cpm = matchedResponse.cpm * req.params.cpmWeight;
        bidResponse.width = matchedResponse.width;
        bidResponse.height = matchedResponse.height;
        bidResponse.ad = matchedResponse.ad;
        bidResponse.ttl = matchedResponse.ttl;
        bidResponse.creativeId = matchedResponse.id;
        bidResponse.netRevenue = matchedResponse.netRevenue;
        bidResponse.currency = matchedResponse.currency;

        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  }
};

registerBidder(spec);
