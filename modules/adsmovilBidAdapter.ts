import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.ts';

const BIDDER_CODE = 'adsmovil';
const AD_URL = 'https://tag-ssp.adsmovil.com/pbjs';
const SYNC_URL = 'https://sync-ssp.adsmovil.com';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE] as const,

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
} as const;

registerBidder(spec);
