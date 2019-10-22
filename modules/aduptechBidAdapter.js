import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes'

export const BIDDER_CODE = 'aduptech';
export const PUBLISHER_PLACEHOLDER = '{PUBLISHER}';
export const ENDPOINT_URL = 'https://rtb.d.adup-tech.com/prebid/' + PUBLISHER_PLACEHOLDER + '_bid';
export const ENDPOINT_METHOD = 'POST';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    return !!(bid &&
      bid.sizes &&
      bid.sizes.length > 0 &&
      bid.params &&
      bid.params.publisher &&
      bid.params.placement);
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const bidRequests = [];

    // collect GDPR information
    let gdpr = null;
    if (bidderRequest && bidderRequest.gdprConsent) {
      gdpr = {
        consentString: bidderRequest.gdprConsent.consentString,
        consentRequired: (typeof bidderRequest.gdprConsent.gdprApplies === 'boolean') ? bidderRequest.gdprConsent.gdprApplies : true
      };
    }

    validBidRequests.forEach((bidRequest) => {
      bidRequests.push({
        url: ENDPOINT_URL.replace(PUBLISHER_PLACEHOLDER, encodeURIComponent(bidRequest.params.publisher)),
        method: ENDPOINT_METHOD,
        data: {
          pageUrl: utils.getTopWindowUrl(),
          referrer: utils.getTopWindowReferrer(),
          bidId: bidRequest.bidId,
          auctionId: bidRequest.auctionId,
          transactionId: bidRequest.transactionId,
          adUnitCode: bidRequest.adUnitCode,
          sizes: bidRequest.sizes,
          params: bidRequest.params,
          gdpr: gdpr
        }
      });
    });

    return bidRequests;
  },

  interpretResponse: (response) => {
    const bidResponses = [];

    if (!response.body || !response.body.bid || !response.body.creative) {
      return bidResponses;
    }

    bidResponses.push({
      requestId: response.body.bid.bidId,
      cpm: response.body.bid.price,
      netRevenue: response.body.bid.net,
      currency: response.body.bid.currency,
      ttl: response.body.bid.ttl,
      creativeId: response.body.creative.id,
      width: response.body.creative.width,
      height: response.body.creative.height,
      ad: response.body.creative.html
    });

    return bidResponses;
  }
};

registerBidder(spec);
