import * as utils from '../src/utils';
import {registerBidder} from '../src/adapters/bidderFactory';

const BIDDER_CODE = 'admixer';
const ALIASES = ['go2net'];
const ENDPOINT_URL = 'https://inv-nets.admixer.net/prebid.1.0.aspx';
export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: ['banner', 'video'],
  /**
   * Determines whether or not the given bid request is valid.
   */
  isBidRequestValid: function (bid) {
    return !!bid.params.zone;
  },
  /**
   * Make a server request from the list of BidRequests.
   */
  buildRequests: function (validRequest, bidderRequest) {
    const payload = {
      imps: [],
      referrer: encodeURIComponent(bidderRequest.refererInfo.referer),
    };
    validRequest.forEach((bid) => {
      payload.imps.push(bid);
    });
    const payloadString = JSON.stringify(payload);
    return {
      method: 'GET',
      url: ENDPOINT_URL,
      data: `data=${payloadString}`,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    // loop through serverResponses {
    try {
      serverResponse = serverResponse.body;
      serverResponse.forEach((bidResponse) => {
        const bidResp = {
          requestId: bidResponse.bidId,
          cpm: bidResponse.cpm,
          width: bidResponse.width,
          height: bidResponse.height,
          ad: bidResponse.ad,
          ttl: bidResponse.ttl,
          creativeId: bidResponse.creativeId,
          netRevenue: bidResponse.netRevenue,
          currency: bidResponse.currency,
          vastUrl: bidResponse.vastUrl,
        };
        bidResponses.push(bidResp);
      });
    } catch (e) {
      utils.logError(e);
    }
    return bidResponses;
  }
};
registerBidder(spec);
