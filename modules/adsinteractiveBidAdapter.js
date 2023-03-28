import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const ADSINTERACTIVE_CODE = 'adsinteractive';

export const spec = {
  code: ADSINTERACTIVE_CODE,
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    return (
      !!bid.params.adUnit && !!bid.bidId && bid.bidder === 'adsinteractive'
    );
  },

  buildRequests: (bidRequests, bidderRequest) => {
    return bidRequests.map((bid) => {
      let url = 'https://pb.adsinteractive.com/prebid';
      const data = {
        id: bid.bidId,
        site: {
          page: bid.ortb2.site.page,
          domain: bid.ortb2.site.domain,
          publisher: {
            domain: bid.ortb2.site.domain,
          },
          ext: {
            amp: Number(bidderRequest.refererInfo.isAmp),
          },
        },
        regs: bid.ortb2.regs,
        device: bid.ortb2.device,
        user: bid.ortb2.user,
        imp: [
          {
            id: bid.params.adUnit,
            banner: {
              format: bid.sizes.map((size) => ({
                w: size[0],
                h: size[1],
              })),
            },
            ext: {
              bidder: {
                adUnit: bid.params.adUnit,
              },
            },
          },
        ],
        tmax: bidderRequest.timeout,
      };
      const options = {
        withCredentials: true,
      };
      return {
        method: 'POST',
        url,
        data,
        options,
      };
    });
  },

  interpretResponse: (serverResponse, bidRequest) => {
    let answer = [];
    if (serverResponse && serverResponse.body && serverResponse.body.seatbid) {
      serverResponse.body.seatbid.forEach((seatbid) => {
        if (seatbid.bid.length) {
          answer = [
            ...answer,
            ...seatbid.bid
              .filter((bid) => bid.price > 0)
              .map((adsinteractiveBid) => {
                const bid = {
                  id: adsinteractiveBid.id,
                  requestId: bidRequest.data.id,
                  cpm: adsinteractiveBid.price,
                  netRevenue: true,
                  ttl: 1000,
                  ad: adsinteractiveBid.adm,
                  meta: {advertiserDomains: adsinteractiveBid && adsinteractiveBid.adomain ? adsinteractiveBid.adomain : []},
                  width: adsinteractiveBid.w,
                  height: adsinteractiveBid.h,
                  currency: serverResponse.body.cur || 'USD',
                  creativeId: adsinteractiveBid.crid || 0,
                };
                return bid;
              }),
          ];
        }
      });
    }
    return answer;
  },
};
registerBidder(spec);
