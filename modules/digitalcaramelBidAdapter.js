import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getUserSyncs, sspInterpretResponse } from '../libraries/vizionikUtils/vizionikUtils.js';

const BIDDER_CODE = 'digitalcaramel';
const DEFAULT_ENDPOINT = 'ssp-asr.digitalcaramel.com';
const SYNC_ENDPOINT = 'sync.digitalcaramel.com';
const ADOMAIN = 'digitalcaramel.com';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: function(bid) {
    const valid = bid.params.siteId && bid.params.placementId;

    return !!valid;
  },

  buildRequests: function(validBidRequests, bidderRequest) {
    const requests = [];
    for (const bid of validBidRequests) {
      const endpoint = bid.params.endpoint || DEFAULT_ENDPOINT;

      requests.push({
        method: 'GET',
        url: `https://${endpoint}/get`,
        data: {
          site_id: bid.params.siteId,
          placement_id: bid.params.placementId,
          prebid: true,
        },
        bidRequest: bid,
      });
    }

    return requests;
  },

  interpretResponse: function(serverResponse, request) {
    return sspInterpretResponse(serverResponse, request, TIME_TO_LIVE, ADOMAIN);
  },

  getUserSyncs: function(syncOptions, serverResponses, gdprConsent, uspConsent) {
    return getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, SYNC_ENDPOINT, {usp: 'usp', consent: 'consent'})
  },

  supportedMediaTypes: [ BANNER, VIDEO ]
}

registerBidder(spec);
