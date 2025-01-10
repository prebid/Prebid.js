import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'advect';
const AD_URL = 'https://bs.advect.ru/prebid';

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse
};

registerBidder(spec);
