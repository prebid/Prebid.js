import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  isBidRequestValid,
  onBidWon,
  createUserSyncGetter,
  createBuildRequestsFn,
  createInterpretResponseFn,
  onAdRenderSucceeded,
  onBidViewable
} from '../libraries/vidazooUtils/bidderUtils.js';

/**
 * @typedef {import('./apesterBidAdapter.d.ts').ApesterBidRequestParams} ApesterBidRequestParams
 */

const DEFAULT_SUB_DOMAIN = 'bidder';
const BIDDER_CODE = 'apester';
const BIDDER_VERSION = '1.0.0';
const GVLID = 354;
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.apester.com`;
}

function createUniqueRequestData(hashUrl, bid) {
  const { auctionId, transactionId } = bid;
  return {
    auctionId,
    transactionId
  };
}

const NATIVE_OPTIONS = { supportNative: true };
const buildRequests = createBuildRequestsFn(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, false, NATIVE_OPTIONS);
const interpretResponse = createInterpretResponseFn(BIDDER_CODE, false, NATIVE_OPTIONS);
const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.apester.com/api/sync/iframe',
  imageSyncUrl: 'https://sync.apester.com/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  gvlid: GVLID,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
  onAdRenderSucceeded,
  onBidViewable
};

registerBidder(spec);
