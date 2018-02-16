import * as utils from 'src/utils';
import {
  config
} from 'src/config';
import {
  registerBidder
} from 'src/adapters/bidderFactory';
const BIDDER_CODE = 'smartadserver';
export const spec = {
  code: BIDDER_CODE,
  aliases: ['smart'], // short code
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.siteId && bid.params.pageId && bid.params.formatId && bid.params.domain);
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests) {
    // use bidderRequest.bids[] to get bidder-dependent request info

    // if your bidder supports multiple currencies, use config.getConfig(currency)
    // to find which one the ad server needs

    // pull requested transaction ID from bidderRequest.bids[].transactionId
    var bid = validBidRequests[0];
    const payload = {
      siteid: bid.params.siteId,
      pageid: bid.params.pageId,
      formatid: bid.params.formatId,
      currencyCode: config.getConfig('currency.adServerCurrency'),
      bidfloor: bid.params.bidfloor || 0.0,
      targeting: bid.params.target && bid.params.target != '' ? bid.params.target : undefined,
      tagId: bid.adUnitCode,
      sizes: bid.sizes.map(size => ({
        w: size[0],
        h: size[1]
      })),
      pageDomain: utils.getTopWindowUrl(),
      transactionId: bid.transactionId,
      timeout: config.getConfig('bidderTimeout'),
      bidId: bid.bidId
    };
    const payloadString = JSON.stringify(payload);
    return {
      method: 'POST',
      url: bid.params.domain + '/prebid/v1',
      data: payloadString,
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    var response = serverResponse.body;
    try {
      if (response) {
        const bidResponse = {
          requestId: JSON.parse(bidRequest.data).bidId,
          cpm: response.cpm,
          width: response.width,
          height: response.height,
          creativeId: response.creativeId,
          dealId: response.dealId,
          currency: response.currency,
          netRevenue: response.isNetCpm,
          ttl: response.ttl,
          referrer: utils.getTopWindowUrl(),
          adUrl: response.adUrl,
          ad: response.ad
        };
        bidResponses.push(bidResponse);
      }
    } catch (error) {
      console.log('Error while parsing smart server response');
    }
    return bidResponses;
  }
}
registerBidder(spec);
