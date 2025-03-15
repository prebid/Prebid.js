import { registerBidder } from '../src/adapters/bidderFactory.ts';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.ts';
import { isBidRequestValid, buildRequests, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'loyal';
const AD_URL = 'https://us-east-1.loyal.app/pbjs';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse
};

registerBidder(spec);
