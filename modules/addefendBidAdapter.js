import {registerBidder} from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'addefend';

export const spec = {
  code: BIDDER_CODE,
  hostname: 'https://addefend-platform.com',

  getHostname() {
    return this.hostname;
  },
  isBidRequestValid: function(bid) {
    return (bid.sizes !== undefined && bid.bidId !== undefined && bid.params !== undefined &&
              (bid.params.pageId !== undefined && (typeof bid.params.pageId === 'string')) &&
              (bid.params.placementId !== undefined && (typeof bid.params.placementId === 'string')));
  },
  buildRequests: function(validBidRequests, bidderRequest) {
    let bid = {
      v: $$PREBID_GLOBAL$$.version,
      auctionId: false,
      pageId: false,
      gdpr_applies: bidderRequest.gdprConsent && bidderRequest.gdprConsent.gdprApplies ? bidderRequest.gdprConsent.gdprApplies : 'true',
      gdpr_consent: bidderRequest.gdprConsent && bidderRequest.gdprConsent.consentString ? bidderRequest.gdprConsent.consentString : '',
      referer: bidderRequest.refererInfo.referer,
      bids: [],
    };

    for (var i = 0; i < validBidRequests.length; i++) {
      let vb = validBidRequests[i];
      let o = vb.params;
      bid.auctionId = vb.auctionId;
      o.bidId = vb.bidId;
      o.transactionId = vb.transactionId;
      o.sizes = [];
      if (o.trafficTypes) {
        bid.trafficTypes = o.trafficTypes;
      }
      delete o.trafficTypes;

      bid.pageId = o.pageId;
      delete o.pageId;

      if (vb.sizes && Array.isArray(vb.sizes)) {
        for (var j = 0; j < vb.sizes.length; j++) {
          let s = vb.sizes[j];
          if (Array.isArray(s) && s.length == 2) {
            o.sizes.push(s[0] + 'x' + s[1]);
          }
        }
      }
      bid.bids.push(o);
    }
    return [{
      method: 'POST',
      url: this.getHostname() + '/bid',
      options: { withCredentials: true },
      data: bid
    }];
  },
  interpretResponse: function(serverResponse, request) {
    const requiredKeys = ['requestId', 'cpm', 'width', 'height', 'ad', 'ttl', 'creativeId', 'netRevenue', 'currency', 'advertiserDomains'];
    const validBidResponses = [];
    serverResponse = serverResponse.body;
    if (serverResponse && (serverResponse.length > 0)) {
      serverResponse.forEach((bid) => {
        const bidResponse = {};
        for (const requiredKey of requiredKeys) {
          if (!bid.hasOwnProperty(requiredKey)) {
            return [];
          }
          bidResponse[requiredKey] = bid[requiredKey];
        }
        validBidResponses.push(bidResponse);
      });
    }
    return validBidResponses;
  }
}

registerBidder(spec);
