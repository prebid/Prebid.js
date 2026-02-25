import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  getPublisherUserId,
  createConverter,
  isBidRequestValid as validateBidRequest,
  createBuildRequests,
  interpretResponse as interpretResponseUtil,
  createGetUserSyncs,
} from '../libraries/adsmartxUtils/bidderUtils.js';

const BIDDER_CODE = 'adsmartx';
const ENDPOINT_URL = 'https://ads.adsmartx.com/ads/rtb/prebid/js';
const SYNC_URL = 'https://ads.adsmartx.com/sync';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 60;

const syncParamsRef = { current: {} };
const converter = createConverter({ defaultCurrency: DEFAULT_CURRENCY, defaultTtl: DEFAULT_TTL });

const isBidRequestValid = validateBidRequest;
const buildRequests = createBuildRequests(
  { converter, endpointUrl: ENDPOINT_URL, getPublisherUserId },
  syncParamsRef
);
const getUserSyncs = createGetUserSyncs(SYNC_URL, syncParamsRef);

const interpretResponse = (serverResponse, request) => {
  return interpretResponseUtil(serverResponse, request, {
    defaultCurrency: DEFAULT_CURRENCY,
    defaultTtl: DEFAULT_TTL,
  });
};

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
