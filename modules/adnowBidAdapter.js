import { registerBidder } from '../src/adapters/bidderFactory.js';
import { NATIVE, BANNER } from '../src/mediaTypes.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'adnow';
const ENDPOINT = '//n.ads3-adnow.com/a';

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [ NATIVE, BANNER ],

  /**
   * @param {object} bid
   * @return {boolean}
   */
  isBidRequestValid: (bid) => {
    return !!(bid && bid.params && (bid.params.codeId));
  },

  /**
   * @param {BidRequest[]} bidRequests
   * @param {*} bidderRequest
   * @return {ServerRequest}
   */
  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map(req => {
      return {
        method: 'GET',
        url: ENDPOINT,
        data: utils.parseQueryStringParameters({
          Id: req.params.codeId,
          mediaType: req.params.mediaType || 'native',
          out: 'prebid',
          d_user_agent: navigator.userAgent,
          requestid: req.bidId
        }),
        options: {
          withCredentials: false,
          crossOrigin: true
        },
        bidRequest: req
      };
    });
  },

  /**
   * @param {*} response
   * @param {ServerRequest} request
   * @return {Bid[]}
   */
  interpretResponse: (response, request) => {
    const bidObj = request.bidRequest;
    let bid = response.body;

    bid = {
      requestId: bidObj.bidId,
      ...bid,
    };

    return [bid];
  },

  /**
   * @param {TimedOutBid} timeoutData
   */
  onTimeout: (timeoutData) => {
  },

  /**
   * @param {Bid} bid
   */
  onBidWon: (bid) => {
  },

  /**
   * @param {Bid} bid
   */
  onSetTargeting: (bid) => {
  }
}

registerBidder(spec);
