import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

interface JJTechBidParams {
  /**
   * JJTech placement ID, assigned by JJTech during publisher onboarding.
   */
  placementId: string;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: JJTechBidParams;
  }
}

const BIDDER_CODE = 'jjtech';
const ENDPOINT_URL = 'https://prebid-server.jambojar.com/openrtb2/auction';
const DEFAULT_TTL = 300;
const DEFAULT_CURRENCY = 'USD';

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
    currency: DEFAULT_CURRENCY,
  },
});

const isBidRequestValid: BidderSpec<typeof BIDDER_CODE>['isBidRequestValid'] = (bid) => {
  return false;
};

const buildRequests: BidderSpec<typeof BIDDER_CODE>['buildRequests'] = (validBidRequests, bidderRequest) => {
  const data = converter.toORTB({ bidRequests: validBidRequests, bidderRequest });
  return {
    method: 'POST',
    url: ENDPOINT_URL,
    data,
  };
};

const interpretResponse: BidderSpec<typeof BIDDER_CODE>['interpretResponse'] = (serverResponse, request) => {
  return converter.fromORTB({ response: serverResponse.body, request: request.data });
};

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs: () => [],
};

registerBidder(spec);
