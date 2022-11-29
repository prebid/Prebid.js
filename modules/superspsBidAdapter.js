import { registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';

const { getConfig } = config;
const CODE = 'supersps';
export const URL = 'http://www.superssp.com/api/v1';
export const SSSPUID = 'theSSSppp';

export const spec = {
  code: CODE,
  isBidRequestValid: function (bid) {
    return true;
  },

  buildRequests: function (validBidRequests, bidderRequest) {
    const device = getConfig('device') || {};
    device.w = device.w || window.innerWidth;
    device.h = device.h || window.innerHeight;

    return validBidRequests.map(function (bid) {
      let pubProvidedIds = {};

      if (bid.userId && bid.userId.pubProvidedId) {
        pubProvidedIds = bid.userId.pubProvidedId.reduce((obj, user) => {
          obj[user.source] = user.uids.map((uid) => uid.id);
          return obj
        }, {});
      }

      let data = {
        ssspUid: SSSPUID,
        adUnitCode: bid.adUnitCode,
        auctionId: bidderRequest.auctionId,
        bidId: bid.bidId,
        mediaType: bid.mediaTypes,
        site: {
          page: bidderRequest.refererInfo.page,
          domain: bidderRequest.refererInfo.domain,
          publisher: {
            domain: bidderRequest.refererInfo.domain,
          },
        },
        device,
        pubProvidedIds,
        // tdidRepetition: 222,
      };

      return {
        method: 'POST',
        url: URL,
        data: data,
      };
    });
  },
};

registerBidder(spec);
