import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, VIDEO} from '../src/mediaTypes.js';
import {getStorageManager} from '../src/storageManager.js';
import {
  createBuildRequestsFn,
  createInterpretResponseFn,
  createUserSyncGetter,
  isBidRequestValid,
  tryParseJSON
} from '../libraries/vidazooUtils/bidderUtils.js';

const GVLID = 1165;
const DEFAULT_SUB_DOMAIN = 'exchange';
const BIDDER_CODE = 'kueezrtb';
const BIDDER_VERSION = '1.0.0';
export const storage = getStorageManager({bidderCode: BIDDER_CODE});

export const spec = {
  code: BIDDER_CODE,
  version: BIDDER_VERSION,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests: createBuildRequestsFn(createDomain, createUniqueRequestData, storage, BIDDER_CODE, BIDDER_VERSION, false),
  interpretResponse: createInterpretResponseFn(BIDDER_CODE, false),
  getUserSyncs: createUserSyncGetter({
    iframeSyncUrl: 'https://sync.kueezrtb.com/api/sync/iframe',
    imageSyncUrl: 'https://sync.kueezrtb.com/api/sync/image'
  }),
  createFirstPartyData,
};

export function createDomain(subDomain = DEFAULT_SUB_DOMAIN) {
  return `https://${subDomain}.kueezrtb.com`;
}

export function getAndSetFirstPartyData() {
  if (!storage.hasLocalStorage()) {
    return;
  }
  let fdata = tryParseJSON(storage.getDataFromLocalStorage('_iiq_fdata'));
  if (!fdata) {
    fdata = spec.createFirstPartyData();
    storage.setDataInLocalStorage('_iiq_fdata', JSON.stringify(fdata));
  }
  return fdata;
}

export function createFirstPartyData() {
  return {
    pcid: getFirstPartyUUID(), pcidDate: Date.now(),
  };
}

function getFirstPartyUUID() {
  let d = new Date().getTime();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

function createUniqueRequestData(hashUrl, bid) {
  const {auctionId, transactionId} = bid;
  const fdata = getAndSetFirstPartyData();
  return {
    auctionId,
    transactionId,
    ...(fdata && {
      iiqpcid: fdata.pcid,
      iiqpcidDate: fdata.pcidDate
    })
  };
}

registerBidder(spec);
