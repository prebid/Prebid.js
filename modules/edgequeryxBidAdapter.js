import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'edgequeryx';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['eqx'], // short code
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params && bid.params.accountId && bid.params.widgetId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} validBidRequests an array of bids
   * @param {BidderRequest} bidderRequest bidder request object
   * @return {ServerRequest[]} Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    // use bidderRequest.bids[] to get bidder-dependent request info
    // if your bidder supports multiple currencies, use config.getConfig(currency)
    // to find which one the ad server needs

    // pull requested transaction ID from bidderRequest.bids[].transactionId
    return validBidRequests.map(bid => {
      // Common bid request attributes for banner, outstream and instream.
      let payload = {
        accountId: bid.params.accountId,
        widgetId: bid.params.widgetId,
        currencyCode: 'EUR',
        tagId: bid.adUnitCode,
        transactionId: bid.transactionId,
        timeout: config.getConfig('bidderTimeout'),
        bidId: bid.bidId,
        prebidVersion: '$prebid.version$'
      };

      const bannerMediaType = utils.deepAccess(bid, 'mediaTypes.banner');
      payload.sizes = bannerMediaType.sizes.map(size => ({
        w: size[0],
        h: size[1]
      }));

      var payloadString = JSON.stringify(payload);

      return {
        method: 'POST',
        url: (bid.params.domain !== undefined ? bid.params.domain : 'https://deep.edgequery.io') + '/prebid/x',
        data: payloadString,
      };
    });
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @param {*} bidRequestString
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequestString) {
    const bidResponses = [];
    let response = serverResponse.body;
    try {
      if (response) {
        let bidResponse = {
          requestId: response.requestId,
          cpm: response.cpm,
          currency: response.currency,
          width: response.width,
          height: response.height,
          ad: response.ad,
          ttl: response.ttl,
          creativeId: response.creativeId,
          netRevenue: response.netRevenue
        };

        bidResponses.push(bidResponse);
      }
    } catch (error) {
      utils.logError('Error while parsing Edge Query X response', error);
    }
    return bidResponses;
  }

};

registerBidder(spec);
