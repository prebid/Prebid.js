import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'harion';
const GVLID = 1406;
const AD_URL = 'https://east-api.harion-ma.com/pbjs';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse: (serverResponse) => {
    if (!serverResponse || !Array.isArray(serverResponse.body)) {
      return [];
    }

    return interpretResponse(serverResponse);
  }
};

registerBidder(spec);
