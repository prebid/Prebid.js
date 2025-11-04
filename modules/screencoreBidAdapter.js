import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  createBuildRequestsFn,
  createInterpretResponseFn,
  createUserSyncGetter,
  isBidRequestValid,
} from '../libraries/vidazooUtils/bidderUtils.js';

const BIDDER_CODE = 'screencore';
const GVLID = 1473;
const BIDDER_VERSION = '1.0.0';
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

export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export function createDomain() {
  const subDomain = getRegionSubdomainSuffix();

  return `https://${subDomain}.screencore.io`;
}

const buildRequests = createBuildRequestsFn(createDomain, null, storage, BIDDER_CODE, BIDDER_VERSION, false);

const interpretResponse = createInterpretResponseFn(BIDDER_CODE, false);

const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://cs.screencore.io/api/sync/iframe',
  imageSyncUrl: 'https://cs.screencore.io/api/sync/image',
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
