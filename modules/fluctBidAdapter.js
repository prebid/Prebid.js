import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

const BIDDER_CODE = 'fluct';
const END_POINT = 'https://hb.adingo.jp/prebid';
const VERSION = '1.2';
const NET_REVENUE = true;
const TTL = 300;

export const spec = {
  code: BIDDER_CODE,
  aliases: ['adingo'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {BidRequest} bid The bid params to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: (bid) => {
    return !!(bid.params.groupId && bid.params.tagId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {validBidRequests[]} - an array of bids.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: (validBidRequests, bidderRequest) => {
    const serverRequests = [];
    const referer = bidderRequest.refererInfo.referer;

    utils._each(validBidRequests, (request) => {
      const data = Object();

      data.referer = referer;
      data.adUnitCode = request.adUnitCode;
      data.bidId = request.bidId;
      data.transactionId = request.transactionId;

      data.sizes = [];
      utils._each(request.sizes, (size) => {
        data.sizes.push({
          w: size[0],
          h: size[1]
        });
      });

      data.params = request.params;

      serverRequests.push({
        method: 'POST',
        url: END_POINT,
        options: {
          contentType: 'application/json',
          withCredentials: true,
          customHeaders: {
            'x-fluct-app': 'prebid/fluctBidAdapter',
            'x-fluct-version': VERSION,
            'x-openrtb-version': 2.5
          }
        },
        data: data
      });
    });

    return serverRequests;
  },

  /*
   * Unpack the respnse from the server into a list of bids.
   *
   * @param {serverResponse} serverResponse A successful response from the server.
   * @return {bid[]} An array of bids which weer nested inside the server.
   */
  interpretResponse: (serverResponse, serverRequest) => {
    const bidResponses = [];

    const res = serverResponse.body;
    if (!utils.isEmpty(res) && !utils.isEmpty(res.seatbid) && !utils.isEmpty(res.seatbid[0].bid)) {
      const bid = res.seatbid[0].bid[0];
      const dealId = bid.dealid;
      const beaconUrl = bid.burl;
      const callImpBeacon = `<script type="application/javascript">` +
        `(function() { var img = new Image(); img.src = "${beaconUrl}"})()` +
        `</script>`;
      let data = {
        bidderCode: BIDDER_CODE,
        requestId: res.id,
        currency: res.cur,
        cpm: parseFloat(bid.price) || 0,
        netRevenue: NET_REVENUE,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        ttl: TTL,
        ad: bid.adm + callImpBeacon,
      };
      if (!utils.isEmpty(dealId)) {
        data.dealId = dealId;
      }
      bidResponses.push(data);
    }
    return bidResponses;
  },

  /*
   * Register the user sync pixels which should be dropped after the auction.
   *
   * @params {syncOptions} syncOptions which user syncs are allowed?
   * @params {ServerResponse[]} serverResponses List of server's responses.
   * @return {UserSync[]} The user syncs which should be dropped.
   *
   */
  getUserSyncs: (syncOptions, serverResponses) => {
    return [];
  },
};

registerBidder(spec);
