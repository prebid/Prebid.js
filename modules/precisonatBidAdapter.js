import {logInfo} from '../src/utils.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import { NATIVE } from '../src/mediaTypes.js';
import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { buildUserSyncs } from '../libraries/precisoUtils/bidUtilsCommon.js';
import { getStorageManager } from '../src/storageManager.js';
import { pid, buildRequests, nativeResponse } from '../libraries/precisoUtils/bidUtils.js';

const BIDDER_CODE = 'precisonat';
export const storage = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER_CODE });
const SUPPORTED_MEDIA_TYPES = [NATIVE];
const GVLID = 874;
let precisonatId = 'NA';
let sharedId = 'NA';
const endpoint = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
let syncEndpoint = 'https://ck.2trk.info/rtb/user/usersync.aspx?';

// Codes defined by OpenRTB Native Ads 1.1 specification
// export const OPENRTB = {
//   NATIVE: {
//     IMAGE_TYPE: {
//       ICON: 1,
//       MAIN: 3,
//     },
//     ASSET_ID: {
//       TITLE: 1,
//       IMAGE: 3,
//       ICON: 2,
//       DATA: 4,
//       SPONSORED: 5,
//       CTA: 6
//     },
//     DATA_ASSET_TYPE: {
//       SPONSORED: 1,
//       DESC: 2,
//       CTA_TEXT: 12,
//     },
//   }
// };

export const spec = {
  code: BIDDER_CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    logInfo('TESTETSTETSTETSTETST');
    sharedId = storage.getDataFromLocalStorage('_sharedid') || storage.getCookie('_sharedid');
    let precisoBid = true;
    precisonatId = storage.getDataFromLocalStorage('_pre|id');
    if (Object.is(precisonatId, 'NA') || Object.is(precisonatId, null) || Object.is(precisonatId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        const puid = pid(sharedId);
        if (!Object.is(puid, null) && !Object.is(puid, undefined)) {
          storage.setDataInLocalStorage('_pre|id', puid);
        }
      }
    }
    return Boolean(bid.bidId && bid.params && bid.params.publisherId && precisoBid);
  },
  buildRequests: buildRequests(endpoint),
  interpretResponse: nativeResponse,
  getUserSyncs: (syncOptions, serverResponses, gdprConsent, uspConsent) => {
    const isSpec = syncOptions.spec;
    if (!Object.is(isSpec, true)) {
      let syncId = storage.getCookie('_sharedid');
      syncEndpoint = syncEndpoint + 'id=' + syncId;
    } else {
      syncEndpoint = syncEndpoint + 'id=NA';
    }
    return buildUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent, syncEndpoint);
  }
};

registerBidder(spec);
