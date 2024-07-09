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
  getEndpoint,
  generateBidsParams,
  generateGeneralParams,
  buildBidResponse,
} from '../libraries/riseUtils/index.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'publir';
const ADAPTER_VERSION = '1.0.0';
const TTL = 360;
const CURRENCY = 'USD';
const BASE_URL = 'https://prebid.publir.com/publirPrebidEndPoint';
const DEFAULT_IMPS_ENDPOINT = 'https://prebidimpst.publir.com/publirPrebidImpressionTracker';
const MODES = {
  PRODUCTION: 'hb-mm-multi',
  TEST: 'hb-multi-mm-test'
};

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
    const testMode = generalObject.params.testMode;

    combinedRequestsObject.params = generateGeneralParams(generalObject, bidderRequest, ADAPTER_VERSION);
    combinedRequestsObject.bids = generateBidsParams(validBidRequests, bidderRequest);
    combinedRequestsObject.bids.timestamp = timestamp();

    let options = {
      withCredentials: false
    };

    return {
      method: 'POST',
      url: getEndpoint(testMode, BASE_URL, MODES),
      data: combinedRequestsObject,
      options
    };
  },
  interpretResponse: function ({ body }) {
    const bidResponses = [];
    if (body.bids) {
      body.bids.forEach(adUnit => {
        const bidResponse = buildBidResponse(adUnit, CURRENCY, TTL, VIDEO, BANNER);
        bidResponse.bidder = BIDDER_CODE;
        if (adUnit?.meta?.ad_key) {
          bidResponse.meta.ad_key = adUnit.meta.ad_key ?? null;
        }
        if (adUnit.campId) {
          bidResponse.campId = adUnit.campId;
        }
        bidResponses.push(bidResponse);
      });
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
