import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { isBidRequestValid, buildRequestsBase, interpretResponse } from '../libraries/teqblazeUtils/bidderUtils.js';
import { getUserSyncs } from '../libraries/mgidUtils/mgidUtils.js'

const BIDDER_CODE = 'mgidX';
const GVLID = 358;
const AD_URL = 'https://#{REGION}#.mgid.com/pbjs';

const buildRequests = (validBidRequests = [], bidderRequest = {}) => {
  const request = buildRequestsBase({ adUrl: AD_URL, validBidRequests, bidderRequest });
  const region = validBidRequests[0].params?.region;

  if (region === 'eu') {
    request.url = AD_URL.replace('#{REGION}#', 'eu-x');
  } else {
    request.url = AD_URL.replace('#{REGION}#', 'us-east-x');
  }

  return request;
};

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],

  isBidRequestValid: isBidRequestValid(),
  buildRequests,
  interpretResponse,

  getUserSyncs: getUserSyncs,
};

registerBidder(spec);
