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
        contentType: 'text/plain',
        withCredentials: true,
        method: 'GET',
        url: URL,
        data: prepareRTBRequestParams(bid),
        bidderRequest
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
        const bid = createBid(serverBid, bidderRequest);
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
    aid: bid.params.aid,
    w: size.width,
    h: size.height,
    callbackId: bid.bidId,
    domain: utils.getTopWindowLocation().hostname
  };
}

/**
 * Prepare size for request
 * @param requestSizes {array}
 * @returns {object} bid The bid to validate
 */
function getSize(requestSizes) {
  const parsed = {};
  const size = utils.parseSizesInput(requestSizes)[0];

  if (typeof size !== 'string') {
    return parsed;
  }

  let parsedSize = size.toUpperCase().split('X');

  return {
    width: parseInt(parsedSize[0], 10) || undefined,
    height: parseInt(parsedSize[1], 10) || undefined
  };
}

/**
 * Configure new bid by response
 * @param bidRequest {object}
 * @param bidResponse {object}
 * @returns {object}
 */
function createBid(bidResponse, bidRequest) {
  return {
    bidderCode: bidRequest.bidderCode,
    mediaType: 'video',
    cpm: bidResponse.cpm,
    requestId: bidResponse.requestId,
    creative_id: bidResponse.cmpId,
    width: bidResponse.width,
    height: bidResponse.height,
    descriptionUrl: bidResponse.url,
    vastUrl: bidResponse.vastUrl,
    currency: bidResponse.cur
  };
}

registerBidder(spec);
