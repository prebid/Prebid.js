import {registerBidder} from 'src/adapters/bidderFactory';
import {BANNER} from '../src/mediaTypes';

const BIDDER_CODE = 'finn';
const ENDPOINT_URL = 'https://www.finn.no/distribution/ssp';

export const spec = {
  code: BIDDER_CODE,
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: bidRequest =>
    (typeof bidRequest !== 'undefined' &&
      typeof bidRequest.bids !== 'undefined' &&
      bidRequest.bids.length > 0 &&
      typeof bidRequest.bids[0].adUnitCode !== 'undefined' &&
      typeof bidRequest.bids[0].auctionId !== 'undefined' &&
      typeof bidRequest.bids[0].bidId !== 'undefined' &&
      typeof bidRequest.bids[0].bidderRequestId !== 'undefined' &&
      typeof bidRequest.bids[0].sizes !== 'undefined' &&
      typeof bidRequest.bids[0].transactionId !== 'undefined'),

  /**
   * Make a server request from the list of BidRequests.
   *
   * @return ServerRequest Info describing the request to the server.
   * @param validBidRequests
   * @param bidderRequest
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    let finnRequests = [];
    let referer = window.location.href;
    try {
      referer = typeof bidderRequest.refererInfo === 'undefined'
        ? window.top.location.href
        : bidderRequest.refererInfo.referer;
    } catch (e) {
    }
    validBidRequests.forEach(validBidRequest => {
      finnRequests.push({
        adUnitCode: validBidRequest.adUnitCode,
        auctionId: validBidRequest.auctionId,
        bidId: validBidRequest.bidId,
        bidderRequestId: validBidRequest.bidderRequestId,
        referer: referer,
        sizes: validBidRequest.sizes,
        transactionId: validBidRequest.transactionId,
      });
    });

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(finnRequests)
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @return {Bid[]} An array of bids which were nested inside the server.
   * @param finnResponseObject
   * @param bidRequest
   */
  interpretResponse: (finnResponseObject, bidRequest) => {
    const bidResponses = [];
    if (finnResponseObject.body && finnResponseObject.body.constructor === Array) {
      finnResponseObject.body.forEach(bidResponse => {
        bidResponses.push({
          requestId: bidResponse.bidId,
          cpm: bidResponse.price || 0,
          width: bidResponse.width,
          height: bidResponse.height,
          creativeId: bidResponse.creativeId,
          dealId: bidResponse.deal || null,
          currency: 'NOK',
          netRevenue: bidResponse.priceType,
          ttl: bidResponse.ttl,
          mediaType: BANNER,
          ad: bidResponse.creative
        });
      });
    }

    return bidResponses;
  },
};

registerBidder(spec);
