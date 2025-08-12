import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {buildRequests, getUserSyncs, interpretResponse} from '../libraries/xeUtils/bidderUtils.js';
import {deepAccess, getBidIdParameter, isArray, logError} from '../src/utils.js';

const BIDDER_CODE = 'adipolo';
const ENDPOINT = 'https://prebid.adipolo.live';
const GVL_ID = 1456;

function isBidRequestValid(bid) {
  if (bid && typeof bid.params !== 'object') {
    logError('Params is not defined or is incorrect in the bidder settings');
    return false;
  }

  if (!getBidIdParameter('pid', bid.params)) {
    logError('Pid is not present in bidder params');
    return false;
  }

  if (deepAccess(bid, 'mediaTypes.video') && !isArray(deepAccess(bid, 'mediaTypes.video.playerSize'))) {
    logError('mediaTypes.video.playerSize is required for video');
    return false;
  }

  return true;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) => buildRequests(validBidRequests, bidderRequest, ENDPOINT),
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
