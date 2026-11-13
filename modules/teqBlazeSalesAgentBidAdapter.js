import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  buildPlacementProcessingFunction,
  buildRequestsBase,
  interpretResponse,
  isBidRequestValid
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'teqBlazeSalesAgent';
const AD_URL = 'https://be-agent.teqblaze.io/pbjs';

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  const aeeSignals = bidderRequest.ortb2?.site?.ext?.data?.scope3_aee;

  if (aeeSignals) {
    placement.axei = aeeSignals.include;
    placement.axex = aeeSignals.exclude;

    if (aeeSignals.macro) {
      placement.axem = aeeSignals.macro;
    }
  }
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
  interpretResponse
};

registerBidder(spec);
