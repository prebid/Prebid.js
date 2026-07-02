import { type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.ts';

const BIDDER_CODE = 'SMB';
const AD_URL = 'https://be.smartbid.ai/pbjs';

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
};

registerBidder(spec);
