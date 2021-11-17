import { _each, isArray, getBidIdParameter, deepClone, getUniqueIdentifierStr } from '../src/utils.js';
// import {config} from 'src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';

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
      return window === window.top ? window.location.href : window.parent === window.top ? document.referrer : null;
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

    let bidglass = window['bidglass'];

    _each(validBidRequests, function(bid) {
      bid.sizes = ((isArray(bid.sizes) && isArray(bid.sizes[0])) ? bid.sizes : [bid.sizes]);
      bid.sizes = bid.sizes.filter(size => isArray(size));

      var adUnitId = getBidIdParameter('adUnitId', bid.params);
      var options = deepClone(bid.params);

      delete options.adUnitId;

      // Merge externally set targeting params
      if (typeof bidglass === 'object' && bidglass.getTargeting) {
        let targeting = bidglass.getTargeting(adUnitId, options.targeting);

        if (targeting && Object.keys(targeting).length > 0) options.targeting = targeting;
      }

      // Stuff to send: [bid id, sizes, adUnitId, options]
      imps.push({
        bidId: bid.bidId,
        sizes: bid.sizes,
        adUnitId: adUnitId,
        options: options
      });
    });

    // Stuff to send: page URL
    const bidReq = {
      reqId: getUniqueIdentifierStr(),
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
    const bidResponses = [];

    _each(serverResponse.body.bidResponses, function(serverBid) {
      const bidResponse = {
        requestId: serverBid.requestId,
        cpm: parseFloat(serverBid.cpm),
        width: parseInt(serverBid.width, 10),
        height: parseInt(serverBid.height, 10),
        creativeId: serverBid.creativeId,
        dealId: serverBid.dealId || null,
        currency: serverBid.currency || 'USD',
        mediaType: serverBid.mediaType || 'banner',
        netRevenue: true,
        ttl: serverBid.ttl || 10,
        ad: serverBid.ad,
        meta: {}
      };

      if (serverBid.meta) {
        let meta = serverBid.meta;

        if (meta.advertiserDomains && meta.advertiserDomains.length) {
          bidResponse.meta.advertiserDomains = meta.advertiserDomains;
        }
      }

      bidResponses.push(bidResponse);
    });

    return bidResponses;
  }

}

registerBidder(spec);
