import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER, NATIVE} from 'src/mediaTypes';
const BIDDER_CODE = 'clickforce';
const ENDPOINT_URL = '//ad.doublemax.net/adserver/prebid.json?cb=' + new Date().getTime() + '&hb=1&ver=1.21';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, NATIVE],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return bid && bid.params && !!bid.params.zone;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests) {
    const bidParams = [];
    utils._each(validBidRequests, function(bid) {
      bidParams.push({
        z: bid.params.zone,
        bidId: bid.bidId
      });
    });
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: bidParams,
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
    const cfResponses = [];
    const bidRequestList = [];

    if (typeof bidRequest != 'undefined') {
      utils._each(bidRequest.validBidRequests, function(req) {
        bidRequestList[req.bidId] = req;
      });
    }

    utils._each(serverResponse.body, function(response) {
      if (response.requestId != null) {
        // native ad size
        if (response.width == 3) {
          cfResponses.push({
            requestId: response.requestId,
            cpm: response.cpm,
            width: response.width,
            height: response.height,
            creativeId: response.creativeId,
            currency: response.currency,
            netRevenue: response.netRevenue,
            ttl: response.ttl,
            native: {
              title: response.tag.content.title,
              body: response.tag.content.content,
              image: {
                url: response.tag.content.image,
                height: 900,
                width: 1600
              },
              icon: {
                url: response.tag.content.icon,
                height: 900,
                width: 900
              },
              clickUrl: response.tag.cu,
              cta: response.tag.content.button_text,
              sponsoredBy: response.tag.content.advertiser,
              impressionTrackers: response.tag.iu,
            },
            mediaType: 'native',
          });
        } else {
          // display ad
          cfResponses.push({
            requestId: response.requestId,
            cpm: response.cpm,
            width: response.width,
            height: response.height,
            creativeId: response.creativeId,
            currency: response.currency,
            netRevenue: response.netRevenue,
            ttl: response.ttl,
            ad: response.tag,
            mediaType: 'banner',
          });
        }
      }
    });
    return cfResponses;
  },
  getUserSyncs: function(syncOptions, serverResponses) {
    if (syncOptions.iframeEnabled) {
      return [{
        type: 'iframe',
        url: 'https://cdn.doublemax.net/js/capmapping.htm'
      }]
    } else if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: 'https://c.doublemax.net/cm'
      }]
    }
  }
};

registerBidder(spec);
