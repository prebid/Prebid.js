import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
import { config } from '../src/config.js';

export const BIDDER_CODE = 'aseal';
const SUPPORTED_AD_TYPES = [BANNER];
export const API_ENDPOINT = 'https://tkprebid.aotter.net/prebid/adapter';
export const HEADER_AOTTER_VERSION = 'prebid_0.0.1';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['aotter', 'trek'],
  supportedMediaTypes: SUPPORTED_AD_TYPES,

  isBidRequestValid: (bid) => !!bid.params.placeUid && typeof bid.params.placeUid === 'string',

  buildRequests: (validBidRequests, bidderRequest) => {
    if (validBidRequests.length === 0) {
      return [];
    }

    const clientId =
    config.getConfig('aseal.clientId') || '';

    const data = {
      bids: validBidRequests,
      refererInfo: bidderRequest.refererInfo,
    };

    const options = {
      contentType: 'application/json',
      withCredentials: true,
      customHeaders: {
        'x-aotter-clientid': clientId,
        'x-aotter-version': HEADER_AOTTER_VERSION,
      },
    };

    return [{
      method: 'POST',
      url: API_ENDPOINT,
      data,
      options,
    }];
  },

  interpretResponse: (serverResponse, bidRequest) => {
    if (!Array.isArray(serverResponse.body)) {
      return [];
    }

    const bidResponses = serverResponse.body;

    return bidResponses;
  },
};

registerBidder(spec);
