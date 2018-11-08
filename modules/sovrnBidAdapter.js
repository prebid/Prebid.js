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
  buildRequests: function(bidReqs, bidderRequest) {
    const loc = utils.getTopWindowLocation();
    let sovrnImps = [];
    let iv;
    utils._each(bidReqs, function (bid) {
      iv = iv || utils.getBidIdParameter('iv', bid.params);
      sovrnImps.push({
        id: bid.bidId,
        banner: { w: 1, h: 1 },
        tagid: String(utils.getBidIdParameter('tagid', bid.params)),
        bidfloor: utils.getBidIdParameter('bidfloor', bid.params)
      });
    });
    const sovrnBidReq = {
      id: utils.getUniqueIdentifierStr(),
      imp: sovrnImps,
      site: {
        domain: loc.host,
        page: loc.host + loc.pathname + loc.search + loc.hash
      }
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      sovrnBidReq.regs = {
        ext: {
          gdpr: +bidderRequest.gdprConsent.gdprApplies
        }};
      sovrnBidReq.user = {
        ext: {
          consent: bidderRequest.gdprConsent.consentString
        }};
    }

    let url = `//ap.lijit.com/rtb/bid?` +
      `src=${REPO_AND_VERSION}`;
    if (iv) url += `&iv=${iv}`;

    return {
      method: 'POST',
      url: url,
      data: JSON.stringify(sovrnBidReq),
      options: {contentType: 'text/plain'}
    };
  },

  /**
   * Format Sovrn responses as Prebid bid responses
   * @param {id, seatbid} sovrnResponse A successful response from Sovrn.
   * @return {Bid[]} An array of formatted bids.
  */
  interpretResponse: function({ body: {id, seatbid} }) {
    let sovrnBidResponses = [];
    if (id &&
      seatbid &&
      seatbid.length > 0 &&
      seatbid[0].bid &&
      seatbid[0].bid.length > 0) {
      seatbid[0].bid.map(sovrnBid => {
        sovrnBidResponses.push({
          requestId: sovrnBid.impid,
          cpm: parseFloat(sovrnBid.price),
          width: parseInt(sovrnBid.w),
          height: parseInt(sovrnBid.h),
          creativeId: sovrnBid.crid || sovrnBid.id,
          dealId: sovrnBid.dealid || null,
          currency: 'USD',
          netRevenue: true,
          mediaType: BANNER,
          ad: decodeURIComponent(`${sovrnBid.adm}<img src="${sovrnBid.nurl}">`),
          ttl: 60
        });
      });
    }
    return sovrnBidResponses;
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent) {
    if (serverResponses && serverResponses.length !== 0 && syncOptions.iframeEnabled) {
      let iidArr = serverResponses.filter(rsp => rsp.body && rsp.body.ext && rsp.body.ext.iid)
        .map(rsp => { return rsp.body.ext.iid });
      let consentString = '';
      if (gdprConsent && gdprConsent.gdprApplies && typeof gdprConsent.consentString === 'string') {
        consentString = gdprConsent.consentString
      }
      if (iidArr[0]) {
        return [{
          type: 'iframe',
          url: '//ap.lijit.com/beacon?informer=' + iidArr[0] + '&gdpr_consent=' + consentString,
        }];
      }
    }
    return [];
  },
};

registerBidder(spec);
