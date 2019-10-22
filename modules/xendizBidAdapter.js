import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';

const BIDDER_CODE = 'xendiz';
const PREBID_ENDPOINT = 'prebid.xendiz.com';
const SYNC_ENDPOINT = 'https://advsync.com/xendiz/ssp/?pixel=1';

const buildURI = () => {
  return `https://${PREBID_ENDPOINT}/request`;
}

const getDevice = () => {
  const lang = navigator.language || '';
  const width = window.screen.width;
  const height = window.screen.height;

  return [lang, width, height];
};

const buildItem = (req) => {
  return [
    req.bidId,
    req.params,
    req.adUnitCode,
    req.sizes.map(s => `${s[0]}x${s[1]}`)
  ]
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!bid.params.pid;
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests) {
    const payload = {
      id: bidRequests[0].auctionId,
      items: bidRequests.map(buildItem),
      device: getDevice(),
      page: utils.getTopWindowUrl(),
      dt: +new Date()
    };
    const payloadString = JSON.stringify(payload);

    return {
      method: 'POST',
      url: buildURI(),
      data: payloadString
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    const bids = serverResponse.body.bids.map(bid => {
      return {
        requestId: bid.id,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        creativeId: bid.crid,
        netRevenue: bid.netRevenue !== undefined ? bid.netRevenue : true,
        dealId: bid.dealid,
        currency: bid.cur || 'USD',
        ttl: bid.exp || 900,
        ad: bid.adm,
      }
    });

    return bids;
  },

  getUserSyncs: function(syncOptions) {
    if (syncOptions.pixelEnabled) {
      return [{
        type: 'image',
        url: SYNC_ENDPOINT
      }];
    }
  }
}

registerBidder(spec);
