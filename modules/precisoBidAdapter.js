import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE } from '../src/mediaTypes.js';
import { getStorageManager } from '../src/storageManager.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { buildBidResponse, buildRequests, onBidWon } from '../libraries/precisoUtils/bidUtils.js';
import { buildUserSyncs } from '../libraries/precisoUtils/bidUtilsCommon.js';

const BIDDER__CODE = 'preciso';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER__CODE });
const SUPPORTED_MEDIA_TYPES = [BANNER, NATIVE];
const GVLID = 874;
let sharedId = 'NA';

const endpoint = 'https://ssp-bidder.2trk.info/bid_request/openrtb';
let syncEndpoint = 'https://ck.2trk.info/rtb/user/usersync.aspx?';

export const spec = {
  code: BIDDER__CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    return Boolean(bid.bidId && bid.params && bid.params.publisherId);
  },
  buildRequests: buildRequests(endpoint),
  interpretResponse: buildBidResponse,
  onBidWon,
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    syncEndpoint = syncEndpoint + 'id=' + sharedId;
    return buildUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, syncEndpoint);
  }
};

registerBidder(spec);
