import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes';
import { getTopWindowUrl, logWarn } from '../src/utils';

const BIDDER_CODE = 'peak226';
const URL = 'https://a.ad216.com/header_bid';

export const spec = {
  code: BIDDER_CODE,

  supportedMediaTypes: [BANNER],

  isBidRequestValid: function (bid) {
    const { params } = bid;

    return !!params.uid;
  },

  buildRequests: function (validBidRequests) {
    const bidsMap = validBidRequests.reduce((res, bid) => {
      const { uid } = bid.params;

      res[uid] = res[uid] || [];
      res[uid].push(bid);

      return res;
    }, {});

    return {
      method: 'GET',
      url:
        URL +
        toQueryString({
          u: getTopWindowUrl(),
          auids: Object.keys(bidsMap).join(',')
        }),
      bidsMap
    };
  },

  interpretResponse: function (serverResponse, { bidsMap }) {
    const response = serverResponse.body;
    const bidResponses = [];

    if (!response) {
      logWarn(`No response from ${spec.code} bidder`);

      return bidResponses;
    }

    if (!response.seatbid || !response.seatbid.length) {
      logWarn(`No seatbid in response from ${spec.code} bidder`);

      return bidResponses;
    }

    response.seatbid.forEach((seatbid, i) => {
      if (!seatbid.bid || !seatbid.bid.length) {
        logWarn(`No bid in seatbid[${i}] response from ${spec.code} bidder`);
        return;
      }
      seatbid.bid.forEach(responseBid => {
        const requestBids = bidsMap[responseBid.auid];

        requestBids.forEach(requestBid => {
          bidResponses.push({
            requestId: requestBid.bidId,
            bidderCode: spec.code,
            width: responseBid.w,
            height: responseBid.h,
            mediaType: BANNER,
            creativeId: responseBid.auid,
            ad: responseBid.adm,
            cpm: responseBid.price,
            currency: 'USD',
            netRevenue: true,
            ttl: 360
          });
        });
      });
    });

    return bidResponses;
  }
};

function toQueryString(obj) {
  return Object.keys(obj).reduce(
    (str, key, i) =>
      typeof obj[key] === 'undefined' || obj[key] === ''
        ? str
        : `${str}${str ? '&' : '?'}${key}=${encodeURIComponent(obj[key])}`,
    ''
  );
}

registerBidder(spec);
