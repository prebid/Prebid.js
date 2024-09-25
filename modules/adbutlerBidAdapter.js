import * as utils from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'adbutler';

function getTrackingPixelsMarkup(pixelURLs) {
  return pixelURLs
    .map(pixelURL => `<img height="0" width="0" border="0" style="display:none;" src="${pixelURL}"/>`)
    .join();
}

export const spec = {
  code: BIDDER_CODE,
  pageID: Math.floor(Math.random() * 10e6),
  aliases: ['divreach', 'doceree'],
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    return !!(bid.params.accountID && bid.params.zoneID);
  },

  buildRequests(validBidRequests) {
    const zoneCounters = {};

    return utils._map(validBidRequests, function (bidRequest) {
      const zoneID = bidRequest.params?.zoneID;

      zoneCounters[zoneID] ??= 0;

      const domain = bidRequest.params?.domain ?? 'servedbyadbutler.com';
      const adserveBase = `https://${domain}/adserve`;
      const params = {
        ...(bidRequest.params?.extra ?? {}),
        ID: bidRequest.params?.accountID,
        type: 'hbr',
        setID: zoneID,
        pid: spec.pageID,
        place: zoneCounters[zoneID],
        kw: bidRequest.params?.keyword,
      };

      const paramsString = Object.entries(params).map(([key, value]) => `${key}=${value}`).join(';');
      const requestURI = `${adserveBase}/;${paramsString};`;

      zoneCounters[zoneID]++;

      return {
        method: 'GET',
        url: requestURI,
        data: {},
        bidRequest,
      };
    });
  },

  interpretResponse(serverResponse, serverRequest) {
    const bidObj = serverRequest.bidRequest;
    const response = serverResponse.body ?? {};

    if (!bidObj || response.status !== 'SUCCESS') {
      return [];
    }

    const width = parseInt(response.width);
    const height = parseInt(response.height);

    const sizeValid = (bidObj.mediaTypes?.banner?.sizes ?? []).some(([w, h]) => w === width && h === height);

    if (!sizeValid) {
      return [];
    }

    const cpm = response.cpm;
    const minCPM = bidObj.params?.minCPM ?? null;
    const maxCPM = bidObj.params?.maxCPM ?? null;

    if (minCPM !== null && cpm < minCPM) {
      return [];
    }

    if (maxCPM !== null && cpm > maxCPM) {
      return [];
    }

    let advertiserDomains = [];

    if (response.advertiser?.domain) {
      advertiserDomains.push(response.advertiser.domain);
    }

    const bidResponse = {
      requestId: bidObj.bidId,
      cpm,
      currency: 'USD',
      width,
      height,
      ad: response.ad_code + getTrackingPixelsMarkup(response.tracking_pixels),
      ttl: 360,
      creativeId: response.placement_id,
      netRevenue: true,
      meta: {
        advertiserId: response.advertiser?.id,
        advertiserName: response.advertiser?.name,
        advertiserDomains,
      },
    };

    return [bidResponse];
  },
};

registerBidder(spec);
