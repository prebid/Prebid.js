import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'playdigo';
const AD_URL = 'https://server.playdigo.com/pbjs';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse
};

registerBidder(spec);
