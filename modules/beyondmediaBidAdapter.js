import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'beyondmedia';
const AD_URL = 'https://backend.andbeyond.media/pbjs';
const SYNC_URL = 'https://cookies.andbeyond.media';

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
