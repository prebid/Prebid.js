import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';

const BIDDER_CODE = 'dtkvideo';
const URL = '//www.ultimedia.com/deliver/ad/outhb/';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

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
    if (!utils.getBidIdParameter('mdtk', bid.params)) {
      utils.logError(BIDDER_CODE + ': id is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('zone', bid.params)) {
      utils.logError(BIDDER_CODE + ': price is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('diff', bid.params)) {
      utils.logError(BIDDER_CODE + ': diff is not present in bidder params');
      return false;
    }
    if (!utils.getBidIdParameter('sizes', bid.mediaTypes.banner)) {
      utils.logError(BIDDER_CODE + ': size is not present in banner params');
      return false;
    }
    return !!(bid.params.mdtk) && !!(bid.params.zone);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} validBidRequests - an array of bids
   * @param {bidderRequest} bidderRequest A bidder Request.
   * @return {object} ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    const bid = bidderRequest.bids[0];
    const adUnitCode = bid.adUnitCode;
    const payload = {
      adUnitCode: adUnitCode,
      mdtk: utils.getBidIdParameter('mdtk', bid.params),
      zone: utils.getBidIdParameter('zone', bid.params),
      diff: utils.getBidIdParameter('diff', bid.params),
      ua: navigator.userAgent
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr_consent = {
        consent_string: bidderRequest.gdprConsent.consentString,
        consent_required: bidderRequest.gdprConsent.gdprApplies
      };
    }

    if (bidderRequest && bidderRequest.refererInfo) {
      payload.referer = encodeURIComponent(bidderRequest.refererInfo.referer);
    }

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
    const bidResponses = [];

    if (!serverResponse || serverResponse.error) {
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter`;
      if (serverResponse && serverResponse.error) { errorMessage += `: ${serverResponse.error}`; }
      utils.logError(errorMessage);
      return bidResponses;
    }

    serverResponse = serverResponse.body;
    if (serverResponse.responses) {
      serverResponse.responses.forEach(function (bid) {
        const bidResponse = {
          cpm: bid.price,
          width: bid.width ? bid.width : 1,
          height: bid.height ? bid.height : 1,
          currency: bid.currency,
          netRevenue: true,
          ttl: 360,
          ad: bid.ad,
          requestId: bidderRequest.bidRequest.bids[0].bidId,
          creativeId: bid.id
        };
        bidResponses.push(bidResponse);
      });
    }
    return bidResponses;
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
    console.log('DGTK WON');
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
