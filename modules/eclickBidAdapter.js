import { NATIVE } from '../src/mediaTypes.js';
import { convertOrtbRequestToProprietaryNative } from '../src/native.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { getDevice } from '../libraries/fpdUtils/deviceInfo.js';

// **** ECLICK ADAPTER ****
export const BIDDER_CODE = 'eclick';
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

    const isMobile = getDevice();
    const imp = [];
    const fENDPOINT = ENDPOINT + (ortb2ConfigFPD.fosp_uid || '');
    const request = {
      deviceWidth: ortb2Device.w,
      deviceHeight: ortb2Device.h,
      ua: ortb2Device.ua,
      language: ortb2Device.language,
      device: isMobile ? 'mobile' : 'desktop',
      host: ortb2Site.domain,
      page: ortb2Site.page,
      imp,
      myvne_id: ortb2ConfigFPD.myvne_id || '',
      orig_aid: ortb2ConfigFPD.orig_aid,
      fosp_aid: ortb2ConfigFPD.fosp_aid,
      fosp_uid: ortb2ConfigFPD.fosp_uid,
      id: ortb2ConfigFPD.id,
    };

    validBidRequests.forEach((bid) => {
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
            hb_ad_eclick: bid.ad,
          },
        },
      ];
    }, []);
  },
};
registerBidder(spec);
