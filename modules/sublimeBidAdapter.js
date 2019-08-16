import { registerBidder } from '../src/adapters/bidderFactory';
import { config } from '../src/config';

const BIDDER_CODE = 'sublime';
const DEFAULT_BID_HOST = 'pbjs.sskzlabs.com';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_PROTOCOL = 'https';
const DEFAULT_TTL = 600;
const SUBLIME_VERSION = '0.4.0';

export const spec = {
  code: BIDDER_CODE,
  aliases: [],

  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: (bid) => {
    return !!bid.params.zoneId;
  },

  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {BidRequest[]} validBidRequests An array of bids
     * @param {Object} bidderRequest - Info describing the request to the server.
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: (validBidRequests, bidderRequest) => {
    let commonPayload = {
      sublimeVersion: SUBLIME_VERSION,
      // Current Prebid params
      prebidVersion: '$prebid.version$',
      currencyCode: config.getConfig('currency.adServerCurrency') || DEFAULT_CURRENCY,
      timeout: config.getConfig('bidderTimeout'),
    };

    // RefererInfo
    if (bidderRequest && bidderRequest.refererInfo) {
      commonPayload.referer = bidderRequest.refererInfo.referer;
      commonPayload.numIframes = bidderRequest.refererInfo.numIframes;
    }
    // GDPR handling
    if (bidderRequest && bidderRequest.gdprConsent) {
      commonPayload.gdprConsent = bidderRequest.gdprConsent.consentString;
      commonPayload.gdpr = bidderRequest.gdprConsent.gdprApplies; // we're handling the undefined case server side
    }

    return validBidRequests.map(bid => {
      let bidPayload = {
        adUnitCode: bid.adUnitCode,
        auctionId: bid.auctionId,
        bidder: bid.bidder,
        bidderRequestId: bid.bidderRequestId,
        bidRequestsCount: bid.bidRequestsCount,
        requestId: bid.bidId,
        sizes: bid.sizes.map(size => ({
          w: size[0],
          h: size[1],
        })),
        transactionId: bid.transactionId,
        zoneId: bid.params.zoneId,
      };

      let protocol = bid.params.protocol || DEFAULT_PROTOCOL;
      let bidHost = bid.params.bidHost || DEFAULT_BID_HOST;
      let payload = Object.assign({}, commonPayload, bidPayload);

      return {
        method: 'POST',
        url: protocol + '://' + bidHost + '/bid',
        data: payload,
        options: {
          contentType: 'application/json',
          withCredentials: true
        },
      };
    });
  },

  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {*} serverResponse A successful response from the server.
     * @param {*} bidRequest An object with bid request informations
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: (serverResponse, bidRequest) => {
    const bidResponses = [];
    const response = serverResponse.body;

    if (response) {
      if (response.timeout || !response.ad || response.ad.match(/<!-- No ad -->/gmi)) {
        return bidResponses;
      }

      // Setting our returned sizes object to default values
      let returnedSizes = {
        width: 1800,
        height: 1000
      };

      // Verifying Banner sizes
      if (bidRequest && bidRequest.data && bidRequest.data.w === 1 && bidRequest.data.h === 1) {
        // If banner sizes are 1x1 we set our default size object to 1x1
        returnedSizes = {
          width: 1,
          height: 1
        };
      }

      const bidResponse = {
        requestId: response.requestId || '',
        cpm: response.cpm || 0,
        width: response.width || returnedSizes.width,
        height: response.height || returnedSizes.height,
        creativeId: response.creativeId || 1,
        dealId: response.dealId || 1,
        currency: response.currency || DEFAULT_CURRENCY,
        netRevenue: response.netRevenue || true,
        ttl: response.ttl || DEFAULT_TTL,
        ad: response.ad,
      };

      bidResponses.push(bidResponse);
    }

    return bidResponses;
  },
};

registerBidder(spec);
