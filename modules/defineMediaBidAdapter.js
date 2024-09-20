import * as utils from '../src/utils';
import { registerBidder } from '../src/adapters/bidderFactory';
import { BANNER } from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'
import { ajax } from '../src/ajax.js';

const BIDDER_CODE = 'defineMedia';
const IAB_GVL_ID = 755;
const SUPPORTED_MEDIA_TYPES = [BANNER];
const ENDPOINT_URL = 'https://rtb-dev.conative.network/openrtb2/auction';
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
    const isValid = Boolean(bid?.params?.mandantId);
    utils.logInfo(`[${BIDDER_CODE}] isBidRequestValid for bid ${bid.bidId}:`, isValid);
    return isValid;
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    utils.logInfo(`[${BIDDER_CODE}] buildRequests called with:`, { validBidRequests, bidderRequest });
    const isValid = Boolean(validBidRequests[0]?.params?.mandantId);

    if(!isValid) return [];

    const ortbRequest = converter.toORTB({validBidRequests, bidderRequest});

    utils.deepSetValue(ortbRequest.imp[0], 'ext.bidder.mandantId', validBidRequests[0].params.mandantId);

    utils.logInfo(`[${BIDDER_CODE}] Mapped ORTB Request:`, ortbRequest);

    return [{
      method: METHOD,
      url: ENDPOINT_URL,
      data: ortbRequest,
      options: {
        contentType: 'application/json',
        withCredentials: false
      }
    }];
  },

  interpretResponse: (serverResponse, request) => {
    utils.logInfo(`[${BIDDER_CODE}] interpretResponse called with:`, { serverResponse, request });

    if (!serverResponse?.body) {
      utils.logWarn(`[${BIDDER_CODE}] No response body received`);
      return [];
    }

    return converter.fromORTB({response: serverResponse.body, request: request.data}).bids;
  },

  onTimeout: (timeoutData) => {
    utils.logInfo(`[${BIDDER_CODE}] onTimeout called with:`, timeoutData);
  },

  onBidWon: (bid) => {
    if (bid?.burl) {
      ajax(bid.burl, null);
    }
    utils.logInfo(`[${BIDDER_CODE}] onBidWon called with bid:`, bid);
  },

  onBidderError: ({ error, bidderRequest }) => {
    if (bid?.lurl) {
      ajax(bid.lurl, null);
    }
    utils.logError(`[${BIDDER_CODE}] onBidderError called with:`, { error, bidderRequest });
  },

  onAdRenderSucceeded: (bid) => {
    utils.logInfo(`[${BIDDER_CODE}] onAdRenderSucceeded called with bid:`, bid);
  }
};

registerBidder(spec);
