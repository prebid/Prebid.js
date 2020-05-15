import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'smaato';
const SMAATO_ENDPOINT = 'https://unifiedbidding.ad.smaato.net/oapi/unifiedbidding';

/**
* Transform BidRequest to OpenRTB-formatted BidRequest Object
* @param {Array<BidRequest>} validBidRequests
* @param {any} bidderRequest
* @returns {string}
*/
const buildOpenRtbBidRequestPayload = (validBidRequests, bidderRequest) => {
  const imp = validBidRequests.map(br => {
    const sizes = utils.parseSizesInput(br.sizes)[0];
    return {
      id: br.bidId,
      banner: {
        w: sizes.split('x')[0],
        h: sizes.split('x')[1]
      },
      tagid: utils.deepAccess(br, 'params.adspaceId'),
      // secure: 1,
      // bidfloor: parseFloat(utils.deepAccess(br, 'params.bidfloorCpm') || 0)
    };
  });

  const request = {
    id: bidderRequest.auctionId,
    at: 1,
    imp,
    cur: 'USD',
    site: {
      id: window.location.hostname,
      publisher: {
        id: utils.deepAccess(validBidRequests[0], 'params.publisherId')
      },
      domain: window.location.hostname,
      page: window.location.href,
      ref: bidderRequest.refererInfo.referer
    },
    device: {
      language: navigator.language,
      ua: navigator.userAgent
    },
    // blocked advertiser categories
    // bcat: utils.deepAccess(validBidRequests[0], 'params.bcat') || [],
  };

  return JSON.stringify(request);
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['ex'], // short code

  /**
      * Determines whether or not the given bid request is valid.
      *
      * @param {BidRequest} bid The bid params to validate.
      * @return boolean True if this is a valid bid, and false otherwise.
      */
  isBidRequestValid: function(bid) {
    return true;
  },

  /**
      * Make a server request from the list of BidRequests.
      *
      * @param {validBidRequests[]} - an array of bids
      * @return ServerRequest Info describing the request to the server.
      */
  buildRequests: function(validBidRequests, bidderRequest) {
    return {
      method: 'POST',
      url: SMAATO_ENDPOINT,
      data: buildOpenRtbBidRequestPayload(validBidRequests, bidderRequest)
    };
  },
  /**
      * Unpack the response from the server into a list of bids.
      *
      * @param {ServerResponse} serverResponse A successful response from the server.
      * @return {Bid[]} An array of bids which were nested inside the server.
      */
  interpretResponse: function(serverResponse, bidRequest) {
    // const serverBody  = serverResponse.body;
    // const headerValue = serverResponse.headers.get('some-response-header');
    const res = serverResponse.body;
    var bids = []
    if (res) {
      res.seatbid.forEach(sb => {
        sb.bid.forEach(b => {
          bids.push({
            requestId: b.impid,
            cpm: b.price || 0,
            width: b.w,
            height: b.h,
            ad: b.adm,
            ttl: 1000,
            creativeId: b.crid,
            netRevenue: false,
            currency: res.cur
          })
        })
      });
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
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
    return syncs;
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
