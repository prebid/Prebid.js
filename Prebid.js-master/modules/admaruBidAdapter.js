import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER} from '../src/mediaTypes.js';

const ADMARU_ENDPOINT = 'https://p1.admaru.net/AdCall';
const BIDDER_CODE = 'admaru';

const DEFAULT_BID_TTL = 360;

function parseBid(rawBid, currency) {
  const bid = {};

  bid.cpm = rawBid.price;
  bid.impid = rawBid.impid;
  bid.requestId = rawBid.impid;
  bid.netRevenue = true;
  bid.dealId = '';
  bid.creativeId = rawBid.crid;
  bid.currency = currency;
  bid.ad = rawBid.adm;
  bid.width = rawBid.w;
  bid.height = rawBid.h;
  bid.mediaType = BANNER;
  bid.ttl = DEFAULT_BID_TTL;

  return bid;
}

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    return !!(bid && bid.params && bid.params.pub_id && bid.params.adspace_id);
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      const payload = {
        pub_id: bid.params.pub_id,
        adspace_id: bid.params.adspace_id,
        bidderRequestId: bid.bidderRequestId,
        bidId: bid.bidId
      };

      return {
        method: 'GET',
        url: ADMARU_ENDPOINT,
        data: payload,
      }
    })
  },

  interpretResponse: function (serverResponse, bidRequest) {
    const bidResponses = [];
    let bid = null;

    if (!serverResponse.hasOwnProperty('body') || !serverResponse.body.hasOwnProperty('seatbid')) {
      return bidResponses;
    }

    const serverBody = serverResponse.body;
    const seatbid = serverBody.seatbid;

    for (let i = 0; i < seatbid.length; i++) {
      if (!seatbid[i].hasOwnProperty('bid')) {
        continue;
      }

      const innerBids = seatbid[i].bid;
      for (let j = 0; j < innerBids.length; j++) {
        bid = parseBid(innerBids[j], serverBody.cur);

        bidResponses.push(bid);
      }
    }

    return bidResponses;
  }
}

registerBidder(spec);
