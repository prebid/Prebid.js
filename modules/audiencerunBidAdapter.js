import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'audiencerun';
const ENDPOINT_URL = 'https://d.audiencerun.com/prebid';

export const spec = {
  version: '1.0.0',
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
  buildRequests: function(bidRequests, bidderRequest) {
    const bids = bidRequests.map(bid => {
      const sizes = utils.deepAccess(bid, 'mediaTypes.banner.sizes', []);
      return {
        zoneId: utils.getValue(bid.params, 'zoneId'),
        sizes: sizes.map(size => ({
          w: size[0],
          h: size[1]
        })),
        bidfloor: bid.params.bidfloor || 0.0,
        bidId: bid.bidId,
        bidderRequestId: utils.getBidIdParameter('bidderRequestId', bid),
        adUnitCode: utils.getBidIdParameter('adUnitCode', bid),
        auctionId: utils.getBidIdParameter('auctionId', bid),
        transactionId: utils.getBidIdParameter('transactionId', bid)
      };
    });

    const payload = {
      libVersion: this.version,
      referer: bidderRequest.refererInfo ? bidderRequest.refererInfo.referer || null : null,
      currencyCode: config.getConfig('currency.adServerCurrency'),
      timeout: config.getConfig('bidderTimeout'),
      bids
    };

    if (bidderRequest && bidderRequest.gdprConsent) {
      payload.gdpr = {
        consent: bidderRequest.gdprConsent.consentString,
        applies: bidderRequest.gdprConsent.gdprApplies
      };
    } else {
      payload.gdpr = {
        consent: ''
      }
    }

    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
      options: {
        withCredentials: true
      }
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
      bid.adId = bidObject.zoneId;
      bid.cpm = parseFloat(bidObject.cpm);
      bid.creativeId = bidObject.crid;
      bid.currency = bidObject.currency ? bidObject.currency.toUpperCase() : 'USD';

      bid.height = bidObject.h;
      bid.width = bidObject.w;
      bid.netRevenue = bidObject.isNet ? bidObject.isNet : false;
      bid.ttl = 300;

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
  getUserSyncs: function(syncOptions, serverResponses) {
    if (!serverResponses || !serverResponses.length) return [];

    const syncs = [];
    serverResponses.forEach(response => {
      response.body.bid.forEach(bidObject => {
        syncs.push({
          type: 'iframe',
          url: bidObject.syncUrl
        });
      });
    });

    return syncs;
  }
};

registerBidder(spec);
