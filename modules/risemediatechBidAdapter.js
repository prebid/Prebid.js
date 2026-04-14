import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import {
  createConverter,
  isBidRequestValid as validateBidRequest,
  createBuildRequests,
  interpretResponse as interpretResponseUtil,
} from '../libraries/adsmartxUtils/bidderUtils.js';
import { logWarn } from '../src/utils.js';

const BIDDER_CODE = 'risemediatech';
const ENDPOINT_URL = 'https://dev-ads.risemediatech.com/ads/rtb/prebid/js';
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TTL = 60;

const converter = createConverter({ defaultCurrency: DEFAULT_CURRENCY, defaultTtl: DEFAULT_TTL });

const isBidRequestValid = false;
logWarn('Risemediatech Bid Adapter has been deprecated. Hence disabling this adapter by rejecting bid requests by default.');
const buildRequests = createBuildRequests(
  { converter, endpointUrl: ENDPOINT_URL }
);

const interpretResponse = (serverResponse, request) => {
  return interpretResponseUtil(serverResponse, request, {
    defaultCurrency: DEFAULT_CURRENCY,
    defaultTtl: DEFAULT_TTL,
  });
};

const getUserSyncs = (syncOptions, serverResponses, gdprConsent, uspConsent, gppConsent) => {
  return [];
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
