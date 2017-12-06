import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

const BIDDER_CODE = 'bridgewell';
const REQUEST_ENDPOINT = '//rec.scupio.com/recweb/prebid.aspx';

export const spec = {
  code: BIDDER_CODE,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return bid && bid.params && !!bid.params.ChannelID;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    const channelIDs = [];

    utils._each(validBidRequests, function(bid) {
      channelIDs.push(bid.params.ChannelID);
    });

    return {
      method: 'GET',
      url: REQUEST_ENDPOINT,
      data: {
        'ChannelID': channelIDs.join(',')
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
        return !!res && !res.consumed && find(req.sizes, function(size) {
          return res.width === size[0] && res.height === size[1];
        });
      });

      if (matchedResponse) {
        matchedResponse.consumed = true;

        // check required parameters
        if (typeof matchedResponse.cpm !== 'number') {
          return;
        } else if (typeof matchedResponse.width !== 'number' || typeof matchedResponse.height !== 'number') {
          return;
        } else if (typeof matchedResponse.ad !== 'string') {
          return;
        } else if (typeof matchedResponse.net_revenue === 'undefined') {
          return;
        } else if (typeof matchedResponse.currency !== 'string') {
          return;
        }

        bidResponse.requestId = req.bidId;
        bidResponse.cpm = matchedResponse.cpm;
        bidResponse.width = matchedResponse.width;
        bidResponse.height = matchedResponse.height;
        bidResponse.ad = matchedResponse.ad;
        bidResponse.ttl = matchedResponse.ttl;
        bidResponse.creativeId = matchedResponse.id;
        bidResponse.netRevenue = matchedResponse.net_revenue === 'true';
        bidResponse.currency = matchedResponse.currency;

        bidResponses.push(bidResponse);
      }
    });

    return bidResponses;
  }
};

registerBidder(spec);
