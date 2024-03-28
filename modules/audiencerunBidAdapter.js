import {
  _each,
  deepAccess,
  formatQS, getBidIdParameter,
  getValue,
  isArray,
  isFn,
  logError,
  triggerPixel,
} from '../src/utils.js';
import {config} from '../src/config.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerRequest} ServerRequest
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 */

const BIDDER_CODE = 'audiencerun';
const BASE_URL = 'https://d.audiencerun.com';
const AUCTION_URL = `${BASE_URL}/prebid`;
const TIMEOUT_EVENT_URL = `${BASE_URL}/ps/pbtimeout`;
const ERROR_EVENT_URL = `${BASE_URL}/js_log`;
const DEFAULT_CURRENCY = 'USD';

let requestedBids = [];

/**
 * Returns bidfloor through floors module if available.
 *
 * @param {Object} bid
 * @returns {number}
 */
function getBidFloor(bid) {
  if (!isFn(bid.getFloor)) {
    return deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: BANNER,
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0;
  }
}

/**
 * Returns the most top page referer.
 *
 * @returns {string}
 */
function getPageReferer() {
  let t, e;
  do {
    t = t ? t.parent : window;
    try {
      e = t.document.referrer;
    } catch (_) {
      break;
    }
  } while (t !== window.top);
  return e;
}

/**
 * Returns bidder request page url.
 *
 * @param {Object} bidderRequest
 * @return {string}
 */
function getPageUrl(bidderRequest) {
  return bidderRequest?.refererInfo?.page
}

export const spec = {
  version: '1.2.0',
  code: BIDDER_CODE,
  gvlid: 944,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let isValid = true;
    if (!deepAccess(bid, 'params.zoneId')) {
      logError('AudienceRun zoneId parameter is required. Bid aborted.');
      isValid = false;
    }
    return isValid;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @param {*} bidderRequest
   * @return {ServerRequest} Info describing the request to the server.
   */
  buildRequests: function (bidRequests, bidderRequest) {
    const bids = bidRequests.map((bid) => {
      const sizes = deepAccess(bid, 'mediaTypes.banner.sizes', []);
      return {
        zoneId: getValue(bid.params, 'zoneId'),
        sizes: sizes.map((size) => ({
          w: size[0],
          h: size[1],
        })),
        bidfloor: getBidFloor(bid),
        bidId: bid.bidId,
        bidderRequestId: getBidIdParameter('bidderRequestId', bid),
        adUnitCode: getBidIdParameter('adUnitCode', bid),
        // TODO: fix auctionId leak: https://github.com/prebid/Prebid.js/issues/9781
        auctionId: getBidIdParameter('auctionId', bid),
        transactionId: bid.ortb2Imp?.ext?.tid || '',
      };
    });

    const payload = {
      libVersion: this.version,
      pageUrl: bidderRequest?.refererInfo?.page,
      // TODO: does it make sense to find a half-way referer? what should these parameters pick
      pageReferer: getPageReferer(),
      referer: deepAccess(bidderRequest, 'refererInfo.topmostLocation'),
      // TODO: please do not send internal data structures over the network
      refererInfo: deepAccess(bidderRequest, 'refererInfo.legacy'),
      currencyCode: config.getConfig('currency.adServerCurrency'),
      timeout: config.getConfig('bidderTimeout'),
      bids,
    };

    payload.uspConsent = deepAccess(bidderRequest, 'uspConsent');
    payload.schain = deepAccess(bidRequests, '0.schain');
    payload.userId = deepAccess(bidRequests, '0.userIdAsEids') || []

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        consent: bidderRequest.gdprConsent.consentString,
        applies: bidderRequest.gdprConsent.gdprApplies,
        version: bidderRequest.gdprConsent.apiVersion,
      };
    } else {
      payload.gdpr = {
        consent: '',
      };
    }

    requestedBids = bids;

    return {
      method: 'POST',
      url: deepAccess(bidRequests, '0.params.auctionUrl', AUCTION_URL),
      data: JSON.stringify(payload),
      options: {
        withCredentials: true,
      },
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (serverResponse, bidRequest) {
    const bids = [];
    _each(serverResponse.body.bid, function (bidObject) {
      if (!bidObject.cpm || bidObject.cpm === null || !bidObject.adm) {
        return;
      }

      const bid = {};

      bid.ad = bidObject.adm;
      bid.mediaType = BANNER;

      // Common properties
      bid.requestId = bidObject.bidId;
      bid.cpm = parseFloat(bidObject.cpm);
      bid.creativeId = bidObject.crid;
      bid.currency = bidObject.currency
        ? bidObject.currency.toUpperCase()
        : DEFAULT_CURRENCY;

      bid.height = bidObject.h;
      bid.width = bidObject.w;
      bid.netRevenue = bidObject.isNet ? bidObject.isNet : false;
      bid.ttl = 300;
      bid.meta = {
        advertiserDomains:
          bidObject.adomain && Array.isArray(bidObject.adomain)
            ? bidObject.adomain
            : [],
      };

      bids.push(bid);
    });
    return bids;
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function (syncOptions, serverResponses) {
    if (!serverResponses || !serverResponses.length) return [];

    const syncs = [];
    serverResponses.forEach((response) => {
      response.body.bid.forEach((bidObject) => {
        syncs.push({
          type: 'iframe',
          url: bidObject.syncUrl,
        });
      });
    });

    return syncs;
  },

  /**
   * Register bidder specific code, which will execute if bidder timed out after an auction
   *
   * @param {Array} timeoutData timeout specific data
   */
  onTimeout: function (timeoutData) {
    if (!isArray(timeoutData)) {
      return;
    }

    timeoutData.forEach((bid) => {
      const bidOnTimeout = requestedBids.find(
        (requestedBid) => requestedBid.bidId === bid.bidId
      );

      if (bidOnTimeout) {
        triggerPixel(
          `${TIMEOUT_EVENT_URL}/${bidOnTimeout.zoneId}/${bidOnTimeout.bidId}`
        );
      }
    });
  },

  /**
   * Registers bidder specific code, which will execute if the bidder responded with an error.
   * @param {{bidderRequest: object}} args An object from which we extract bidderRequest object.
   */
  onBidderError: function ({ bidderRequest }) {
    const queryString = formatQS({
      message: `Prebid.js: Server call for ${bidderRequest.bidderCode} failed.`,
      url: encodeURIComponent(getPageUrl(bidderRequest)),
    });
    triggerPixel(`${ERROR_EVENT_URL}/?${queryString}`);
  },
};

registerBidder(spec);
