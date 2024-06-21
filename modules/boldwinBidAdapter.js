import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  buildPlacementProcessingFunction,
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'boldwin';
const AD_URL = 'https://ssp.videowalldirect.com/pbjs';
const SYNC_URL = 'https://sync.videowalldirect.com';

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
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

  isBidRequestValid,
  buildRequests,
  interpretResponse,

  getUserSyncs: () => {
    return [{
      type: 'image',
      url: SYNC_URL
    }];
  }
};

registerBidder(spec);
