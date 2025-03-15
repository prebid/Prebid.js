import {registerBidder} from '../src/adapters/bidderFactory.ts';
import {BANNER, VIDEO} from '../src/mediaTypes.ts';
import {getStorageManager} from '../src/storageManager.js';
import {
  createBuildRequestsFn,
  createInterpretResponseFn,
  createUserSyncGetter,
  isBidRequestValid
} from '../libraries/vidazooUtils/bidderUtils.js';

const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'tagoras';
const BIDDER_VERSION = '1.0.0';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.tagoras.io`;
}

const buildRequests = createBuildRequestsFn(createDomain, null, storage, BIDDER_CODE, BIDDER_VERSION, false);

const interpretResponse = createInterpretResponseFn(BIDDER_CODE, false);

const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.tagoras.io/api/sync/iframe',
  imageSyncUrl: 'https://sync.tagoras.io/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
