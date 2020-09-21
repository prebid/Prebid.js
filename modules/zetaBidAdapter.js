import { registerBidder } from '../src/adapters/bidderFactory.js';
import {BANNER} from "../src/mediaTypes";
const BIDDER_CODE = 'Zeta Global';
const ENDPOINT_URL = 'https://prebid.rfihub.com/prebid';
const USER_SYNC_URL = 'http://p.rfihub.com/cm?pub=42770&in=1';
const DEFAULT_CUR = 'USD';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
     * Determines whether or not the given bid request is valid.
     *
     * @param {BidRequest} bid The bid params to validate.
     * @return boolean True if this is a valid bid, and false otherwise.
     */
  isBidRequestValid: function(bid) {
    return !!(bid.params.placementId || (bid.params.member && bid.params.invCode));
  },

  /**
     * Make a server request from the list of BidRequests.
     *
     * @param {validBidRequests[]} - an array of bidRequest objects
     * @param {bidderRequest} - master bidRequest object
     * @return ServerRequest Info describing the request to the server.
     */
  buildRequests: function(validBidRequests, bidderRequest) {
    const secure = location.protocol.indexOf('https') > -1 ? 1 : 0;
    const params = validBidRequests[0].params;
    let data = {
      id: validBidRequests[0].bidId,
      secure,
      banner: buildBanner(validBidRequests[0])
    };
    let isMobile = /(ios|ipod|ipad|iphone|android)/i.test(navigator.userAgent) ? 1 : 0;
    let payload = {
      test: 1,
      id: bidderRequest.auctionId,
      cur: [DEFAULT_CUR],
      imp: [data],
      site: {
        mobile: isMobile,
        page: bidderRequest.refererInfo.referer
      },
      device: {
        ua: navigator.userAgent,
        ip: params.ip
      },
      user: {
        buyeruid: params.user.buyeruid,
        uid: params.user.uid
      },
    };
    return {
      method: 'POST',
      url: ENDPOINT_URL,
      data: JSON.stringify(payload),
    };
  },

  /**
     * Unpack the response from the server into a list of bids.
     *
     * @param {ServerResponse} serverResponse A successful response from the server.
     * @return {Bid[]} An array of bids which were nested inside the server.
     */
  interpretResponse: function(serverResponse, bidRequest) {
    const ttl = 200;
    const netRev = true;
    let bidResponse = [];
    let bids = serverResponse.body.seatbid || [];
    let cur = serverResponse.body.cur;
    let bid = {
      requestId: serverResponse.body.id,
      cpm: bids[0].bid[0].price,
      currency: cur,
      width: bids[0].bid[0].w,
      height: bids[0].bid[0].h,
      ad: bids[0].bid[0].adm,
      ttl: ttl,
      creativeId: bids[0].bid[0].crid,
      netRevenue: netRev
    };
    bidResponse.push(bid);
    return bidResponse;
  },

  /**
     * Register the user sync pixels which should be dropped after the auction.
     *
     * @param {SyncOptions} syncOptions Which user syncs are allowed?
     * @param {ServerResponse[]} serverResponses List of server's responses.
     * @return {UserSync[]} The user syncs which should be dropped.
     */
  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    const syncs = []
      if (syncOptions.iframeEnabled) {
        syncs.push({
          type: 'iframe',
          url: USER_SYNC_URL
        });
      }
    return syncs;
  }
}

function buildBanner(bid) {
  let sizes = [];
  bid.mediaTypes && bid.mediaTypes.banner && bid.mediaTypes.banner.sizes ? sizes = bid.mediaTypes.banner.sizes : sizes = bid.sizes;
  return {
    w: sizes[0][0],
    h: sizes[0][1]
  };
}

registerBidder(spec);
