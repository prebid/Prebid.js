import * as utils from 'src/utils';
// import {config} from 'src/config';
import {registerBidder} from 'src/adapters/bidderFactory';

const BIDDER_CODE = 'bidglass';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['bg'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.adUnitId && !isNaN(parseFloat(bid.params.adUnitId)) && isFinite(bid.params.adUnitId));
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    /*
    Use `bidderRequest.bids[]` to get bidder-dependent
    request info.

    If your bidder supports multiple currencies, use
    `config.getConfig(currency)` to find which one the ad
    server needs.
    */

    /*
    Sample array entry for validBidRequests[]:
    [{
      "bidder": "bidglass",
      "bidId": "51ef8751f9aead",
      "params": {
      "adUnitId": 11,
      ...
      },
      "adUnitCode": "div-gpt-ad-1460505748561-0",
      "transactionId": "d7b773de-ceaa-484d-89ca-d9f51b8d61ec",
      "sizes": [[320,50],[300,250],[300,600]],
      "bidderRequestId": "418b37f85e772c",
      "auctionId": "18fd8b8b0bd757",
      "bidRequestsCount": 1
    }]
    */

    let imps = [];
    let getReferer = function() {
      if (window === window.top) {
        return window.location.href;
      } else if (window.parent === window.top) {
        return document.referrer;
      } else {
        return null;
      }
    };
    let getOrigins = function() {
      var ori = [window.location.protocol + '//' + window.location.hostname];

      if (window.location.ancestorOrigins) {
        for (var i = 0; i < window.location.ancestorOrigins.length; i++) {
          ori.push(window.location.ancestorOrigins[i]);
        }
      } else if (window !== window.top) {
        // Derive the parent origin
        var parts = document.referrer.split('/');

        ori.push(parts[0] + '//' + parts[2]);

        if (window.parent !== window.top) {
          // Additional unknown origins exist
          ori.push('null');
        }
      }

      return ori;
    };

    utils._each(validBidRequests, function(bid) {
      bid.sizes = ((utils.isArray(bid.sizes) && utils.isArray(bid.sizes[0])) ? bid.sizes : [bid.sizes]);
      bid.sizes = bid.sizes.filter(size => utils.isArray(size));

      // Stuff to send: [bid id, sizes, adUnitId]
      imps.push({
        bidId: bid.bidId,
        sizes: bid.sizes,
        adUnitId: utils.getBidIdParameter('adUnitId', bid.params)
      });
    });

    // Stuff to send: page URL
    const bidReq = {
      reqId: utils.getUniqueIdentifierStr(),
      imps: imps,
      ref: getReferer(),
      ori: getOrigins()
    };

    let url = 'https://bid.glass/ad/hb.php?' +
      `src=$$REPO_AND_VERSION$$`;

    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(bidReq),
      options: {
        contentType: 'text/plain',
        withCredentials: false
      }
    }
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    // const serverBody  = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header');

    const bidResponses = [];

    utils._each(serverResponse.body.bidResponses, function(bid) {
      bidResponses.push({
        requestId: bid.requestId,
        cpm: parseFloat(bid.cpm),
        width: parseInt(bid.width),
        height: parseInt(bid.height),
        creativeId: bid.creativeId,
        dealId: bid.dealId || null,
        currency: bid.currency || 'USD',
        mediaType: bid.mediaType || 'banner',
        netRevenue: true,
        ttl: bid.ttl || 10,
        ad: bid.ad
      });
    });

    return bidResponses;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    return [];
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {data} Containing timeout specific data
   */
  onTimeout: function(data) {
    // Bidder specifc code
  },

  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} The bid that won the auction
   */
  onBidWon: function(bid) {
    // Bidder specific code
  },

  /**
   * Register bidder specific code, which will execute when the adserver targeting has been set for a bid from this bidder
   * @param {Bid} The bid of which the targeting has been set
   */
  onSetTargeting: function(bid) {
    // Bidder specific code
  }

}

registerBidder(spec);
