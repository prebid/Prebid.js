import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  buildRequests,
  interpretResponse,
  isBidRequestValid,
  type TeqBlazeBidParams
} from '../libraries/teqblazeUtils/bidderUtils.ts';

const BIDDER_CODE = 'tqblz_demo';
const AD_URL = 'https://test-ssp-node-1.teqblaze.com/pbjs';

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: TeqBlazeBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse
};

registerBidder(spec);
