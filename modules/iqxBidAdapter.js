import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {buildRequests, getUserSyncs, interpretResponse, isBidRequestValid} from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'iqx';
const ENDPOINT = 'https://pbjs.iqzonertb.live';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['iqx'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT),
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
