import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'acuityads';
const AD_URL = 'https://prebid.admanmedia.com/pbjs';
const SYNC_URL = 'https://cs.admanmedia.com';

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

  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
