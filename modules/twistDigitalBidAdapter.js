import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {
  isBidRequestValid, createInterpretResponseFn, createUserSyncGetter, createBuildRequestsFn, onBidWon
} from '../libraries/vidazooUtils/bidderUtils.js';

const GVLID = 1292;
const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'twistdigital';
const BIDDER_VERSION = '1.0.0';

export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.twist.win`;
}

const buildRequests = createBuildRequestsFn(createDomain, null, storage, BIDDER_CODE, BIDDER_VERSION, true);

const interpretResponse = createInterpretResponseFn(BIDDER_CODE, true);

const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.twist.win/api/sync/iframe', imageSyncUrl: 'https://sync.twist.win/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon
};

registerBidder(spec);
