import { NATIVE } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { getWindowTop } from '../src/utils.js';
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
    validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

    const ortb2ConfigFPD = bidderRequest.ortb2.site.ext?.data || {};
    const ortb2Device = bidderRequest.ortb2.device;
    const ortb2Site = bidderRequest.ortb2.site;

    const winTop = getWindowTop();
    const device = getDevice(ortb2Device.ua);
    const imp = [];
    const fENDPOINT = ENDPOINT + (ortb2ConfigFPD.fosp_uid || '');
    const request = {
      deviceWidth: winTop.screen.width,
      deviceHeight: winTop.screen.height,
      language: ortb2Device.language,
      host: ortb2Site.domain,
      page: ortb2Site.page,
      imp,
      device,
      myvne_id: ortb2ConfigFPD.myvne_id || '',
      orig_aid: ortb2ConfigFPD.orig_aid,
      fosp_aid: ortb2ConfigFPD.fosp_aid,
      fosp_uid: ortb2ConfigFPD.fosp_uid,
      id: ortb2ConfigFPD.id,
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

const getDevice = (ua = '') => {
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
    return 'mobile';
  }
  return 'desktop';
};
