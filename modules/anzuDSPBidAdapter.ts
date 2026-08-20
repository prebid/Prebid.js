import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder, type AdapterRequest, type BidderSpec, type ServerResponse } from '../src/adapters/bidderFactory.js';
import { buildRequests as xeBuildRequests, getUserSyncs, interpretResponse as xeInterpretResponse, isBidRequestValid } from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'anzuDSP';
const ENDPOINT = 'https://pbjs.anzu-rtb.live';

export type AnzuDSPBidParams = {
  pid: string;
  env: string;
  ext?: Record<string, unknown>;
};

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AnzuDSPBidParams;
  }
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => isBidRequestValid(bid),
  buildRequests: (validBidRequests, bidderRequest) => xeBuildRequests(validBidRequests, bidderRequest, ENDPOINT) as AdapterRequest,
  interpretResponse: (response: ServerResponse, request: AdapterRequest) => xeInterpretResponse(response, request as any),
  getUserSyncs
};

registerBidder(spec);
