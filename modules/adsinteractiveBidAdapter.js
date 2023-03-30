import {
  deepAccess,
} from '../src/utils.js';

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const ADSINTERACTIVE_CODE = 'adsinteractive';
const USER_SYNC_URL_IMAGE = 'https://pb.adsinteractive.com/img';
const USER_SYNC_URL_IFRAME = 'https://pb.adsinteractive.com/sync';

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
      var gdprConsent;
      if (bidderRequest && bidderRequest.gdprConsent) {
        gdprConsent = {
          consent_string: bidderRequest.gdprConsent.consentString,
          consent_required: bidderRequest.gdprConsent.gdprApplies,
        };

        if (
          bidderRequest.gdprConsent.addtlConsent &&
            bidderRequest.gdprConsent.addtlConsent.indexOf('~') !== -1
        ) {
          let ac = bidderRequest.gdprConsent.addtlConsent;
          let acStr = ac.substring(ac.indexOf('~') + 1);
          gdprConsent.addtl_consent = acStr
            .split('.')
            .map((id) => parseInt(id, 10));
        }
      }

      let url = 'https://pb.adsinteractive.com/prebid';
      const data = {
        id: bid.bidId,
        at: 1,
        source: { fd: 0 },
        gdprConsent: gdprConsent,
        site: {
          page: bid.ortb2.site.page,
          keywords: bid.ortb2.site.keywords,
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
  getUserSyncs: (syncOptions, serverResponse, gdprConsent, uspConsent) => {
    if (syncOptions.iframeEnabled) {
      const auid = serverResponse.filter(resp => deepAccess(resp, 'body.ext.auid'))
        .map(resp => resp.body.ext.auid);
      return [
        {
          type: 'iframe',
          url: USER_SYNC_URL_IFRAME + '?consent=' + gdprConsent.consentString + '&auid=' + auid,
        },
      ];
    } else {
      return [
        {
          type: 'image',
          url: USER_SYNC_URL_IMAGE,
        },
      ];
    }
  },
};
registerBidder(spec);
