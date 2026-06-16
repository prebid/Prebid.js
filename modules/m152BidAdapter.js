import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  interpretResponse,
  buildRequestsBase,
  getUserSyncs
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'm152';
const AD_URL = 'https://#{REGION}#.152media-ssp.com/pbjs';
const GVLID = 1111;
const SYNC_URL = 'https://cs.152media-ssp.com';

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest });
  const region = validBidRequests[0].params?.region;

  const regionMap = {
    eu: 'eu',
    'us-east': 'east'
  };

  request.url = AD_URL.replace('#{REGION}#', regionMap[region]);

  return request;
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests,
  interpretResponse,
  getUserSyncs: getUserSyncs(SYNC_URL)
};

registerBidder(spec);
