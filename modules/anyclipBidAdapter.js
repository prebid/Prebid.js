import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {
  buildRequests,
  getUserSyncs,
  interpretResponse,
  isBidRequestValid
} from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'anyclip';
const ENDPOINT = 'https://prebid.anyclip.com';

export const spec = {
  code: BIDDER_CODE,
  aliases: ['anyclip'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT),
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
