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
const BIDDER_CODE = 'rise';
const ADAPTER_VERSION = '6.0.0';
const TTL = 360;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_GVLID = 1043;
const BASE_URL = 'https://hb.yellowblue.io/';
const MODES = {
  PRODUCTION: 'hb-multi',
  TEST: 'hb-multi-test'
};

export const spec = {
  code: BIDDER_CODE,
  aliases: [
    { code: 'risexchange', gvlid: DEFAULT_GVLID },
    { code: 'openwebxchange', gvlid: 280 }
  ],
  gvlid: DEFAULT_GVLID,
  version: ADAPTER_VERSION,
  supportedMediaTypes: SUPPORTED_AD_TYPES,
  isBidRequestValid: function (bidRequest) {
    if (!bidRequest.params) {
      logWarn('no params have been set to Rise adapter');
      return false;
    }

    if (!bidRequest.params.org) {
      logWarn('org is a mandatory param for Rise adapter');
      return false;
    }

    return true;
  },
  buildRequests: function (validBidRequests, bidderRequest) {
    const combinedRequestsObject = {};

    // use data from the first bid, to create the general params for all bids
    const generalObject = validBidRequests[0];
    const testMode = generalObject.params.testMode;
    const rtbDomain = generalObject.params.rtbDomain || BASE_URL;

    combinedRequestsObject.params = generateGeneralParams(generalObject, bidderRequest);
    combinedRequestsObject.bids = generateBidsParams(validBidRequests, bidderRequest);

    return {
      method: 'POST',
      url: getEndpoint(testMode, rtbDomain, MODES),
      data: combinedRequestsObject
    }
  },
  interpretResponse: function ({ body }) {
    const bidResponses = [];

    if (body.bids) {
      body.bids.forEach(adUnit => {
        const bidResponse = buildBidResponse(adUnit, DEFAULT_CURRENCY, TTL, VIDEO, BANNER);
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
