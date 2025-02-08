import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {
  buildRequests,
  getUserSyncs,
  interpretResponse,
} from '../libraries/xeUtils/bidderUtils.js';
import {deepAccess, getBidIdParameter, isArray, logError} from '../src/utils.js';

const BIDDER_CODE = 'anyclip';
const ENDPOINT = 'https://prebid.anyclip.com';

function isBidRequestValid(bid) {
  if (bid && typeof bid.params !== 'object') {
    logError('Params is not defined or is incorrect in the bidder settings');
    return false;
  }

  if (!getBidIdParameter('publisherId', bid.params) || !getBidIdParameter('supplyTagId', bid.params)) {
    logError('PublisherId or supplyTagId is not present in bidder params');
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
  aliases: ['anyclip'],
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: (validBidRequests, bidderRequest) => {
    const builtRequests = buildRequests(validBidRequests, bidderRequest, ENDPOINT)
    const requests = JSON.parse(builtRequests.data)
    const updatedRequests = requests.map(req => ({
      ...req,
      env: {
        publisherId: validBidRequests[0].params.publisherId,
        supplyTagId: validBidRequests[0].params.supplyTagId,
        floor: req.floor
      },
    }))
    return {...builtRequests, data: JSON.stringify(updatedRequests)}
  },
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
