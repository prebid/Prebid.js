import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { deepAccess, deepSetValue } from '../src/utils.js';
import { config } from '../src/config.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 * @typedef {import('../src/adapters/bidderFactory.js').BidderRequest} BidderRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'dsp_geniee';
const ENDPOINT_URL = 'https://rt.gsspat.jp/prebid_auction';
const ENDPOINT_URL_UNCOMFORTABLE = 'https://rt.gsspat.jp/prebid_uncomfortable';
const ENDPOINT_USERSYNC = 'https://rt.gsspat.jp/prebid_cs';
const VALID_CURRENCIES = ['USD', 'JPY'];
const converter = ortbConverter({
  context: { ttl: 300, netRevenue: true },
  // set optional parameters
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    deepSetValue(imp, 'ext', bidRequest.params);
    return imp;
  }
});

function USPConsent(consent) {
  return typeof consent === 'string' && consent[0] === '1' && consent.toUpperCase()[2] === 'Y';
}

function invalidCurrency(currency) {
  return typeof currency === 'string' && VALID_CURRENCIES.indexOf(currency.toUpperCase()) === -1;
}

function hasTest(imp) {
  if (typeof imp !== 'object') {
    return false;
  }
  for (let i = 0; i < imp.length; i++) {
    if (deepAccess(imp[i], 'ext.test') === 1) {
      return true;
    }
  }
  return false;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} _ The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (_) {
    return true;
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests} validBidRequests - an array of bids
   * @param {BidderRequest} bidderRequest - the master bidRequest object
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    if (deepAccess(bidderRequest, 'gdprConsent.gdprApplies') || // gdpr
            USPConsent(bidderRequest.uspConsent) || // usp
            config.getConfig('coppa') || // coppa
            invalidCurrency(config.getConfig('currency.adServerCurrency')) // currency validation
    ) {
      return {
        method: 'GET',
        url: ENDPOINT_URL_UNCOMFORTABLE
      };
    }

    const payload = converter.toORTB({ validBidRequests, bidderRequest });

    if (hasTest(deepAccess(payload, 'imp'))) {
      deepSetValue(payload, 'test', 1);
    }

    deepSetValue(payload, 'at', 1); // first price auction only

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: payload
    };
  },
  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {ServerResponse} serverResponse A successful response from the server.
   * @param {BidRequest} bidRequest - the master bidRequest object
   * @return {bids} - An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    if (!serverResponse.body) { // empty response (no bids)
      return [];
    }
    const bids = converter.fromORTB({ response: serverResponse.body, request: bidRequest.data }).bids;
    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = [];
    // gdpr & usp
    if (deepAccess(gdprConsent, 'gdprApplies') || USPConsent(uspConsent)) {
      return syncs;
    }
    if (syncOptions.pixelEnabled) {
      syncs.push({
        type: 'image',
        url: ENDPOINT_USERSYNC
      });
    }
    return syncs;
  }
};
registerBidder(spec);
