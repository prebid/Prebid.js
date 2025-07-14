import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { chunk } from '../libraries/chunk/chunk.js';
import {
  deepAccess,
  deepClone,
  deepSetValue,
  logError,
  logWarn,
} from '../src/utils.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'nativery';
const BIDDER_ALIAS = ['nat'];
const ENDPOINT = 'https://hb.nativery.com/openrtb2/auction';
const DEFAULT_CURRENCY = 'EUR';
const TTL = 30;
const MAX_IMPS_PER_REQUEST = 10;
const GVLID = 1133;

export const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: DEFAULT_CURRENCY,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    imp.tagid = bidRequest.adUnitCode;
    deepSetValue(imp, `ext.${BIDDER_CODE}`, {
      widgetId: bidRequest.params.widgetId,
    });
    return imp;
  },
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: BIDDER_ALIAS,
  supportedMediaTypes: [BANNER, NATIVE, VIDEO],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!bid.params?.widgetId;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const data = converter.toORTB({ bidRequests, bidderRequest });
    return formatRequest(data, bidderRequest);
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidderRequest) {
    // check overall response
    if (!serverResponse.body || typeof serverResponse.body !== 'object') {
      return [];
    }
    try {
      // Response from PBS Go openRTB
      if (Array.isArray(serverResponse.body?.seatbid)) {
        const responseErrors = deepAccess(
          serverResponse.body,
          'ext.errors.nativery'
        );
        if (Array.isArray(responseErrors) && responseErrors.length > 0) {
          logWarn(
            'Nativery: Error in bid response ' + JSON.stringify(responseErrors)
          );
        }
        const ortb = converter.fromORTB({
          request: bidderRequest.data,
          response: serverResponse.body,
        });
        return ortb.bids ?? [];
      }
    } catch (error) {
      const errMsg = error?.message ?? JSON.stringify(error);
      logError('Nativery: unhandled error in bid response ' + errMsg);
      return [];
    }
    return [];
  },
};

function formatRequest(ortbPayload) {
  let request = [];
  const options = {
    withCredentials: true,
  };

  if (ortbPayload.imp.length > MAX_IMPS_PER_REQUEST) {
    const clonedPayload = deepClone(ortbPayload);
    chunk(ortbPayload.imp, MAX_IMPS_PER_REQUEST).forEach((imps) => {
      clonedPayload.imp = imps;
      request.push({
        method: 'POST',
        url: ENDPOINT,
        data: clonedPayload,
        options,
      });
    });
  } else {
    request = {
      method: 'POST',
      url: ENDPOINT,
      data: ortbPayload,
      options,
    };
  }
  return request;
}

registerBidder(spec);
