import { logInfo } from '../src/utils.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER } from '../src/mediaTypes.js';
// import { config } from '../src/config.js';
import { getStorageManager } from '../src/storageManager.js';

import { MODULE_TYPE_UID } from '../src/activities/modules.js';
import { getUserSyncs, buildRequests, interpretResponse, onBidWon, readFromAllStorages } from '../libraries/precisoUtils/bidderOperations.js';

const BIDDER__CODE = 'preciso';
const COOKIE_NAME = '_sharedid';
// const AD_URL = 'https://ssp-bidder.mndtrk.com/bid_request/openrtb';
// const AD_URL = 'http://localhost:80/bid_request/openrtb';
// const URL_SYNC = 'https://ck.2trk.info/rtb/user/usersync.aspx?';
const SUPPORTED_MEDIA_TYPES = [BANNER];
const GVLID = 874;
let precisoId = 'NA';
let sharedId = 'NA'

export const storage2 = getStorageManager({ moduleType: MODULE_TYPE_UID, moduleName: BIDDER__CODE });

export const spec = {
  code: BIDDER__CODE,
  supportedMediaTypes: SUPPORTED_MEDIA_TYPES,
  gvlid: GVLID,

  isBidRequestValid: (bid) => {
    sharedId = readFromAllStorages(COOKIE_NAME);
    let precisoBid = true;
    const preCall = 'https://ssp-usersync.mndtrk.com/getUUID?sharedId=' + sharedId;
    precisoId = window.localStorage.getItem('_pre|id');

    if (Object.is(precisoId, 'NA') || Object.is(precisoId, null) || Object.is(precisoId, undefined)) {
      if (!bid.precisoBid) {
        precisoBid = false;
        getapi(preCall);
      }
    }

    return Boolean(bid.bidId && bid.params && bid.params.publisherId && precisoBid);
  },

  buildRequests,

  interpretResponse,

  onBidWon,

  getUserSyncs

};

async function getapi(url) {
  try {
    // Storing response
    const response = await fetch(url);

    // Storing data in form of JSON
    var data = await response.json();

    const dataMap = new Map(Object.entries(data));

    const uuidValue = dataMap.get('UUID');

    if (!Object.is(uuidValue, null) && !Object.is(uuidValue, undefined)) {
      storage2.setDataInLocalStorage('_pre|id', uuidValue);
      logInfo('DEBUG nonNull uuidValue:' + uuidValue);
    }

    return data;
  } catch (error) {
    logInfo('Error in preciso precall' + error);
  }
}

registerBidder(spec);
