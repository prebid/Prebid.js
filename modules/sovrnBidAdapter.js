import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';
import { REPO_AND_VERSION } from 'src/constants';

export const spec = {
  code: 'sovrn',
  supportedMediaTypes: [BANNER],

  /**
   * Check if the bid is a valid zone ID in either number or string form
   * @param {object} bid the Sovrn bid to validate
   * @return boolean for whether or not a bid is valid
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.tagid && !isNaN(parseFloat(bid.params.tagid)) && isFinite(bid.params.tagid));
  },

  /**
   * Format the bid request object for our endpoint
   * @param {BidRequest[]} bidRequests Array of Sovrn bidders
   * @return object of parameters for Prebid AJAX request
   */
  buildRequests: function(bidReqs) {
    let sovrnImps = [];
    utils._each(bidReqs, function (bid) {
      const tagId = utils.getBidIdParameter('tagid', bid.params);
      const bidFloor = utils.getBidIdParameter('bidfloor', bid.params);
      var imp = {
        id: bid.bidId,
        banner: { w: 1, h: 1 },
        tagid: tagId,
        bidfloor: bidFloor
      };
      sovrnImps.push(imp);
    });
    var sovrnBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: sovrnImps,
      site: {
        domain: window.location.host,
        page: window.location.pathname + location.search + location.hash
      }
    };
    const payloadString = JSON.stringify(sovrnBidReq);
    return {
      method: 'POST',
      url: `//ap.lijit.com/rtb/bid?src=${REPO_AND_VERSION}`,
      data: payloadString,
      options: {contentType: 'text/plain'}
    };
  },

  /**
   * Format Sovrn responses as Prebid bid responses
   * @param {*} sovrnResponse A successful response from Sovrn.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function({id, seatbid}) {
    let sovrnBidResponses = [];
    if (id &&
      seatbid &&
      seatbid.length > 0 &&
      seatbid[0].bid &&
      seatbid[0].bid.length > 0) {
      seatbid[0].bid.map(sovrnBid => {
        sovrnBidResponses.push({
          requestId: sovrnBid.impid,
          bidderCode: spec.code,
          cpm: parseFloat(sovrnBid.price),
          width: parseInt(sovrnBid.w),
          height: parseInt(sovrnBid.h),
          creativeId: sovrnBid.id,
          dealId: sovrnBid.dealId || null,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: decodeURIComponent(`${sovrnBid.adm}<img src=${sovrnBid.nurl}>`),
          ttl: 60000
        });
      });
    }
    return sovrnBidResponses;
  }
};

registerBidder(spec);
