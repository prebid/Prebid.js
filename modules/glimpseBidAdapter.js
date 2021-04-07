import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

const BIDDER_CODE = 'glimpse';

export const spec = {
  code: BIDDER_CODE,
  url: 'https://api.glimpseprotocol.io/cloud/v1/vault/prebid',
  supportedMediaTypes: [BANNER],

  isBidRequestValid: (bid) => {
    try {
      const { placementId } = bid.params;
      return typeof placementId === 'string' && placementId.length > 0;
    } catch (error) {
      return false;
    }
  },

  buildRequests: (validBidRequests, bidderRequest) => {
    const { url, code: bidderCode } = spec;

    const bids = validBidRequests.map((request) => {
      delete request.mediaTypes;
      return request;
    });

    const sdk = {
      source: 'pbjs',
      version: '$prebid.version$',
    };

    const payload = {
      ...bidderRequest,
      bidderCode,
      bids,
      sdk,
    };

    return {
      method: 'POST',
      url,
      data: JSON.stringify(payload),
    };
  },

  interpretResponse: (serverResponse, _) => {
    const bids = [];
    try {
      const { body } = serverResponse;
      bids.push(...body);
    } catch (error) {}

    return bids;
  },
};

registerBidder(spec);
