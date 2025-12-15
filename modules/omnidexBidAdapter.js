import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {
  isBidRequestValid,
  onBidWon,
  createUserSyncGetter,
  createBuildRequestsFn,
  createInterpretResponseFn
} from '../libraries/vidazooUtils/bidderUtils.js';

const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'omnidex';
const BIDDER_VERSION = '1.0.0';
const GVLID = 1463;
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.omni-dex.io`;
}

function createUniqueRequestData(hashUrl, bid) {
  const {auctionId, transactionId} = bid;
  return {
    auctionId,
    transactionId
  };
}

const buildRequests = createBuildRequestsFn(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, false);
const interpretResponse = createInterpretResponseFn(BIDDER_CODE, false);
const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.omni-dex.io/api/sync/iframe',
  imageSyncUrl: 'https://sync.omni-dex.io/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
  gvlid: GVLID,
};

registerBidder(spec);
