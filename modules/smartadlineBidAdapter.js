import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';
const BIDDER_CODE = 'smartadline';
const ENDPOINT_URL = 'https://smartadline.com/hb.php';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  aliases: [{code: 'smartadline'}],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.publisherId);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(validBidRequests, bidderRequests) {
    let bids = [];
    for (var i = 0; i < validBidRequests.length; i++) {
      var bid = validBidRequests[i];
      var params = bid.params;
      var bidId = bid.bidId;
      var placementCode = bid.placementCode;
      var publisherId = params.publisherId;
      var bidfloor = params.bidfloor;
      var bidfloorcur = params.bidfloorcur;
      var bidRequest = {
        id: bidId,
        auctionId: bid.auctionId,
        sizes: bid.sizes,
        imp: [{
          id: bidId,
          banner: {
            format: []
          },
          tagid: placementCode,
          bidfloor: bidfloor,
          bidfloorcur: bidfloorcur
        }],
        site: {
          publisher: {
            id: publisherId
          },
          page: window.location.href
        },
        device: {
          ua: navigator.userAgent,
        },
      };
      bids.push(bidRequest);
    }

    const payload = {
      hb_version: '$prebid.version$',
      auctionId: bidderRequests.auctionId,
      bids: bids
    };

    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payloadString,
    };
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

    if (serverBody) {
      serverBody.forEach(bid => {
        const bidResponse = {
          requestId: bid.bidId,
          cpm: bid.cpm,
          width: bid.width,
          height: bid.height,
          creativeId: bid.creativeId,
          currency: bid.currency,
          netRevenue: true,
          ttl: bid.ttl,
          // referrer: REFERER, // @TODO: try to understand do we need it
          ad: bid.ad
        };

        if (bid.dealId) { // @TODO: check if we need this
          bidResponse.dealId = bid.dealId
        }

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
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []

    var gdprParams;
    if (typeof gdprConsent.gdprApplies === 'boolean') {
      gdprParams = `gdpr=${Number(gdprConsent.gdprApplies)}&gdpr_consent=${gdprConsent.consentString}`;
    } else {
      gdprParams = `gdpr_consent=${gdprConsent.consentString}`;
    }

    if (syncOptions.iframeEnabled) {
      syncs.push({
        type: 'iframe',
        url: '//acdn.adnxs.com/ib/static/usersync/v3/async_usersync.html?' + gdprParams
      });
    }
    if (syncOptions.pixelEnabled && serverResponses.length > 0) {
      syncs.push({
        type: 'image',
        url: serverResponses[0].body.userSync.url + gdprParams
      });
    }
    return syncs;
  }
};
registerBidder(spec);
