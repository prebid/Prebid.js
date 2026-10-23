import { AdapterRequest, BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequestsBase, interpretResponse, getUserSyncs } from '../libraries/teqblazeUtils/bidderUtils.js';
import type { BidRequest, BaseBidderRequest } from '../src/adapterManager.ts';
import { getTimeZone } from '../libraries/timezone/timezone.js';

const BIDDER_CODE = 'reklamup';
const GVLID = 1619;
const AD_URL = 'https://#{SUBDOMAIN}#.reklamup.com/pbjs';
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

enum Subdomain {
  EU = 'eu-node',
  US_EAST = 'node'
}

const timezoneSubdomainMap: Record<string, Subdomain> = {
  'Europe': Subdomain.EU,
  'Africa': Subdomain.EU,
  'Atlantic': Subdomain.EU,
  'Arctic': Subdomain.EU,
  'Asia': Subdomain.EU,
  'Australia': Subdomain.US_EAST,
  'Antarctica': Subdomain.US_EAST,
  'Pacific': Subdomain.US_EAST,
  'Indian': Subdomain.US_EAST,
  'America': Subdomain.US_EAST
};

function getSubdomain(): string {
  try {
    const region = getTimeZone().split('/')[0];
    return timezoneSubdomainMap[region] || Subdomain.US_EAST;
  } catch (err) {
    return Subdomain.US_EAST;
  }
}

const buildRequests = (
  validBidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: BaseBidderRequest<typeof BIDDER_CODE>
): AdapterRequest => {
  const adUrl = AD_URL.replace('#{SUBDOMAIN}#', getSubdomain());
  return buildRequestsBase({ adUrl, validBidRequests, bidderRequest });
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
