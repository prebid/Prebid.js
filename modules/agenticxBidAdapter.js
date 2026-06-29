import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO, AUDIO  } from '../src/mediaTypes.js';
import {
  createConverter,
  isBidRequestValid as validateBidRequest,
  createBuildRequests,
  interpretResponse as interpretResponseUtil,
  createGetUserSyncs,
} from '../libraries/agenticxUtils/bidderUtils.js';

const BIDDER_CODE = 'agenticx';
const ENDPOINT_URL = 'https://ads.theagenticx.ai/ads/rtb/prebid/js';
const SYNC_URL = 'https://sync.theagenticx.ai/sync';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 60;

const converter = createConverter({ defaultCurrency: DEFAULT_CURRENCY, defaultTtl: DEFAULT_TTL });

const isBidRequestValid = validateBidRequest;
const buildRequests = createBuildRequests(
  { converter, endpointUrl: ENDPOINT_URL }
);
const getUserSyncs = createGetUserSyncs(SYNC_URL);

const interpretResponse = (serverResponse, request) => {
  return interpretResponseUtil(serverResponse, request, {
    defaultCurrency: DEFAULT_CURRENCY,
    defaultTtl: DEFAULT_TTL,
  });
};

export const spec = {
  code: BIDDER_CODE,
  // TODO: set gvlid once confirmed with AI Digital / AdSmartX team
  gvlid: undefined,
  supportedMediaTypes: [BANNER, VIDEO, AUDIO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
