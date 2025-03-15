import {BANNER, VIDEO} from '../src/mediaTypes.ts';
import {registerBidder} from '../src/adapters/bidderFactory.ts';
import {buildRequests, getUserSyncs, interpretResponse, isBidRequestValid} from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'driftpixel';
const ENDPOINT = 'https://pbjs.driftpixel.live';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['driftpixel'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT),
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
