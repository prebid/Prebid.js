import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder, type AdapterRequest, type BidderSpec, type ServerResponse } from '../src/adapters/bidderFactory.js';
import { buildRequests as xeBuildRequests, getUserSyncs, interpretResponse as xeInterpretResponse, isBidRequestValid } from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'revealon';
const ENDPOINT = 'https://pbjs.revealonmedia.live';

export type RevealonBidParams = {
  pid: string;
  ext?: Record<string, unknown>;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: RevealonBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => isBidRequestValid(bid, ['pid']),
  buildRequests: (validBidRequests, bidderRequest) => xeBuildRequests(validBidRequests, bidderRequest, ENDPOINT) as AdapterRequest,
  interpretResponse: (response: ServerResponse, request: AdapterRequest) => xeInterpretResponse(response, request as any),
  getUserSyncs
}

registerBidder(spec);
