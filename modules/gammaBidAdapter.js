import * as utils from 'src/utils';
import { registerBidder } from 'src/adapters/bidderFactory';
import find from 'core-js/library/fn/array/find';

const ENDPOINT = 'hb.gammaplatform.com';
const BIDDER_CODE = 'gamma';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['gamma'],

  /**
   * Determines whether or not the given bid request is valid.
   *
   * @param {object} bid The bid to validate.
   * @return boolean True if this is a valid bid, and false otherwise.
   */
  isBidRequestValid: function(bid) {
    return !!(bid.params.siteId || bid.params.zoneId);
  },

  /**
   * Make a server request from the list of BidRequests.
   *
   * @param {BidRequest[]} bidRequests A non-empty list of bid requests which should be sent to the Server.
   * @return ServerRequest Info describing the request to the server.
   */
  buildRequests: function(bidRequests) {
    const gaxObjParams = find(bidRequests, hasParamInfo);
    return {
      method: 'GET',
      url: '//' + ENDPOINT + '/adx/request?wid=' + gaxObjParams.params.siteId + '&zid=' + gaxObjParams.params.zoneId + '&hb=pbjs&bidid=' + gaxObjParams.bidId + '&urf=' + utils.getTopWindowUrl()
    };
  },

  /**
   * Unpack the response from the server into a list of bids.
   *
   * @param {*} serverResponse A successful response from the server.
   * @return {Bid[]} An array of bids which were nested inside the server.
   */
  interpretResponse: function(serverResponse) {
    serverResponse = serverResponse.body;

    const bids = [];

    if (serverResponse.id) {
      const bid = newBid(serverResponse);
      bids.push(bid);
    }

    return bids;
  }
}

/**
 * Unpack the Server's Bid into a Prebid-compatible one.
 * @param serverBid
 * @return Bid
 */
function newBid(serverBid) {
  const bid = {
    ad: serverBid.seatbid[0].bid[0].adm,
    cpm: serverBid.seatbid[0].bid[0].price,
    creativeId: serverBid.seatbid[0].bid[0].adid,
    currency: serverBid.cur,
    dealId: serverBid.seatbid[0].bid[0].dealid,
    width: serverBid.seatbid[0].bid[0].w,
    height: serverBid.seatbid[0].bid[0].h,
    mediaType: serverBid.type,
    netRevenue: true,
    requestId: serverBid.id,
    ttl: serverBid.seatbid[0].bid[0].ttl || 300
  };

  if (serverBid.type == 'video') {
    Object.assign(bid, {
      vastXml: serverBid.seatbid[0].bid[0].vastXml,
      ttl: 3600
    });
  }

  return bid;
}

function hasParamInfo(bid) {
  return !!bid.params;
}

registerBidder(spec);
