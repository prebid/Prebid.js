import { registerBidder } from '../src/adapters/bidderFactory.js';
import * as utils from '../src/utils.js';

const BIDDER_CODE = 'alvads';
const ENDPOINT_BANNER = 'https://helios-ads-qa-core.ssidevops.com/decision/openrtb';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: ['banner', 'video'],
  isBidRequestValid: (bid) => {
    return Boolean(
      bid.params &&
      bid.params.publisherId &&
      (bid.mediaTypes?.banner ? bid.params.tagid : true)
    );
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    return validBidRequests.map(bid => {
      const imps = [];
      // Banner
      if (bid.mediaTypes?.banner) {
        const sizes = utils.parseSizesInput(bid.mediaTypes.banner.sizes || bid.sizes)
          .map(s => {
            const parts = s.split('x').map(Number);
            return { w: parts[0], h: parts[1] };
          });

        sizes.forEach(size => {
          imps.push({
            id: bid.bidId,
            banner: { w: size.w, h: size.h },
            tagid: bid.params.tagid,
            bidfloor: bid.params.bidfloor || 0,
            ext: { userId: bid.params.userId }
          });
        });
      }

      // Video
      if (bid.mediaTypes?.video) {
        const wh = (bid.mediaTypes.video.playerSize && bid.mediaTypes.video.playerSize[0]) || [1280, 720];
        imps.push({
          id: bid.bidId,
          video: { w: wh[0], h: wh[1] },
          tagid: bid.params.tagid,
          bidfloor: bid.params.bidfloor || 0,
          ext: { userId: bid.params.userId }
        });
      }

      // Payload OpenRTB por bid
      const payload = {
        id: 'REQ-OPENRTB-' + Date.now(),
        site: {
          page: bidderRequest.refererInfo.page,
          ref: document.referrer || bidderRequest.refererInfo.page,
          publisher: { id: bid.params.publisherId }
        },
        imp: imps,
        device: {
          ua: navigator.userAgent,
          ip: bid.params.ip || '0.0.0.0',
          geo: bid.params.geo || {}
        },
        user: {
          id: bid.params.userId || utils.generateUUID(),
          buyeruid: utils.generateUUID()
        },
        regs: {
          gpp: '',
          gpp_sid: [],
          ext: {
            gdpr: bidderRequest.gdprConsent ? 1 : 0,
            us_privacy: bidderRequest.uspConsent || '1YNN'
          }
        },
        ext: {
          user_fingerprint: utils.generateUUID()
        }
      };
      const endpoint = bid.params.endpoint || ENDPOINT_BANNER;

      return {
        method: 'POST',
        url: endpoint,
        data: JSON.stringify(payload),
        options: { withCredentials: false },
        bid: bid
      };
    });
  },

  interpretResponse: (serverResponse) => {
    const bidResponses = [];
    const body = serverResponse.body;

    // --- Banners OpenRTB ---
    if (body && body.seatbid) {
      body.seatbid.forEach(seat => {
        seat.bid.forEach(bid => {
          const isVideo = bid.adm && bid.adm.includes('<VAST');
          const common = {
            requestId: bid.impid,
            cpm: bid.price || 0,
            width: bid.w,
            height: bid.h,
            creativeId: bid.crid || bid.id,
            currency: body.cur || 'USD',
            netRevenue: true,
            ttl: 300
          };

          if (isVideo) {
            bidResponses.push({
              ...common,
              mediaType: 'video',
              vastXml: bid.adm,
              vastUrl: bid.ext && bid.ext.vast_url ? bid.ext.vast_url : undefined,
              meta: { advertiserDomains: bid.adomain || [] }
            });
          } else {
            bidResponses.push({
              ...common,
              mediaType: 'banner',
              ad: bid.adm
            });
          }
        });
      });
    }
    return bidResponses;
  },


  onTimeout: (timeoutData) => {
    utils.logWarn('Timeout  bids ALVA:', timeoutData);
  },

  onBidWon: (bid) => {
    utils.logInfo('Bid winner ALVA:', bid);
  }
};

registerBidder(spec);
