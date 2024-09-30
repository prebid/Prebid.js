import {
  logWarn,
  logInfo,
  isArray,
  deepAccess,
  triggerPixel,
} from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  getEndpoint,
  generateBidsParams,
  generateGeneralParams,
  buildBidResponse,
} from '../libraries/riseUtils/index.js';

const SUPPORTED_AD_TYPES = [BANNER, VIDEO];
const BIDDER_CODE = 'shinez';
const ADAPTER_VERSION = '1.0.0';
const TTL = 360;
const CURRENCY = 'USD';
const BASE_URL = 'https://hb.sweetgum.io/';
const MODES = {
  PRODUCTION: 'hb-sz-multi',
  TEST: 'hb-multi-sz-test'
};

export const spec = {
  code: BIDDER_CODE,
  version: ADAPTER_VERSION,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to Shinez adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for Shinez adapter');
      return false;
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const combinedRequestsObject = {};

    // use data from the first bid, to create the general params for all bids
    const generalObject = validBidRequests[0];
    const testMode = generalObject.params.testMode;

    combinedRequestsObject.params = generateGeneralParams(generalObject, bidderRequest);
    combinedRequestsObject.bids = generateBidsParams(validBidRequests, bidderRequest);

    return {
      method: 'POST',
      url: getEndpoint(testMode, BASE_URL, MODES),
      data: combinedRequestsObject
    }
  },
  interpretResponse: function ({body}) {
    const bidResponses = [];

    if (body.bids) {
      body.bids.forEach(adUnit => {
        const bidResponse = buildBidResponse(adUnit, CURRENCY, TTL, VIDEO, BANNER);
        bidResponses.push(bidResponse);
      });
    }

    return bidResponses;
  },
  getUserSyncs: function (syncOptions, serverResponses) {
    const syncs = [];
    for (const response of serverResponses) {
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
          }
        });
        syncs.push(...pixels);
      }
    }
    return syncs;
  },
  onBidWon: function (bid) {
    if (bid == null) {
      return;
    }

    logInfo('onBidWon:', bid);
    if (bid.hasOwnProperty('nurl') && bid.nurl.length > 0) {
      triggerPixel(bid.nurl);
    }
  }
};

registerBidder(spec);
