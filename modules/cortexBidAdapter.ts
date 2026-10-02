import { type AdapterRequest, type BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { type BidRequest, type ClientBidderRequest } from '../src/adapterManager.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  type TeqBlazeBidParams
} from '../libraries/teqblazeUtils/bidderUtils.ts';
import { getTimeZone } from '../libraries/timezone/timezone.js';

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: TeqBlazeBidParams;
  }
}

const BIDDER_CODE = 'cortex';
const SYNC_URL = 'https://sync.targetadserver.com';

const REGION_SUBDOMAIN = {
  EU: 'eu',
  US_EAST: 'us-east',
  APAC: 'apac',
};

function getRegionSubdomain(): string {
  try {
    const tz = getTimeZone();
    const region = tz.split('/')[0];

    switch (region) {
      case 'Asia':
      case 'Australia':
      case 'Antarctica':
      case 'Pacific':
      case 'Indian':
        return REGION_SUBDOMAIN.APAC;
      case 'Europe':
      case 'Africa':
      case 'Atlantic':
      case 'Arctic':
        return REGION_SUBDOMAIN.EU;
      case 'America':
      case 'US':
      case 'Canada':
        return REGION_SUBDOMAIN.US_EAST;
      default:
        return REGION_SUBDOMAIN.EU;
    }
  } catch (err) {
    return REGION_SUBDOMAIN.EU;
  }
}

export function createDomain(): string {
  const subdomain = getRegionSubdomain();
  return `https://${subdomain}.targetadserver.com`;
}

const buildRequests = (
  validBidRequests: BidRequest<typeof BIDDER_CODE>[] = [],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>
): AdapterRequest => {
  const AD_URL = `${createDomain()}/pbjs`;
  return buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest });
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
