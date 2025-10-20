import { deepSetValue, generateUUID, logError, logInfo } from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {getGlobal} from '../src/prebidGlobal.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

import { createResponse, enrichImp, enrichRequest, getAmxId, getUserSyncs } from '../libraries/nexx360Utils/index.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'nexx360';
const REQUEST_URL = 'https://fast.nexx360.io/booster';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '6.3';
const GVLID = 965;
const NEXXID_KEY = 'nexx360_storage';

const ALIASES = [
  { code: 'revenuemaker' },
  { code: 'first-id', gvlid: 1178 },
  { code: 'adwebone' },
  { code: 'league-m', gvlid: 965 },
  { code: 'prjads' },
  { code: 'pubtech' },
  { code: '1accord', gvlid: 965 },
  { code: 'easybid', gvlid: 1068 },
  { code: 'prismassp', gvlid: 965 },
  { code: 'spm', gvlid: 965 },
  { code: 'bidstailamedia', gvlid: 965 },
  { code: 'scoremedia', gvlid: 965 },
  { code: 'movingup', gvlid: 1416 },
  { code: 'glomexbidder', gvlid: 967 },
  { code: 'revnew', gvlid: 1468 },
  { code: 'pubxai', gvlid: 1485 },
];

export const STORAGE = getStorageManager({
  bidderCode: BIDDER_CODE,
});

/**
 * Get the NexxId
 * @param
 * @return {object | false } false if localstorageNotEnabled
 */

export function getNexx360LocalStorage() {
  if (!STORAGE.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for Nexx360`);
    return false;
  }
  const output = STORAGE.getDataFromLocalStorage(NEXXID_KEY);
  if (output === null) {
    const nexx360Storage = { nexx360Id: generateUUID() };
    STORAGE.setDataInLocalStorage(NEXXID_KEY, JSON.stringify(nexx360Storage));
    return nexx360Storage;
  }
  try {
    return JSON.parse(output)
  } catch (e) {
    return false;
  }
}

const converter = ortbConverter({
  context: {
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 90, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest, context) {
    let imp = buildImp(bidRequest, context);
    imp = enrichImp(imp, bidRequest);
    const divId = bidRequest.params.divId || bidRequest.adUnitCode;
    const slotEl = document.getElementById(divId);
    if (slotEl) {
      const { width, height } = getBoundingClientRect(slotEl);
      deepSetValue(imp, 'ext.dimensions.slotW', width);
      deepSetValue(imp, 'ext.dimensions.slotH', height);
      deepSetValue(imp, 'ext.dimensions.cssMaxW', slotEl.style?.maxWidth);
      deepSetValue(imp, 'ext.dimensions.cssMaxH', slotEl.style?.maxHeight);
    }
    if (bidRequest.params.tagId) deepSetValue(imp, 'ext.nexx360.tagId', bidRequest.params.tagId);
    if (bidRequest.params.placement) deepSetValue(imp, 'ext.nexx360.placement', bidRequest.params.placement);
    if (bidRequest.params.videoTagId) deepSetValue(imp, 'ext.nexx360.videoTagId', bidRequest.params.videoTagId);
    if (bidRequest.params.adUnitPath) deepSetValue(imp, 'ext.adUnitPath', bidRequest.params.adUnitPath);
    if (bidRequest.params.adUnitName) deepSetValue(imp, 'ext.adUnitName', bidRequest.params.adUnitName);
    if (bidRequest.params.allBids) deepSetValue(imp, 'ext.nexx360.allBids', bidRequest.params.allBids);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    let request = buildRequest(imps, bidderRequest, context);
    const amxId = getAmxId(STORAGE, BIDDER_CODE);
    request = enrichRequest(request, amxId, bidderRequest, PAGE_VIEW_ID, BIDDER_VERSION);
    return request;
  },
});

/**
 * Determines whether or not the given bid request is valid.
 *
 * @param {BidRequest} bid The bid params to validate.
 * @return boolean True if this is a valid bid, and false otherwise.
 */
function isBidRequestValid(bid) {
  if (bid.params.adUnitName && (typeof bid.params.adUnitName !== 'string' || bid.params.adUnitName === '')) {
    logError('bid.params.adUnitName needs to be a string');
    return false;
  }
  if (bid.params.adUnitPath && (typeof bid.params.adUnitPath !== 'string' || bid.params.adUnitPath === '')) {
    logError('bid.params.adUnitPath needs to be a string');
    return false;
  }
  if (bid.params.divId && (typeof bid.params.divId !== 'string' || bid.params.divId === '')) {
    logError('bid.params.divId needs to be a string');
    return false;
  }
  if (bid.params.allBids && typeof bid.params.allBids !== 'boolean') {
    logError('bid.params.allBids needs to be a boolean');
    return false;
  }
  if (!bid.params.tagId && !bid.params.videoTagId && !bid.params.nativeTagId && !bid.params.placement) {
    logError('bid.params.tagId or bid.params.videoTagId or bid.params.nativeTagId or bid.params.placement must be defined');
    return false;
  }
  return true;
};

/**
 * Make a server request from the list of BidRequests.
 *
 * @return ServerRequest Info describing the request to the server.
 */

function buildRequests(bidRequests, bidderRequest) {
  const data = converter.toORTB({bidRequests, bidderRequest})
  return {
    method: 'POST',
    url: REQUEST_URL,
    data,
  }
}

/**
 * Unpack the response from the server into a list of bids.
 *
 * @param {ServerResponse} serverResponse A successful response from the server.
 * @return {Bid[]} An array of bids which were nested inside the server.
 */

function interpretResponse(serverResponse) {
  const respBody = serverResponse.body;
  if (!respBody || !Array.isArray(respBody.seatbid)) {
    return [];
  }

  const { bidderSettings } = getGlobal();
  const allowAlternateBidderCodes = bidderSettings && bidderSettings.standard ? bidderSettings.standard.allowAlternateBidderCodes : false;

  const responses = [];
  for (let i = 0; i < respBody.seatbid.length; i++) {
    const seatbid = respBody.seatbid[i];
    for (let j = 0; j < seatbid.bid.length; j++) {
      const bid = seatbid.bid[j];
      const response = createResponse(bid, respBody);
      if (allowAlternateBidderCodes) response.bidderCode = `n360_${bid.ext.ssp}`;
      responses.push(response);
    }
  }
  return responses;
}

export const spec = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
