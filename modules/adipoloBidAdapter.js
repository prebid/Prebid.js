import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {buildRequests, getUserSyncs, interpretResponse, isBidRequestValid} from '../libraries/xeUtils/bidderUtils.js';

const BIDDER_CODE = 'adipolo';
const GVL_ID = 1456;

function getSubdomain() {
  const regionMap = {
    'Europe': 'prebid-eu',
    'America': 'prebid'
  };

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const region = timezone.split('/')[0];
    return regionMap[region] || regionMap.America;
  } catch (err) {
    return regionMap.America;
  }
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVL_ID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid: bid => isBidRequestValid(bid, ['pid']),
  buildRequests: (validBidRequests, bidderRequest) => {
    const endpoint = `https://${getSubdomain()}.adipolo.live`;
    return buildRequests(validBidRequests, bidderRequest, endpoint)
  },
  interpretResponse,
  getUserSyncs
}

registerBidder(spec);
