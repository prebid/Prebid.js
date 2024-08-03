import { config } from '../src/config.js';
import { NATIVE } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getWindowTop, getWindowSelf } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';

// ***** ECLICKADS ADAPTER *****
export const BIDDER_CODE = 'eclickads';
const DEFAULT_CURRENCY = ['USD'];
const DEFAULT_TTL = 1000;
export const ENDPOINT = 'https://g.eclick.vn/rtb_hb_request?fosp_uid=';
export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [NATIVE],
  isBidRequestValid: (bid) => {
    return !!bid && !!bid.params && !!bid.bidder && !!bid.params.zid;
  },
  buildRequests: (validBidRequests = [], bidderRequest) => {
    // FORMAT REQUEST TO BID SERVER
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    // ***** GET FIRST PARTY DATA CONFIG (SPECIFICLY FOR ECLICKADS) *****
    const siteConfigFPD = config.getConfig('site') || {};
    const userConfigFPD = config.getConfig('user') || {};

    const winTop = getWindowTop();
    const device = getDevice();
    const imp = [];
    const fENDPOINT = ENDPOINT + (siteConfigFPD.fosp_uid || '');
    const request = {
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      language: bidderRequest.ortb2.device.language,
      host: bidderRequest.ortb2.site.domain,
      page: bidderRequest.ortb2.site.page,
      imp,
      device,
      myvne_id: userConfigFPD.myvne_id || '',
      orig_aid: siteConfigFPD.orig_aid,
      fosp_aid: siteConfigFPD.fosp_aid,
      fosp_uid: siteConfigFPD.fosp_uid,
      id: siteConfigFPD.id,
    };

    validBidRequests.map((bid) => {
      imp.push({
        requestId: bid.bidId,
        adUnitCode: bid.adUnitCode,
        zid: bid.params.zid,
      });
    });

    return {
      method: 'POST',
      url: fENDPOINT,
      data: request,
    };
  },
  interpretResponse: (serverResponse) => {
    const seatbid = serverResponse.body?.seatbid || [];
    return seatbid.reduce((bids, bid) => {
      return [
        ...bids,
        {
          id: bid.id,
          impid: bid.impid,
          adUnitCode: bid.adUnitCode,
          cpm: bid.cpm,
          ttl: bid.ttl || DEFAULT_TTL,
          requestId: bid.requestId,
          creativeId: bid.creativeId,
          netRevenue: bid.netRevenue,
          currency: bid.currency || DEFAULT_CURRENCY,
          adserverTargeting: {
            hb_ad_eclickads: bid.ad,
          },
        },
      ];
    }, []);
  },
};
registerBidder(spec);

const getDevice = () => {
  const ws = getWindowSelf();
  const ua = ws.navigator.userAgent;

  if (
    /(tablet|ipad|playbook|silk|android 3.0|xoom|sch-i800|kindle)|(android(?!.*mobi))/i.test(
      ua.toLowerCase()
    )
  ) {
    return 'tablet';
  }
  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series([46])0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
      ua.toLowerCase()
    )
  ) {
    return 'phone';
  }
  return 'desktop';
};
