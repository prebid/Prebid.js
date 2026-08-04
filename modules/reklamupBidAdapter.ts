import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequests, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'reklamup';
const GVLID = 1619;
const AD_URL = 'https://node.reklamup.com/pbjs';
const SYNC_URL = 'https://usersync.reklamup.com';

interface ReklamupBidParams {
  [key: string]: unknown;
  placementId?: string;
  endpointId?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: ReklamupBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests: buildRequests(AD_URL),
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
