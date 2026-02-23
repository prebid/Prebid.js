import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { pbsExtensions } from '../libraries/pbsExtensions/pbsExtensions.js';
import { BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';

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

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: YaleoBidParams;
  }
}

const BIDDER_CODE = 'yaleo';
const AUDIENZZ_VENDOR_ID = 783;
const PREBID_URL = 'https://bidder.yaleo.com/prebid';
const DEFAULT_TTL = 300;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: DEFAULT_TTL,
  },
  processors: pbsExtensions,
});

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
    url: PREBID_URL,
    method: 'POST',
    data: ortbRequest,
  };
}

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
