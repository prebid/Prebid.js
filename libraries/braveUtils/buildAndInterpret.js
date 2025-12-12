import { isEmpty } from '../../src/utils.js';
import {config} from '../../src/config.js';
import { createNativeRequest, createBannerRequest, createVideoRequest, getFloor, prepareSite, prepareConsents, prepareEids } from './index.js';
import { convertOrtbRequestToProprietaryNative } from '../../src/native.js';

export const buildRequests = (validBidRequests, bidderRequest, endpointURL, defaultCur) => {
  if (!validBidRequests.length || !bidderRequest) return [];
  validBidRequests = convertOrtbRequestToProprietaryNative(validBidRequests);

  const endpoint = endpointURL.replace('hash', validBidRequests[0].params.placementId);
  const imp = validBidRequests.map((br) => {
    const impObject = { id: br.bidId, secure: 1, bidfloor: getFloor(br, Object.keys(br.mediaTypes)[0]), defaultCur };
    if (br.mediaTypes.banner) impObject.banner = createBannerRequest(br);
    else if (br.mediaTypes.video) impObject.video = createVideoRequest(br);
    else if (br.mediaTypes.native) impObject.native = { id: br.transactionId, ver: '1.2', request: createNativeRequest(br) };
    return impObject;
  });

  const data = {
    id: bidderRequest.bidderRequestId,
    cur: [defaultCur],
    device: bidderRequest.ortb2?.device || { w: screen.width, h: screen.height, language: navigator.language?.split('-')[0], ua: navigator.userAgent },
    site: prepareSite(validBidRequests[0], bidderRequest),
    tmax: bidderRequest.timeout,
    regs: { ext: {}, coppa: config.getConfig('coppa') === true ? 1 : 0 },
    user: { ext: {} },
    imp
  };

  prepareConsents(data, bidderRequest);
  prepareEids(data, validBidRequests[0]);

  if (bidderRequest?.ortb2?.source?.ext?.schain) data.source = { ext: { schain: bidderRequest.ortb2.source.ext.schain } };

  return { method: 'POST', url: endpoint, data };
};

export const interpretResponse = (serverResponse, defaultCur, parseNative) => {
  if (!serverResponse || isEmpty(serverResponse.body)) return [];

  const bids = [];
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
        mediaType
      };

      switch (mediaType) {
        case 'video':
          bidObj.vastXml = bid.adm;
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
