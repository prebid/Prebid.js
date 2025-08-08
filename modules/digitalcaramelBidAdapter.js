import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getUserSyncs, sspBuildRequests, sspInterpretResponse, sspValidRequest } from '../libraries/vizionikUtils/vizionikUtils.js';

const BIDDER_CODE = 'digitalcaramel';
const DEFAULT_ENDPOINT = 'ssp-asr.digitalcaramel.com';
const SYNC_ENDPOINT = 'sync.digitalcaramel.com';
const ADOMAIN = 'digitalcaramel.com';
const TIME_TO_LIVE = 360;

export const spec = {
  code: BIDDER_CODE,

  isBidRequestValid: sspValidRequest,
  buildRequests: sspBuildRequests(DEFAULT_ENDPOINT),
  interpretResponse: sspInterpretResponse(TIME_TO_LIVE, ADOMAIN),
  getUserSyncs: getUserSyncs(SYNC_ENDPOINT, {usp: 'usp', consent: 'consent'}),
  supportedMediaTypes: [ BANNER, VIDEO ]
}

registerBidder(spec);
