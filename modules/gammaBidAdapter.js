import { registerBidder } from '../src/adapters/bidderFactory.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 */

const BIDDER_CODE = 'gamma';
const ENDPOINTS = {
  SGP: 'https://hb.gammaplatform.com',
  JPN: 'https://hb-jp.gammaplatform.com',
  US_WEST: 'https://hb-us.gammaplatform.com',
  EU: 'https://hb-eu.gammaplatform.com'
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ['gamma'],
  supportedMediaTypes: ['banner', 'video'],

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
  buildRequests: function(bidRequests, bidderRequest) {
    const serverRequests = [];
    const bidderRequestReferer = bidderRequest?.refererInfo?.page || '';
    let ENDPOINT;
    for (var i = 0, len = bidRequests.length; i < len; i++) {
      const gaxObjParams = bidRequests[i];
      ENDPOINT = getAdUrlByRegion(gaxObjParams);
      serverRequests.push({
        method: 'GET',
        url: ENDPOINT + '/adx/request?wid=' + gaxObjParams.params.siteId + '&zid=' + gaxObjParams.params.zoneId + '&hb=pbjs&bidid=' + gaxObjParams.bidId + '&urf=' + encodeURIComponent(bidderRequestReferer)
      });
    }
    return serverRequests;
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
 * Get endpoint url by region
 * @param bid
 * @return aUrl
 */
function getAdUrlByRegion(bid) {
  let ENDPOINT;

  if (bid.params.region && ENDPOINTS[bid.params.region]) {
    ENDPOINT = ENDPOINTS[bid.params.region];
  } else {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const region = timezone.split('/')[0];

      switch (region) {
        case 'Europe':
          ENDPOINT = ENDPOINTS['EU'];
          break;
        case 'Australia':
          ENDPOINT = ENDPOINTS['JPN'];
          break;
        case 'Asia':
          ENDPOINT = ENDPOINTS['SGP'];
          break;
        case 'America':
          ENDPOINT = ENDPOINTS['US_WEST'];
          break;
        default: ENDPOINT = ENDPOINTS['SGP'];
      }
    } catch (err) {
      ENDPOINT = ENDPOINTS['SGP'];
    }
  }

  return ENDPOINT;
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
    ttl: serverBid.seatbid[0].bid[0].ttl || 300,
    meta: {
      advertiserDomains: serverBid.seatbid[0].bid[0].adomain && serverBid.seatbid[0].bid[0].adomain.length ? serverBid.seatbid[0].bid[0].adomain : []
    }
  };

  if (serverBid.type === 'video') {
    Object.assign(bid, {
      vastXml: serverBid.seatbid[0].bid[0].vastXml,
      vastUrl: serverBid.seatbid[0].bid[0].vastUrl,
      ttl: 3600
    });
  }

  return bid;
}

registerBidder(spec);
