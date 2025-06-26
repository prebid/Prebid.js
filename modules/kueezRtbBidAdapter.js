import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {
  createBuildRequestsFn,
  createInterpretResponseFn,
  createUserSyncGetter,
  isBidRequestValid,
} from '../libraries/vidazooUtils/bidderUtils.js';

const GVLID = 1165;
const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'kueezrtb';
const BIDDER_VERSION = '1.0.0';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: createBuildRequestsFn(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, false, true),
  interpretResponse: createInterpretResponseFn(BIDDER_CODE, false),
  getUserSyncs: createUserSyncGetter({
    iframeSyncUrl: 'https://sync.kueezrtb.com/api/sync/iframe',
    imageSyncUrl: 'https://sync.kueezrtb.com/api/sync/image'
  }),
};

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.kueezrtb.com`;
}


function createUniqueRequestData(hashUrl, bid) {
  const {auctionId, transactionId} = bid;
  return {
    auctionId,
    transactionId,
  };
}

registerBidder(spec);

export class getAndSetFirstPartyData {
}
