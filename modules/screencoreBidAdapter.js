import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'screencore';
const GVLID = 1473;
const BIDDER_VERSION = '1.0.0';
const SYNC_URL = 'https://cs.screencore.io';
const REGION_SUBDOMAIN_SUFFIX = {
  EU: 'taqeu',
  US: 'taqus',
  APAC: 'taqapac',
};

/**
 * Get subdomain URL suffix by region
 * @return {string}
 */
function getRegionSubdomainSuffix() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = timezone.split('/')[0];

    switch (region) {
      case 'Asia':
      case 'Australia':
      case 'Antarctica':
      case 'Pacific':
      case 'Indian':
        return REGION_SUBDOMAIN_SUFFIX['APAC'];
      case 'Europe':
      case 'Africa':
      case 'Atlantic':
      case 'Arctic':
        return REGION_SUBDOMAIN_SUFFIX['EU'];
      case 'America':
        return REGION_SUBDOMAIN_SUFFIX['US'];
      default:
        return REGION_SUBDOMAIN_SUFFIX['EU'];
    }
  } catch (err) {
    return REGION_SUBDOMAIN_SUFFIX['EU'];
  }
}

export function createDomain() {
  const subDomain = getRegionSubdomainSuffix();

  return `https://${subDomain}.screencore.io`;
}

const AD_URL = `${createDomain()}/prebid`;

const placementProcessingFunction = buildPlacementProcessingFunction();

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  return buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest, placementProcessingFunction });
};

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid: isBidRequestValid(),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL),
};

registerBidder(spec);
