import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { buildRequests, getUserSyncs, interpretResponse, isBidRequestValid } from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'xe';
const GVLID = 1383;
const ENDPOINT = 'https://pbjs.xe.works/bid';

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: [{ code: 'xeworks', gvlid: GVLID }, 'lunamediax'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT),
  interpretResponse,
  getUserSyncs
};

registerBidder(spec);
