import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const LOOPME_ENDPOINT = 'https://loopme.me/api/hb';

const entries = (obj) => {
  let output = [];
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      output.push([key, obj[key]])
    }
  }
  return output;
}

export const spec = {
  code: 'loopme',
  supportedMediaTypes: [BANNER],
  /**
   * @param {object} bid
   * @return boolean
   */
  isBidRequestValid: function(bid) {
    if (typeof bid.params !== 'object') {
      return false;
    }

    return !!bid.params.ak;
  },
  /**
   * @param {BidRequest[]} bidRequests
   * @param bidderRequest
   * @return ServerRequest[]
   */
  buildRequests: function(bidRequests, bidderRequest) {
    return bidRequests.map(bidRequest => {
      bidRequest.startTime = new Date().getTime();
      let payload = bidRequest.params;

      if (bidderRequest && bidderRequest.gdprConsent) {
        payload.user_consent = bidderRequest.gdprConsent.consentString;
      }

      let queryString = entries(payload)
        .map(item => `${item[0]}=${encodeURI(item[1])}`)
        .join('&');

      const sizes =
        '&sizes=' +
        utils
          .getAdUnitSizes(bidRequest)
          .map(size => `${size[0]}x${size[1]}`)
          .join('&sizes=');

      queryString = `${queryString}${sizes}`;

      return {
        method: 'GET',
        url: `${LOOPME_ENDPOINT}`,
        options: { withCredentials: false },
        bidId: bidRequest.bidId,
        data: queryString
      };
    });
  },
  /**
   * @param {*} responseObj
   * @param {BidRequest} bidRequest
   * @return {Bid[]} An array of bids which
   */
  interpretResponse: function(response = {}, bidRequest) {
    const responseObj = response.body;

    if (
      responseObj == null ||
      typeof responseObj !== 'object' ||
      !responseObj.hasOwnProperty('ad')
    ) {
      return [];
    }

    return [
      {
        requestId: bidRequest.bidId,
        cpm: responseObj.cpm,
        width: responseObj.width,
        height: responseObj.height,
        ad: responseObj.ad,
        ttl: responseObj.ttl,
        currency: responseObj.currency,
        creativeId: responseObj.creativeId,
        dealId: responseObj.dealId,
        netRevenue: responseObj.netRevenue
      }
    ];
  }
};
registerBidder(spec);
