import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import * as utils from '../src/utils.js';
import * as url from '../src/url.js';

const BIDDER_CODE = 'sublime';
const DEFAULT_BID_HOST = 'pbjs.sskzlabs.com';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_PROTOCOL = 'https';
const DEFAULT_TTL = 600;
const SUBLIME_ANTENNA = 'antenna.ayads.co';
const SUBLIME_VERSION = '0.5.1';

/**
 * Debug log message
 * @param {String} msg
 * @param {Object=} obj
 */
export function log(msg, obj) {
  utils.logInfo('SublimeBidAdapter - ' + msg, obj);
}

// Default state
export const state = {
  zoneId: '',
  transactionId: ''
};

/**
 * Set a new state
 * @param {Object} value
 */
export function setState(value) {
  Object.assign(state, value);
  log('State has been updated :', state);
}

/**
 * Send pixel to our debug endpoint
 * @param {string} eventName - Event name that will be send in the e= query string
 * @param {Boolean=} isMandatoryPixel - If set to true, will always send the pixel
 */
export function sendEvent(eventName, isMandatoryPixel = false) {
  const shoudSendPixel = (isMandatoryPixel || state.debug);
  const ts = Date.now();
  const eventObject = {
    t: ts,
    tse: ts,
    z: state.zoneId,
    e: eventName,
    src: 'pa',
    puid: state.transactionId,
    trId: state.transactionId,
    ver: SUBLIME_VERSION,
  };

  if (shoudSendPixel) {
    log('Sending pixel for event: ' + eventName, eventObject);

    const queryString = url.formatQS(eventObject);
    utils.triggerPixel('https://' + SUBLIME_ANTENNA + '/?' + queryString);
  } else {
    log('Not sending pixel for event (use debug: true to send it): ' + eventName, eventObject);
  }
}

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return {Boolean} True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  return !!Number(bid.params.zoneId);
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @param {BidRequest[]} validBidRequests - An array of bids
 * @param {Object} bidderRequest - Info describing the request to the server.
 * @return {ServerRequest|ServerRequest[]} - Info describing the request to the server.
 */
function buildRequests(validBidRequests, bidderRequest) {
  const commonPayload = {
    pbav: SUBLIME_VERSION,
    // Current Prebid params
    prebidVersion: '$prebid.version$',
    currencyCode: config.getConfig('currency.adServerCurrency') || DEFAULT_CURRENCY,
    timeout: (typeof bidderRequest === 'object' && !!bidderRequest) ? bidderRequest.timeout : config.getConfig('bidderTimeout'),
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
    const bidHost = bid.params.bidHost || DEFAULT_BID_HOST;
    const protocol = bid.params.protocol || DEFAULT_PROTOCOL;

    setState({
      transactionId: bid.transactionId,
      zoneId: bid.params.zoneId,
      debug: bid.params.debug || false,
    });

    const bidPayload = {
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

    const payload = Object.assign({}, commonPayload, bidPayload);

    return {
      method: 'POST',
      url: protocol + '://' + bidHost + '/bid',
      data: payload,
      options: {
        contentType: 'application/json',
        withCredentials: true
      },
    }
  });
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {*} serverResponse A successful response from the server.
 * @param {*} bidRequest An object with bid request informations
 * @return {Bid[]} An array of bids which were nested inside the server.
 */
function interpretResponse(serverResponse, bidRequest) {
  const bidResponses = [];
  const response = serverResponse.body;

  sendEvent('dintres');

  if (response) {
    if (response.timeout || !response.ad || /<!--\s+No\s+ad\s+-->/gmi.test(response.ad)) {
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
      pbav: SUBLIME_VERSION
    };

    sendEvent('bida', true);
    bidResponses.push(bidResponse);
  } else {
    sendEvent('dnobid');
  }

  return bidResponses;
}

/**
 * Send debug when we timeout
 * @param {Object} timeoutData
 */
function onTimeout(timeoutData) {
  log('Timeout from adapter', timeoutData);
  sendEvent('dbidtimeout', true);
}

export const spec = {
  code: BIDDER_CODE,
  aliases: [],
  isBidRequestValid: isBidRequestValid,
  buildRequests: buildRequests,
  interpretResponse: interpretResponse,
  onTimeout: onTimeout,
};

registerBidder(spec);
