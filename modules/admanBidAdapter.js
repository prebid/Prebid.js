import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { deepAccess } from '../src/utils.js';
import { config } from '../src/config.js';
import {
  isBidRequestValid,
  buildRequestsBase,
  interpretResponse,
  getUserSyncs,
  buildPlacementProcessingFunction
} from '../libraries/teqblazeUtils/bidderUtils.js';

const GVLID = 149;
const BIDDER_CODE = 'adman';
const AD_URL = 'https://pub.admanmedia.com/?c=o&m=multi';
const SYNC_URL = 'https://sync.admanmedia.com';

const addCustomFieldsToPlacement = (bid, bidderRequest, placement) => {
  placement.traffic = placement.adFormat;

  if (placement.adFormat === VIDEO) {
    placement.wPlayer = placement.playerSize?.[0]?.[0];
    placement.hPlayer = placement.playerSize?.[0]?.[1];
  }
};

const placementProcessingFunction = buildPlacementProcessingFunction({ addCustomFieldsToPlacement });

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest, placementProcessingFunction });
  const content = deepAccess(bidderRequest, 'ortb2.site.content', config.getAnyConfig('ortb2.site.content'));

  if (content) {
    request.data.content = content;
  }

  return request;
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(['placementId']),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
