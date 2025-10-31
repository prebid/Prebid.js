import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { chunk } from '../libraries/chunk/chunk.js';
import {
  deepAccess,
  deepClone,
  deepSetValue,
  logError,
  logWarn,
  safeJSONEncode,
} from '../src/utils.js';
import { ajax } from '../src/ajax.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'nativery';
const BIDDER_ALIAS = ['nat'];
const ENDPOINT = 'https://hb.nativery.com/openrtb2/auction';
const EVENT_TRACKER_URL = 'https://hb.nativery.com/openrtb2/track-event';
// Currently we log every event
const DEFAULT_SAMPLING_RATE = 1;
const EVENT_LOG_RANDOM_NUMBER = Math.random();
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
            'Nativery: Error in bid response ' + safeJSONEncode(responseErrors)
          );
        }
        const ortb = converter.fromORTB({
          request: bidderRequest.data,
          response: serverResponse.body,
        });
        return ortb.bids ?? [];
      }
    } catch (error) {
      const errMsg = error?.message ?? safeJSONEncode(error);
      logError('Nativery: unhandled error in bid response ' + errMsg);
      return [];
    }
    return [];
  },
  /**
   * Register bidder specific code, which will execute if a bid from this bidder won the auction
   * @param {Bid} bid The bid that won the auction
   */
  onBidWon: function(bid) {
    if (bid == null || Object.keys(bid).length === 0) return
    reportEvent('NAT_BID_WON', bid)
  },
  /**
   * Register bidder specific code, which will execute if the ad
   * has been rendered successfully
   * @param {Bid} bid Bid request object
   */
  onAdRenderSucceeded: function (bid) {
    if (bid == null || Object.keys(bid).length === 0) return
    reportEvent('NAT_AD_RENDERED', bid)
  },
  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   * @param {Object} timeoutData Containing timeout specific data
   */
  onTimeout: function (timeoutData) {
    if (!Array.isArray(timeoutData) || timeoutData.length === 0) return
    reportEvent('NAT_TIMEOUT', timeoutData)
  },
  /**
   * Register bidder specific code, which will execute if the bidder responded with an error
   * @param {Object} errorData An object with the XMLHttpRequest error and the bid request object
   */
  onBidderError: function (errorData) {
    if (errorData == null || Object.keys(errorData).length === 0) return
    reportEvent('NAT_BIDDER_ERROR', errorData)
  }
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

function reportEvent(event, data, sampling = null) {
  // Currently this condition is always true since DEFAULT_SAMPLING_RATE = 1,
  // meaning we log every event. In the future, we may want to implement event
  // sampling by lowering the sampling rate.
  const samplingRate = sampling ?? DEFAULT_SAMPLING_RATE;
  if (samplingRate > EVENT_LOG_RANDOM_NUMBER) {
    const payload = {
      prebidVersion: '$prebid.version$',
      event,
      data,
    };
    ajax(EVENT_TRACKER_URL, undefined, safeJSONEncode(payload), { method: 'POST', withCredentials: true, keepalive: true });
  }
}

registerBidder(spec);
