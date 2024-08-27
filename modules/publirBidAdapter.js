import {
  logWarn,
  logInfo,
  isArray,
  deepAccess,
  timestamp,
  triggerPixel,
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { ajax } from '../src/ajax.js';
import {
  generateBidsParams,
  generateGeneralParams,
} from '../libraries/riseUtils/index.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'publir';
const ADAPTER_VERSION = '1.0.0';
const TTL = 360;
const CURRENCY = 'USD';
const BASE_URL = 'https://prebid.publir.com/publirPrebidEndPoint';
const DEFAULT_IMPS_ENDPOINT = 'https://prebidimpst.publir.com/publirPrebidImpressionTracker';

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });
export const spec = {
  code: BIDDER_CODE,
  version: ADAPTER_VERSION,
  aliases: ['plr'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params.pubId) {
      logWarn('pubId is a mandatory param for Publir adapter');
      return false;
    }
    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const combinedRequestsObject = {};

    const generalObject = validBidRequests[0];
    combinedRequestsObject.params = generateGeneralParams(generalObject, bidderRequest, ADAPTER_VERSION);
    combinedRequestsObject.bids = generateBidsParams(validBidRequests, bidderRequest);
    combinedRequestsObject.bids.timestamp = timestamp();

    let options = {
      withCredentials: false
    };

    return {
      method: 'POST',
      url: BASE_URL,
      data: combinedRequestsObject,
      options
    };
  },
  interpretResponse: function ({ body }) {
    const bidResponses = [];
    if (body.bids) {
      body.bids.forEach(adUnit => {
        const bidResponse = {
          requestId: adUnit.requestId,
          cpm: adUnit.cpm,
          currency: adUnit.currency || CURRENCY,
          width: adUnit.width,
          height: adUnit.height,
          ttl: adUnit.ttl || TTL,
          creativeId: adUnit.creativeId,
          netRevenue: adUnit.netRevenue || true,
          nurl: adUnit.nurl,
          mediaType: adUnit.mediaType,
          meta: {
            mediaType: adUnit.mediaType
          },
        };

        if (adUnit.mediaType === VIDEO) {
          bidResponse.vastXml = adUnit.vastXml;
        } else if (adUnit.mediaType === BANNER) {
          bidResponse.ad = adUnit.ad;
        }

        if (adUnit.adomain && adUnit.adomain.length) {
          bidResponse.meta.advertiserDomains = adUnit.adomain;
        } else {
          bidResponse.meta.advertiserDomains = [];
        }
        if (adUnit?.meta?.ad_key) {
          bidResponse.meta.ad_key = adUnit.meta.ad_key ?? null;
        }
        if (adUnit.campId) {
          bidResponse.campId = adUnit.campId;
        }
        bidResponse.bidder = BIDDER_CODE;
        bidResponses.push(bidResponse);
      });
    } else {
      return [];
    }
    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    for (const response of serverResponses) {
      if (response.body && response.body.params) {
        if (syncOptions.iframeEnabled && deepAccess(response, 'body.params.userSyncURL')) {
          syncs.push({
            type: 'iframe',
            url: deepAccess(response, 'body.params.userSyncURL')
          });
        }
        if (syncOptions.pixelEnabled && isArray(deepAccess(response, 'body.params.userSyncPixels'))) {
          const pixels = response.body.params.userSyncPixels.map(pixel => {
            return {
              type: 'image',
              url: pixel
            };
          });
          syncs.push(...pixels);
        }
      }
    }
    return syncs;
  },
  onBidWon: function (bid) {
    if (bid == null) {
      return;
    }
    logInfo('onBidWon:', bid);
    ajax(DEFAULT_IMPS_ENDPOINT, null, JSON.stringify(bid), { method: 'POST', mode: 'no-cors', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
    if (bid.hasOwnProperty('nurl') && bid.nurl.length > 0) {
      triggerPixel(bid.nurl);
    }
  },
};

registerBidder(spec);
