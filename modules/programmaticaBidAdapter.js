import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getUserSyncs, sspBuildRequests, sspInterpretResponse, sspValidRequest } from '../libraries/vizionikUtils/vizionikUtils.js';

const BIDDER_CODE = 'programmatica';
const DEFAULT_ENDPOINT = 'asr.programmatica.com';
const SYNC_ENDPOINT = 'sync.programmatica.com';
const ADOMAIN = 'programmatica.com';
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
