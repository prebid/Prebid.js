import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { config } from '../src/config.js';
import { BANNER } from '../src/mediaTypes.js';
import { getParameterByName, logWarn } from '../src/utils.js';

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
  /**
   * Renders the ad unit in the dark theme.
   */
  forceDarkTheme?: boolean;
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  processors: pbsExtensions,
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    if (getParameterByName('yaleo_test').toUpperCase() === 'TRUE') {
      request.test = 1;
    }
    return request;
  },
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

const getOptionalParamWarnings = ({ memberId, maxCpm, forceDarkTheme }: YaleoBidParams): string[] => {
  const warnings: string[] = [];
  if (memberId !== undefined && !(Number.isInteger(memberId) && memberId >= 1)) {
    warnings.push(`memberId must be a positive integer, got "${memberId}"`);
  }
  if (maxCpm !== undefined && !(Number.isFinite(maxCpm) && maxCpm >= 0)) {
    warnings.push(`maxCpm must be a number greater than or equal to 0, got "${maxCpm}"`);
  }
  if (forceDarkTheme !== undefined && typeof forceDarkTheme !== 'boolean') {
    warnings.push(`forceDarkTheme must be a boolean, got "${forceDarkTheme}"`);
  }
  return warnings;
};

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (request) => {
  const { params } = request;
  if (typeof params?.placementId !== 'string' || !UUID_PATTERN.test(params.placementId.trim())) {
    logWarn(`${BIDDER_CODE}: placementId must be a UUID, got "${params?.placementId}"`);
    return false;
  }

  // Only warn: rejecting would drop bids the endpoint accepts, e.g. with memberId '3927'.
  getOptionalParamWarnings(params).forEach((warning) => logWarn(`${BIDDER_CODE}: ${warning}`));

  return true;
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
