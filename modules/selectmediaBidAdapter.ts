import { AdapterRequest, BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  interpretResponse,
  isBidRequestValid,
  getUserSyncs,
  buildRequestsBase,
  type TeqBlazeBidParams,
} from '../libraries/teqblazeUtils/bidderUtils.ts';
import type { BidRequest, BaseBidderRequest } from '../src/adapterManager.ts';

const BIDDER_CODE = 'selectmedia';
const AD_URL = 'https://#{REGION}#.zxyvrtd.com/pbjs';
const GVLID = 775;
const SYNC_URL = 'https://sync.zxyvrtd.com';

type Region = 'eu' | 'us-east';
type SelectmediaBidParams = TeqBlazeBidParams & { region: Region };

const VALID_REGIONS = new Set<string>(['eu', 'us-east'] satisfies Region[]);

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: SelectmediaBidParams;
  }
}

const regionMap: Record<string, string> = {
  eu: 'eu',
  'us-east': 'us-east'
};

const baseIsBidRequestValid = isBidRequestValid();

const buildRequests = (
  validBidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: BaseBidderRequest<typeof BIDDER_CODE>
): AdapterRequest => {
  const region = validBidRequests[0]?.params?.region;
  const adUrl = AD_URL.replace('#{REGION}#', region != null ? (regionMap[region] ?? region) : '');

  return buildRequestsBase({ adUrl, validBidRequests, bidderRequest });
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: (bid) => baseIsBidRequestValid(bid) && VALID_REGIONS.has(bid.params?.region),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
