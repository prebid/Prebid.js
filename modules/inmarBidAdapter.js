import { logError } from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'inmar';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['inm'],
  supportedMediaTypes: [BANNER, VIDEO],

  /**
   * Determines whether or not the given bid request is valid
   *
   * @param {bidRequest} bid The bid params to validate.
   * @returns {boolean} True if this is a valid bid, and false otherwise
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params && bid.params.partnerId);
  },

  /**
   * Build a server request from the list of valid BidRequests
   * @param {validBidRequests} is an array of the valid bids
   * @param {bidderRequest} bidder request object
   * @returns {ServerRequest} Info describing the request to the server
   */
  buildRequests: function(validBidRequests, bidderRequest) {
    var payload = {
      bidderCode: bidderRequest.bidderCode,
      auctionId: bidderRequest.auctionId,
      bidderRequestId: bidderRequest.bidderRequestId,
      bidRequests: validBidRequests,
      auctionStart: bidderRequest.auctionStart,
      timeout: bidderRequest.timeout,
      refererInfo: bidderRequest.refererInfo,
      start: bidderRequest.start,
      gdprConsent: bidderRequest.gdprConsent,
      uspConsent: bidderRequest.uspConsent,
      currencyCode: config.getConfig('currency.adServerCurrency'),
      coppa: config.getConfig('coppa'),
      firstPartyData: config.getLegacyFpd(config.getConfig('ortb2')),
      prebidVersion: '$prebid.version$'
    };

    var payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: 'https://prebid.owneriq.net:8443/bidder/pb/bid',
      data: payloadString,
    };
  },

  /**
   * Read the response from the server and build a list of bids
   * @param {serverResponse} Response from the server.
   * @param {bidRequest} Bid request object
   * @returns {bidResponses} Array of bids which were nested inside the server
   */
  interpretResponse: function(serverResponse, bidRequest) {
    const bidResponses = [];
    var response = serverResponse.body;

    try {
      if (response) {
        var bidResponse = {
          requestId: response.requestId,
          cpm: response.cpm,
          currency: response.currency,
          width: response.width,
          height: response.height,
          ad: response.ad,
          ttl: response.ttl,
          creativeId: response.creativeId,
          netRevenue: response.netRevenue,
          vastUrl: response.vastUrl,
          dealId: response.dealId,
          meta: response.meta
        };

        bidResponses.push(bidResponse);
      }
    } catch (error) {
      logError('Error while parsing inmar response', error);
    }
    return bidResponses;
  },

  /**
   * User Syncs
   *
   * @param {syncOptions} Publisher prebid configuration
   * @param {serverResponses} Response from the server
   * @returns {Array}
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: 'https://px.owneriq.net/eucm/p/pb'
      });
    }
    return syncs;
  }
};

registerBidder(spec);
