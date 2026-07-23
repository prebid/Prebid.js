import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import {
  isBidRequestValid,
  onBidWon,
  createUserSyncGetter,
  createBuildRequestsFn,
  createInterpretResponseFn
} from '../libraries/vidazooUtils/bidderUtils.js';

/**
 * @typedef {import('./copper6sspBidAdapter.d.ts').Copper6SSPBidRequestParams} Copper6SSPBidRequestParams
 */

const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'copper6ssp';
const BIDDER_VERSION = '1.0.0';
const GVLID = 1356;
const DEFAULT_CID = "600000000000000000000cc6";
const DEFAULT_PID = "600000000000000000000dc6";
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.copper6.com`;
}

function createUniqueRequestData(hashUrl, bid) {
  const { auctionId, transactionId } = bid;
  return {
    auctionId,
    transactionId
  };
}

function legacySupport(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, allowSingleRequest = false) {
  const buildFunction = createBuildRequestsFn(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, allowSingleRequest);
  return function legacyHandler(validBidRequests, bidderRequest) {
    const modifiedRequests = validBidRequests.map(request => {
      if (!request.params?.cId) {
        if (request.params?.placementId) {
          request.params.cId = request.params.placementId;
        } else {
          request.params.cId = DEFAULT_CID;
        }
        delete request.params.placementId;
      }
      if (!request.params?.pId) {
        if (request.params?.endpointId) {
          request.params.pId = request.params.endpointId;
        } else {
          request.params.pId = DEFAULT_PID;
        }
      }
      return request;
    });
    return buildFunction(modifiedRequests, bidderRequest);
  };
}

const buildRequests = legacySupport(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, false);
const interpretResponse = createInterpretResponseFn(BIDDER_CODE, false);
const getUserSyncs = createUserSyncGetter({
  iframeSyncUrl: 'https://sync.copper6.com/api/sync/iframe',
  imageSyncUrl: 'https://sync.copper6.com/api/sync/image'
});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  supportedMediaTypes: [BANNER, VIDEO],
  gvlid: GVLID,
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
};

registerBidder(spec);
