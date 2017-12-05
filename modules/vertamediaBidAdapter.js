import * as utils from 'src/utils';
import {registerBidder} from 'src/adapters/bidderFactory';
import {VIDEO} from 'src/mediaTypes';

const URL = '//rtb.vertamedia.com/hb/';
const BIDDER_CODE = 'vertamedia';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [VIDEO],
  isBidRequestValid: function (bid) {
    return Boolean(bid && bid.params && bid.params.aid);
  },

  /**
   * Make a server request from the list of BidRequests
   * @param bidRequests
   * @param bidderRequest
   */
  buildRequests: function (bidRequests, bidderRequest) {
    return bidRequests.map((bid) => {
      return {
        data: prepareRTBRequestParams(bid),
        bidderRequest,
        method: 'GET',
        url: URL
      }
    });
  },

  /**
   * Unpack the response from the server into a list of bids
   * @param serverResponse
   * @param bidderRequest
   * @return {Bid[]} An array of bids which were nested inside the server
   */
  interpretResponse: function (serverResponse, {bidderRequest}) {
    serverResponse = serverResponse.body;
    const isInvalidValidResp = !serverResponse || !serverResponse.bids || !serverResponse.bids.length;
    let bids = [];

    if (isInvalidValidResp) {
      let extMessage = serverResponse && serverResponse.ext && serverResponse.ext.message ? `: ${serverResponse.ext.message}` : '';
      let errorMessage = `in response for ${bidderRequest.bidderCode} adapter ${extMessage}`;

      utils.logError(errorMessage);

      return bids;
    }

    serverResponse.bids.forEach(serverBid => {
      if (serverBid.cpm !== 0) {
        const bid = createBid(serverBid);
        bids.push(bid);
      }
    });

    return bids;
  },
};

/**
 * Prepare all parameters for request
 * @param bid {object}
 * @returns {object}
 */
function prepareRTBRequestParams(bid) {
  let size = getSize(bid.sizes);

  return {
    domain: utils.getTopWindowLocation().hostname,
    callbackId: bid.bidId,
    aid: bid.params.aid,
    h: size.height,
    w: size.width
  };
}

/**
 * Prepare size for request
 * @param requestSizes {array}
 * @returns {object} bid The bid to validate
 */
function getSize(requestSizes) {
  const size = utils.parseSizesInput(requestSizes)[0];
  const parsed = {};

  if (typeof size !== 'string') {
    return parsed;
  }

  let parsedSize = size.toUpperCase().split('X');

  return {
    height: parseInt(parsedSize[1], 10) || undefined,
    width: parseInt(parsedSize[0], 10) || undefined
  };
}

/**
 * Configure new bid by response
 * @param bidResponse {object}
 * @returns {object}
 */
function createBid(bidResponse) {
  return {
    requestId: bidResponse.requestId,
    creativeId: bidResponse.cmpId,
    vastUrl: bidResponse.vastUrl,
    height: bidResponse.height,
    currency: bidResponse.cur,
    width: bidResponse.width,
    cpm: bidResponse.cpm,
    mediaType: 'video',
    netRevenue: true,
    ttl: 3600
  };
}

registerBidder(spec);
