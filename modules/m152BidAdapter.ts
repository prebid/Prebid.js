import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  interpretResponse,
  buildRequestsBase,
  getUserSyncs,
  type TeqBlazeBidParams
} from '../libraries/teqblazeUtils/bidderUtils.ts';
import type { BaseBidderRequest, BidRequest } from '../src/adapterManager.ts';

const BIDDER_CODE = 'm152';
const AD_URL = 'https://#{REGION}#.152media-ssp.com/pbjs';
const GVLID = 1111;
const SYNC_URL = 'https://cs.152media-ssp.com';

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: TeqBlazeBidParams;
  }
}

const buildRequests = (validBidRequests: BidRequest<string>[] = [], bidderRequest: BaseBidderRequest<string>) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest });
  const region = validBidRequests[0].params?.region as string;

  const regionMap: Record<string, string> = {
    eu: 'eu',
    'us-east': 'east'
  };

  request.url = AD_URL.replace('#{REGION}#', regionMap[region]);

  return request;
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
