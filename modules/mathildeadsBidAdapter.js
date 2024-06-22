import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'mathildeads';
const AD_URL = 'https://endpoint2.mathilde-ads.com/pbjs';
const SYNC_URL = 'https://cs2.mathilde-ads.com';

const addPlacementType = (bid, bidderRequest, placement) => {
  placement.placementId = bid.params.placementId;
  placement.type = 'publisher';
};

const placementProcessingFunction = buildPlacementProcessingFunction({ addPlacementType });

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  return buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest, placementProcessingFunction });
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['placementId']),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
