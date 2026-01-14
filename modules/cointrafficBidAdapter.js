import { parseSizesInput, logError, isEmpty } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js'
import { config } from '../src/config.js'
import { getCurrencyFromBidderRequest } from '../libraries/ortb2Utils/currency.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').BidderSpec} BidderSpec
 */

const BIDDER_CODE = 'cointraffic';
const ENDPOINT_URL = 'https://apps-pbd.ctraffic.io/pb/tmp';
const DEFAULT_CURRENCY = 'EUR';
const ALLOWED_CURRENCIES = [
  'EUR', 'USD', 'JPY', 'BGN', 'CZK', 'DKK', 'GBP', 'HUF', 'PLN', 'RON', 'SEK', 'CHF', 'ISK', 'NOK', 'HRK', 'RUB', 'TRY',
  'AUD', 'BRL', 'CAD', 'CNY', 'HKD', 'IDR', 'ILS', 'INR', 'KRW', 'MXN', 'MYR', 'NZD', 'PHP', 'SGD', 'THB', 'ZAR',
];

/** @type {BidderSpec} */
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.placementId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param validBidRequests
   * @param bidderRequest
   * @return Array Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bidRequest => {
      const sizes = parseSizesInput(bidRequest.params.size || bidRequest.sizes);
      const currency =
        config.getConfig(`currency.bidderCurrencyDefault.${BIDDER_CODE}`) ||
        getCurrencyFromBidderRequest(bidderRequest) ||
        DEFAULT_CURRENCY;

      if (ALLOWED_CURRENCIES.indexOf(currency) === -1) {
        logError('Currency is not supported - ' + currency);
        return undefined;
      }

      const payload = {
        placementId: bidRequest.params.placementId,
        currency: currency,
        sizes: sizes,
        bidId: bidRequest.bidId,
        referer: bidderRequest.refererInfo.ref,
      };

      return {
        method: 'POST',
        url: ENDPOINT_URL,
        data: payload
      };
    }).filter((request) => request !== undefined);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param bidRequest
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    const response = serverResponse.body;

    if (isEmpty(response)) {
      return bidResponses;
    }

    const bidResponse = {
      requestId: response.requestId,
      cpm: response.cpm,
      currency: response.currency,
      netRevenue: response.netRevenue,
      width: response.width,
      height: response.height,
      creativeId: response.creativeId,
      ttl: response.ttl,
      ad: response.ad,
      meta: {
        advertiserDomains: response.adomain && response.adomain.length ? response.adomain : [],
        mediaType: response.mediaType
      }
    };

    bidResponses.push(bidResponse);

    return bidResponses;
  }
};

registerBidder(spec);
