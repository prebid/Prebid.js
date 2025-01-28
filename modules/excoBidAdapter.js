import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {
  isBidRequestValid, createUserSyncGetter, createInterpretResponseFn, createBuildRequestsFn
} from '../libraries/vidazooUtils/bidderUtils.js';

const DEFAULT_SUB_DOMAIN = 'rtb';
const BIDDER_CODE = 'exco';
const BIDDER_VERSION = '1.0.0';
const GVLID = 444;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.exco-pb.com`;
}

const buildRequests = createBuildRequestsFn(createDomain, null, storage, BIDDER_CODE, BIDDER_VERSION, false);

const interpretResponse = createInterpretResponseFn(BIDDER_CODE, false);

const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://cs.exco-pb.com/api/sync/iframe', imageSyncUrl: 'https://cs.exco-pb.com/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
