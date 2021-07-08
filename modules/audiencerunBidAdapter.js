import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'audiencerun';
const BASE_URL = 'https://d.audiencerun.com';
const AUCTION_URL = `${BASE_URL}/prebid`;
const TIMEOUT_EVENT_URL = `${BASE_URL}/ps/pbtimeout`;
const DEFAULT_CURRENCY = 'USD';

let requestedBids = [];

/**
 * Gets bidder request referer
 *
 * @param {Object} bidderRequest
 * @return {string}
 */
function getPageUrl(bidderRequest) {
  return (
    config.getConfig('pageUrl') ||
    utils.deepAccess(bidderRequest, 'refererInfo.referer') ||
    null
  );
}

/**
 * Returns bidfloor through floors module if available
 *
 * @param {Object} bid
 * @returns {number}
 */
function getBidFloor(bid) {
  if (!utils.isFn(bid.getFloor)) {
    return utils.deepAccess(bid, 'params.bidfloor', 0);
  }

  try {
    const bidFloor = bid.getFloor({
      currency: DEFAULT_CURRENCY,
      mediaType: BANNER,
      size: '*',
    });
    return bidFloor.floor;
  } catch (_) {
    return 0
  }
}

export const spec = {
  version: '1.1.0',
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    let isValid = true;
    if (!utils.deepAccess(bid, 'params.zoneId')) {
      utils.logError('AudienceRun zoneId parameter is required. Bid aborted.');
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
      const sizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes', []);
      return {
        zoneId: utils.getValue(bid.params, 'zoneId'),
        sizes: sizes.map((size) => ({
          w: size[0],
          h: size[1],
        })),
        bidfloor: getBidFloor(bid),
        bidId: bid.bidId,
        bidderRequestId: utils.getBidIdParameter('bidderRequestId', bid),
        adUnitCode: utils.getBidIdParameter('adUnitCode', bid),
        auctionId: utils.getBidIdParameter('auctionId', bid),
        transactionId: utils.getBidIdParameter('transactionId', bid),
      };
    });

    const payload = {
      libVersion: this.version,
      referer: getPageUrl(bidderRequest),
      currencyCode: config.getConfig('currency.adServerCurrency'),
      timeout: config.getConfig('bidderTimeout'),
      bids,
    };

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
      url: AUCTION_URL,
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
    utils._each(serverResponse.body.bid, function (bidObject) {
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
    if (!utils.isArray(timeoutData)) {
      return;
    }

    timeoutData.forEach((bid) => {
      const bidOnTimeout = requestedBids.find((requestedBid) => requestedBid.bidId === bid.bidId);

      if (bidOnTimeout) {
        utils.triggerPixel(
          `${TIMEOUT_EVENT_URL}/${bidOnTimeout.zoneId}/${bidOnTimeout.bidId}`
        );
      }
    });
  },
};

registerBidder(spec);
