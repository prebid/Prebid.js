import { logWarn } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';

const BIDDER_CODE = 'viewdeosDX';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['viewdeos'],
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: function(bid) {
    return true;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    logWarn(`Prebid.js adapter '${BIDDER_CODE}' is deprecated and no longer active.`);
    return [];
  },

  interpretResponse: function(serverResponse, bidRequest) {
    return [];
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    return [];
  }
};

registerBidder(spec);
