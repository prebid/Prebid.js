import { isEmpty, parseUrl } from '../../src/utils.js';
import {config} from '../../src/config.js';
import { createNativeRequest, createBannerRequest, createVideoRequest } from './index.js';
import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';

export const buildRequests = (validBidRequests, bidderRequest, endpointURL, defaultCur) => {
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);
  if (!validBidRequests.length || !bidderRequest) return [];

  const endpoint = endpointURL.replace('hash', validBidRequests[0].params.placementId);
  const imp = validBidRequests.map((br) => {
    const impObject = { id: br.bidId, secure: 1 };
    if (br.mediaTypes.banner) impObject.banner = createBannerRequest(br);
    else if (br.mediaTypes.video) impObject.video = createVideoRequest(br);
    else if (br.mediaTypes.native) impObject.native = { id: br.transactionId, ver: '1.2', request: createNativeRequest(br) };
    return impObject;
  });

  const page = bidderRequest.refererInfo.page || bidderRequest.refererInfo.topmostLocation;
  const data = {
    id: bidderRequest.bidderRequestId,
    cur: [defaultCur],
    device: { w: screen.width, h: screen.height, language: navigator.language?.split('-')[0], ua: navigator.userAgent },
    site: { domain: parseUrl(page).hostname, page: page },
    tmax: bidderRequest.timeout,
    imp,
  };

  if (bidderRequest.refererInfo.ref) data.site.ref = bidderRequest.refererInfo.ref;
  if (bidderRequest.gdprConsent) {
    data.regs = { ext: { gdpr: bidderRequest.gdprConsent.gdprApplies ? 1 : 0 } };
    data.user = { ext: { consent: bidderRequest.gdprConsent.consentString || '' } };
  }
  if (bidderRequest.uspConsent) data.regs.ext.us_privacy = bidderRequest.uspConsent;
  if (config.getConfig('coppa')) data.regs.coppa = 1;
  if (validBidRequests[0].schain) data.source = { ext: { schain: validBidRequests[0].schain } };

  return { method: 'POST', url: endpoint, data };
};

export const interpretResponse = (serverResponse, defaultCur, parseNative) => {
  if (!serverResponse || isEmpty(serverResponse.body)) return [];

  let bids = [];
  serverResponse.body.seatbid.forEach(response => {
    response.bid.forEach(bid => {
      const mediaType = bid.ext?.mediaType || 'banner';

      const bidObj = {
        requestId: bid.impid,
        cpm: bid.price,
        width: bid.w,
        height: bid.h,
        ttl: 1200,
        currency: defaultCur,
        netRevenue: true,
        creativeId: bid.crid,
        dealId: bid.dealid || null,
        mediaType,
      };

      switch (mediaType) {
        case 'video':
          bidObj.vastUrl = bid.adm;
          break;
        case 'native':
          bidObj.native = parseNative(bid.adm);
          break;
        default:
          bidObj.ad = bid.adm;
      }

      bids.push(bidObj);
    });
  });

  return bids;
};
