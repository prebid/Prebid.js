import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {
  createSessionId,
  isBidRequestValid,
  getCacheOpt,
  getNextDealId,
  onBidWon,
  createUserSyncGetter,
  getVidazooSessionId,
  createBuildRequestsFn,
  createInterpretResponseFn
} from '../libraries/vidazooUtils/bidderUtils.js';
import {OPT_CACHE_KEY, OPT_TIME_KEY} from '../libraries/vidazooUtils/constants.js';

const GVLID = 744;
const DEFAULT_SUB_DOMAIN = 'prebid';
const BIDDER_CODE = 'vidazoo';
const BIDDER_VERSION = '1.0.0';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});
export const webSessionId = createSessionId();

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.cootlogix.com`;
}

function createUniqueRequestData(hashUrl) {
  const dealId = getNextDealId(storage, hashUrl);
  const sessionId = getVidazooSessionId(storage);
  const ptrace = getCacheOpt(storage, OPT_CACHE_KEY);
  const vdzhum = getCacheOpt(storage, OPT_TIME_KEY);

  return {
    dealId: dealId, sessionId: sessionId, ptrace: ptrace, vdzhum: vdzhum, webSessionId: webSessionId
  };
}

const buildRequests = createBuildRequestsFn(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, true);
const interpretResponse = createInterpretResponseFn(BIDDER_CODE, true);
const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.cootlogix.com/api/sync/iframe', imageSyncUrl: 'https://sync.cootlogix.com/api/sync/image'
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
