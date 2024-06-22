import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'krushmedia';
const AD_URL = 'https://ads4.krushmedia.com/?c=rtb&m=hb';
const SYNC_URL = 'https://cs.krushmedia.com';

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  placement.key = bid.params.key;
  placement.traffic = placement.adFormat;
  if (placement.adFormat === VIDEO) {
    placement.wPlayer = placement.playerSize?.[0]?.[0];
    placement.hPlayer = placement.playerSize?.[0]?.[1];
  }
};

const placementProcessingFunction = buildPlacementProcessingFunction({ addCustomFieldsToPlacement });

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  return buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest, placementProcessingFunction });
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['key']),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
