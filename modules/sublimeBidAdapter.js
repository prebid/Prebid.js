import { logInfo, generateUUID, formatQS, triggerPixel, deepAccess } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'sublime';
const BIDDER_GVLID = 114;
const DEFAULT_BID_HOST = 'pbjs.sskzlabs.com';
const DEFAULT_CURRENCY = 'EUR';
const DEFAULT_PROTOCOL = 'https';
const DEFAULT_TTL = 600;
const SUBLIME_ANTENNA = 'antenna.ayads.co';
const SUBLIME_VERSION = '0.8.0';

/**
 * Identify the current device type
 * @returns {string}
 */
function detectDevice() {
  const isMobile = /(?:phone|windows\s+phone|ipod|blackberry|Galaxy Nexus|SM-G892A|(?:android|bbd+|meego|silk|googlebot) .+?mobile|palm|windows\s+ce|opera mini|avantgo|docomo)/i;

  const isTablet = /(?:ipad|playbook|Tablet|(?:android|bb\d+|meego|silk)(?! .+? mobile))/i;

  return (
    (isMobile.test(navigator.userAgent) && 'm') || // mobile
    (isTablet.test(navigator.userAgent) && 't') || // tablet
    'd' // desktop
  );
}

const UUID_V4_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
/**
 * Checks whether a notifyId is well-formed
 * @param {*} value
 * @returns {boolean}
 */
function isValidNotifyId(value) {
  return UUID_V4_RE.test(value);
}

/**
 * Debug log message
 * @param {String} msg
 * @param {Object=} obj
 */
export function log(msg, obj) {
  logInfo('SublimeBidAdapter - ' + msg, obj);
}

// Default state
export const state = {
  zoneId: '',
  transactionId: '',
  notifyId: '',
  timeout: config.getConfig('bidderTimeout'),
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
 * Get a notifyId from bid params or from sublime global
 * @param {Object} params - The bid params
 * @return {string}
 */
function getNotifyId(params) {
  const sublime = window.sublime = window.sublime || {};

  let notifyId = params.notifyId || sublime.notifyId;
  if (!notifyId) {
    notifyId = generateUUID();
    log('generating a notifyId', notifyId);
  }
  if (!sublime.notifyId) {
    sublime.notifyId = notifyId;
  }

  return notifyId;
}

/**
 * Send pixel to our debug endpoint
 * @param {string} eventName - Event name that will be send in the e= query string
 * @param {string} [sspName] - The optionnal name of the AD provider
 */
export function sendEvent(eventName, sspName) {
  const ts = Date.now();
  const eventObject = {
    t: ts,
    tse: ts,
    z: state.zoneId,
    e: eventName,
    src: 'pa',
    puid: state.transactionId || state.notifyId,
    notid: state.notifyId || '',
    pbav: SUBLIME_VERSION,
    pubtimeout: state.timeout,
    pubpbv: '$prebid.version$',
    device: detectDevice(),
  };

  if (eventName === 'bidwon') {
    eventObject.sspname = sspName || '';
  }

  log('Sending pixel for event: ' + eventName, eventObject);

  const queryString = formatQS(eventObject);
  triggerPixel('https://' + SUBLIME_ANTENNA + '/?' + queryString);
}

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return {Boolean} True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  const notifyId = getNotifyId(bid.params);
  if (!isValidNotifyId(notifyId)) {
    log(`invalid notifyId format, got "${notifyId}"`);
    return false;
  }
  if (notifyId !== window.sublime.notifyId) {
    log(`notifyId mismatch: params [${bid.params.notifyId}] / sublime [${window.sublime.notifyId}]`);
    return false;
  }

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

  setState({ timeout: commonPayload.timeout });

  // RefererInfo
  if (bidderRequest && bidderRequest.refererInfo) {
    // TODO: is 'topmostLocation' the right value here?
    commonPayload.referer = bidderRequest.refererInfo.topmostLocation;
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

    const notifyId = getNotifyId(bid.params);

    setState({
      transactionId: bid.transactionId,
      notifyId,
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
      notifyId,
      zoneId: bid.params.zoneId,
    };

    const payload = Object.assign({}, commonPayload, bidPayload);

    return {
      method: 'POST',
      url: protocol + '://' + bidHost + '/bid',
      data: JSON.stringify(payload),
      options: {
        contentType: 'text/plain',
        withCredentials: false
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
      pbav: SUBLIME_VERSION,
      sspname: response.sspname || null
    };

    // We don't support advertiserDomains atm
    if (response.advertiserDomains) {
      // Creating a stub for Prebid.js 5.0 compliance
      bidResponse.meta = Object.assign({}, bidResponse.meta, { advertiserDomains: [] });
    }

    bidResponses.push(bidResponse);
  }

  return bidResponses;
}

/**
 * Send pixel when bidWon event is triggered
 * @param {Object} bid
 */
function onBidWon(bid) {
  log('Bid won', bid);
  sendEvent('bidwon', bid.sspname);
}

/**
 * Send debug when we timeout
 * @param {Array[{}]} timeoutData
 */
function onTimeout(timeoutData) {
  log('Timeout from adapter', timeoutData);

  const timeout = deepAccess(timeoutData, '0.timeout');
  if (timeout) {
    // Set timeout to the one we got from the bid
    setState({ timeout });
  }
  sendEvent('bidtimeout');
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: BIDDER_GVLID,
  aliases: [],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  onBidWon,
  onTimeout,
  // Exposed for test purpose
  sendEvent,
  setState,
  state,
  detectDevice,
  getNotifyId,
  isValidNotifyId,
};

registerBidder(spec);
