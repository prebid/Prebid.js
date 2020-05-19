import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'avct';
const DEFAULT_BASE_URL = 'https://ads.avct.cloud';
const DEFAULT_PREBID_PATH = '/prebid';

function getPrebidURL() {
  let host = config.getConfig('avct.baseUrl');
  if (host && typeof host === 'string') {
    return `${host}${getPrebidPath()}`;
  }
  return `${DEFAULT_BASE_URL}${getPrebidPath()}`;
}

function getPrebidPath() {
  let prebidPath = config.getConfig('avct.prebidPath');
  if (prebidPath && typeof prebidPath === 'string') {
    return prebidPath;
  }
  return DEFAULT_PREBID_PATH;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid with params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return (
      !!bid.params &&
      !!bid.params.placement &&
      typeof bid.params.placement === 'string' &&
      bid.params.placement.length === 24
    );
  },
  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    // Get currency from config
    const currency = config.getConfig('currency.adServerCurrency');

    // Publisher domain from config
    const publisherDomain = config.getConfig('publisherDomain');

    // First-party data from config
    const fpd = config.getConfig('fpd');

    // GDPR status and TCF consent string
    let tcfConsentString;
    let gdprApplies = false;
    if (bidderRequest.gdprConsent) {
      tcfConsentString = bidderRequest.gdprConsent.consentString;
      gdprApplies = !!bidderRequest.gdprConsent.gdprApplies;
    }

    // US privacy string
    let usPrivacyString;
    if (bidderRequest.uspConsent) {
      usPrivacyString = bidderRequest.uspConsent;
    }

    // Supply chain
    let schain;
    if (bidderRequest.schain) {
      schain = bidderRequest.schain;
    }

    // ID5 identifier
    let id5id;
    if (bidRequests[0].userId && bidRequests[0].userId.id5id) {
      id5id = bidRequests[0].userId.id5id;
    }

    // Build the avocet ext object
    const ext = {
      currency,
      tcfConsentString,
      gdprApplies,
      usPrivacyString,
      schain,
      publisherDomain,
      fpd,
      id5id,
    };

    // Extract properties from bidderRequest
    const {
      auctionId,
      auctionStart,
      bidderCode,
      bidderRequestId,
      refererInfo,
      timeout,
    } = bidderRequest;

    // Construct payload
    const payload = JSON.stringify({
      auctionId,
      auctionStart,
      bidderCode,
      bidderRequestId,
      refererInfo,
      timeout,
      bids: bidRequests,
      ext,
    });

    return {
      method: 'POST',
      url: getPrebidURL(),
      data: payload,
    };
  },
  interpretResponse: function (serverResponse, bidRequest) {
    if (
      !serverResponse ||
      !serverResponse.body ||
      typeof serverResponse.body !== 'object'
    ) {
      return [];
    }
    if (Array.isArray(serverResponse.body)) {
      return serverResponse.body;
    }
    if (Array.isArray(serverResponse.body.responses)) {
      return serverResponse.body.responses;
    }
    return [];
  },
};
registerBidder(spec);
