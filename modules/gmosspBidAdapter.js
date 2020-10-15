import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'gmossp';
const ENDPOINT = 'https://sp.gmossp-sp.jp/hb/prebid/query.ad';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function (bid) {
    return !!(bid.params.sid);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function (validBidRequests, bidderRequest) {
    const bidRequests = [];

    const url = bidderRequest.refererInfo.referer;
    const cur = getCurrencyType();
    const dnt = utils.getDNT() ? '1' : '0';

    for (let i = 0; i < validBidRequests.length; i++) {
      let queryString = '';

      const request = validBidRequests[i];
      const tid = request.transactionId;
      const bid = request.bidId;
      const ver = '$prebid.version$';
      const sid = utils.getBidIdParameter('sid', request.params);

      queryString = utils.tryAppendQueryString(queryString, 'tid', tid);
      queryString = utils.tryAppendQueryString(queryString, 'bid', bid);
      queryString = utils.tryAppendQueryString(queryString, 'ver', ver);
      queryString = utils.tryAppendQueryString(queryString, 'sid', sid);
      queryString = utils.tryAppendQueryString(queryString, 'url', url);
      queryString = utils.tryAppendQueryString(queryString, 'cur', cur);
      queryString = utils.tryAppendQueryString(queryString, 'dnt', dnt);

      bidRequests.push({
        method: 'GET',
        url: ENDPOINT,
        data: queryString
      });
    }
    return bidRequests;
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function (bidderResponse, requests) {
    const res = bidderResponse.body;

    if (utils.isEmpty(res)) {
      return [];
    }

    try {
      res.imps.forEach(impTracker => {
        const tracker = utils.createTrackPixelHtml(impTracker);
        res.ad += tracker;
      });
    } catch (error) {
      utils.logError('Error appending tracking pixel', error);
    }

    const bid = {
      requestId: res.bid,
      cpm: res.price,
      currency: res.cur,
      width: res.w,
      height: res.h,
      ad: res.ad,
      creativeId: res.creativeId,
      netRevenue: true,
      ttl: res.ttl || 300
    };

    return [bid];
  },

  /**
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @param {SyncOptions} syncOptions Which user syncs are allowed?
   * @param {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   */
  getUserSyncs: function(syncOptions, serverResponses) {
    const syncs = [];
    if (!serverResponses.length) {
      return syncs;
    }

    serverResponses.forEach(res => {
      if (syncOptions.pixelEnabled && res.body && res.body.syncs.length) {
        res.body.syncs.forEach(sync => {
          syncs.push({
            type: 'image',
            url: sync
          })
        })
      }
    })
    return syncs;
  },

};

function getCurrencyType() {
  if (config.getConfig('currency.adServerCurrency')) {
    return config.getConfig('currency.adServerCurrency');
  }
  return 'JPY';
}

registerBidder(spec);
