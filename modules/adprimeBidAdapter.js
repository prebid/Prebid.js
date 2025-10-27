import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { getAllOrtbKeywords } from '../libraries/keywords/keywords.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'adprime';
const AD_URL = 'https://delta.adprime.com/pbjs';
const SYNC_URL = 'https://sync.adprime.com';

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  if (placement.adFormat === VIDEO) {
    placement.wPlayer = placement.playerSize?.[0]?.[0];
    placement.hPlayer = placement.playerSize?.[0]?.[1];
  }
  if (bid.userId && bid.userId.idl_env) {
    placement.identeties = {};
    placement.identeties.identityLink = bid.userId.idl_env;
  }

  placement.keywords = getAllOrtbKeywords(bidderRequest.ortb2, bid.params.keywords);
  placement.audiences = bid.params.audiences || [];
};

const placementProcessingFunction = buildPlacementProcessingFunction({ addCustomFieldsToPlacement });

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
