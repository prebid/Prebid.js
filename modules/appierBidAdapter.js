import { registerBidder } from 'src/adapters/bidderFactory';
import { BANNER } from 'src/mediaTypes';
import { config } from 'src/config';

export const ADAPTER_VERSION = '1.0.0';
const SUPPORTED_AD_TYPES = [BANNER];

// we have different servers for different regions / farms
export const API_SERVERS_MAP = {
  'default': 'ad2.apx.appier.net',
  'tw': 'ad2.apx.appier.net',
  'jp': 'ad-jp.apx.appier.net'
};

const BIDDER_API_ENDPOINT = '/v1/prebid/bid';

export const spec = {
  code: 'appier',
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return typeof bid.params.hzid === 'string';
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {bidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    if (bidRequests.length === 0) {
      return [];
    }
    const server = this.getApiServer();
    const bidderApiUrl = `//${server}${BIDDER_API_ENDPOINT}`
    const payload = {
      'bids': bidRequests,
      'refererInfo': bidderRequest.refererInfo,
      'version': ADAPTER_VERSION
    };
    return [{
      method: 'POST',
      url: bidderApiUrl,
      data: payload,
      // keep the bidder request object for later use
      bidderRequest: bidderRequest
    }];
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {serverResponse} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, serverRequest) {
    if (!Array.isArray(serverResponse.body)) {
      return [];
    }
    // server response body is an array of bid results
    const bidResults = serverResponse.body;
    // our server directly returns the format needed by prebid.js so no more
    // transformation is needed here.
    return bidResults;
  },

  /**
   * Get the hostname of the server we want to use.
   */
  getApiServer() {
    // we may use different servers for different farms (geographical regions)
    // if a server is specified explicitly, use it. otherwise, use farm specific server.
    let server = config.getConfig('appier.server');
    if (!server) {
      const farm = config.getConfig('appier.farm');
      server = API_SERVERS_MAP[farm] || API_SERVERS_MAP['default'];
    }
    return server;
  }
};

registerBidder(spec);
