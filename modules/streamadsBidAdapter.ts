import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  type TeqBlazeBidParams
} from '../libraries/teqblazeUtils/bidderUtils.ts';

const BIDDER_CODE = 'streamads';
const AD_URL = 'https://rtb-ssp-eu.streamads.media/pbjs';
const SYNC_URL = 'https://sync.streamads.media';

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
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
