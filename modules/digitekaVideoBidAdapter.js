import * as utils from 'src/utils';
import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';
import {VIDEO} from '../src/mediaTypes';
const BIDDER_CODE = 'digiteka';
const URL = '//www.ultimedia.com/deliver/ad/hb/';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    if (bid && typeof bid.params !== 'object') {
      utils.logError(BIDDER_CODE + ': params is not defined or is incorrect in the bidder settings.');
      return false;
    }
    if (!utils.getBidIdParameter('id', bid.params)) {
      utils.logError(BIDDER_CODE + ': id is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('price', bid.params)) {
      utils.logError(BIDDER_CODE + ': price is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('currency', bid.params)) {
      utils.logError(BIDDER_CODE + ': currency is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('tag', bid.params)) {
      utils.logError(BIDDER_CODE + ': tag is not present in bidder params');
      return false;
    }
    if (!utils.deepAccess(bid, 'mediaTypes.video')) {
      utils.logError(BIDDER_CODE + ': mediaTypes.video is not present in the bidder settings.');
      return false;
    }
    return !!(bid.params.id) && !!(bid.params.price) && !!(bid.params.currency) && !!(bid.params.tag);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest A bidder Request.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bid = bidderRequest.bids[0];
    const payload = {
      id: utils.getBidIdParameter('id', bid.params),
      price: utils.getBidIdParameter('price', bid.params),
      currency: utils.getBidIdParameter('currency', bid.params),
      tag: utils.getBidIdParameter('tag', bid.params),
      ua: navigator.userAgent
    };
    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.cs = bidderRequest.gdprConsent.consentString;
    }
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: URL,
      data: payload,
      bidRequest: bidderRequest
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {bidderRequest} bidderRequest A bidder Request.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse, bidderRequest) {
    serverResponse = serverResponse.body;
    const bids = [];
    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      utils.logError(errorMessage);
      return bids;
    }

    if (serverResponse.id) {
      const bid = {
        'requestId': bidderRequest.bidRequest.bids[0].bidId,
        'cpm': serverResponse.price,
        'width': bidderRequest.bidRequest.bids[0].mediaTypes.video.playerSize[0][0],
        'height': bidderRequest.bidRequest.bids[0].mediaTypes.video.playerSize[0][1],
        'ttl': 360,
        'creativeId': serverResponse.id,
        'netRevenue': true,
        'currency': serverResponse.currency,
        'vastUrl': serverResponse.tag,
        'mediaType': 'video'
      };
      bids.push(bid);
    }
    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  /* getUserSyncs: function(syncOptions, serverResponses) {
        const syncs = []
        if (syncOptions.iframeEnabled) {
            syncs.push({
                type: 'iframe',
                url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html'
            });
        }
        if (syncOptions.pixelEnabled && serverResponses.length > 0) {
            syncs.push({
                type: 'image',
                url: serverResponses[0].body.userSync.url
            });
        }
        return syncs;
    }, */

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} data - Containing timeout specific data
   */
  onTimeout: function(data) {
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid - The bid that won the auction
   */
  onBidWon: function(bid) {
    // Bidder specific code
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} bid - The bid of which the targeting has been set
   */
  onSetTargeting: function(bid) {
    // Bidder specific code
  }
};
registerBidder(spec);
