import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import {
  isBidRequestValid,
  interpretResponse,
  buildRequestsBase,
  getUserSyncs
} from '../libraries/teqblazeUtils/bidderUtils.js';

const BIDDER_CODE = 'appStockSSP';
const AD_URL = 'https://#{REGION}#.al-ad.com/pbjs';
const GVLID = 1223;
const SYNC_URL = 'https://csync.al-ad.com';

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest });
  const region = validBidRequests[0].params?.region;

  const regionMap = {
    eu: 'ortb-eu',
    'us-east': 'lb',
    apac: 'ortb-apac'
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
