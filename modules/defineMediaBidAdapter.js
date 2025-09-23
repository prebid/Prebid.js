import {logInfo, logError, logWarn, deepSetValue } from "../src/utils.js";

import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'defineMedia';
const IAB_GVL_ID = 440;
const SUPPORTED_MEDIA_TYPES = [BANNER];

const ENDPOINT_URL_DEV = 'https://rtb-dev.conative.network/openrtb2/auction';
const ENDPOINT_URL_PROD = 'https://rtb.conative.network/openrtb2/auction';
const METHOD = 'POST';

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 1000
  }
});

export const spec = {
  code: BIDDER_CODE,
  gvlid: IAB_GVL_ID,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,

  isBidRequestValid: (bid) => {
    const hasSupplierDomainName = Boolean(bid?.params?.supplierDomainName);
    const isDevMode = Boolean(bid?.params?.devMode);
    logInfo(`[${BIDDER_CODE}] isBidRequestValid called with:`, { bid, hasSupplierDomainName, isDevMode });
    const isValid = hasSupplierDomainName;
    logInfo(`[${BIDDER_CODE}] isBidRequestValid returned:`, isValid);
    return isValid;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    return validBidRequests?.map(function(req) {
      // DeepCopy the request to avoid modifying the original object
      const oneBidRequest = [JSON.parse(JSON.stringify(req))];
      const ortbRequest = converter.toORTB({
        bidderRequest: bidderRequest,
        bidRequests: oneBidRequest
      });

      const params = oneBidRequest[0].params;
      const isDevMode = Boolean(params?.devMode);
      const endpointUrl = isDevMode ? ENDPOINT_URL_DEV : ENDPOINT_URL_PROD;

      // use supplierDomainName purely as schain 'asi' identifier for our supply path;
      // no sellers.json is expected on the publisher side
      deepSetValue(ortbRequest, 'source.schain.complete', 1);
      deepSetValue(ortbRequest, 'source.schain.nodes.0.asi', '' + params.supplierDomainName);

      logInfo(`[${BIDDER_CODE}] Mapped ORTB Request from`, oneBidRequest, ' to ', ortbRequest, ' with bidderRequest ', bidderRequest);
      return {
        method: METHOD,
        url: endpointUrl,
        data: ortbRequest,
      }
    });
  },

  interpretResponse: (serverResponse, request) => {
    logInfo(`[${BIDDER_CODE}] interpretResponse called with:`, { serverResponse, request });

    if (!serverResponse?.body) {
      logWarn(`[${BIDDER_CODE}] No response body received`);
      return [];
    }

    return converter.fromORTB({response: serverResponse.body, request: request.data}).bids;
  },

  onTimeout: (timeoutData) => {
    logInfo(`[${BIDDER_CODE}] onTimeout called with:`, timeoutData);
  },

  onBidWon: (bid) => {
    if (bid?.burl) {
      ajax(bid.burl, null, null);
    }
    logInfo(`[${BIDDER_CODE}] onBidWon called with bid:`, bid);
  },

  onBidderError: ({ error, bidderRequest }) => {
    /* if (bid?.lurl) {
      ajax(bid.lurl, null, null);
    } */
    logError(`[${BIDDER_CODE}] onBidderError called with:`, { error, bidderRequest });
  },

  onAdRenderSucceeded: (bid) => {
    logInfo(`[${BIDDER_CODE}] onAdRenderSucceeded called with bid:`, bid);
  }
};

registerBidder(spec);
