import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { logWarn } from '../src/utils.js';

interface YaleoBidParams {
  /**
   * Yaleo placement ID.
   */
  placementId: string;
  /**
   * Member ID.
   * @default 3927
   */
  memberId?: number;
  /**
   * Maximum CPM value. Bids with a CPM higher than the specified value will be rejected.
   */
  maxCpm?: number;
}

interface YaleoConfig {
  /**
   * Overrides the bidder endpoint URL. Must be one of the approved HTTPS Yaleo
   * endpoints; any other value is ignored. Defaults to the production endpoint.
   */
  endpoint?: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: YaleoBidParams;
  }
}

declare module '../src/config' {
  interface Config {
    [BIDDER_CODE]?: YaleoConfig;
  }
}

const BIDDER_CODE = 'yaleo';
const AUDIENZZ_VENDOR_ID = 783;
const DEFAULT_ENDPOINT = 'https://bidder.yaleo.com/prebid';
const ALLOWED_ENDPOINTS = new Set([DEFAULT_ENDPOINT, 'https://dev-bidder.yaleo.com/prebid']);
const DEFAULT_TTL = 300;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  processors: pbsExtensions,
});

const resolveEndpoint = (): string => {
  const customEndpoint = config.getConfig(BIDDER_CODE)?.endpoint;
  if (!customEndpoint) {
    return DEFAULT_ENDPOINT;
  }
  if (!ALLOWED_ENDPOINTS.has(customEndpoint)) {
    logWarn(`${BIDDER_CODE}: ignoring unapproved endpoint override "${customEndpoint}"`);
    return DEFAULT_ENDPOINT;
  }
  return customEndpoint;
};

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (request) => {
  if (!request.params || typeof request.params.placementId !== 'string') {
    return false;
  }

  return !!request.params.placementId;
};

const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  const ortbRequest = converter.toORTB({
    bidRequests: validBidRequests,
    bidderRequest,
  });

  return {
    url: resolveEndpoint(),
    method: 'POST',
    data: ortbRequest,
  };
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, bidderRequest) => {
  const response = converter.fromORTB({
    response: serverResponse.body,
    request: bidderRequest.data,
  });

  return response;
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  buildRequests,
  code: BIDDER_CODE,
  gvlid: AUDIENZZ_VENDOR_ID,
  interpretResponse,
  isBidRequestValid,
  supportedMediaTypes: [BANNER],
};

registerBidder(spec);
