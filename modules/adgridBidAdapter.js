import { deepSetValue, generateUUID, logInfo } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { createResponse, enrichImp, enrichRequest, getAmxId, getUserSyncs } from '../libraries/nexx360Utils/index.js';

/**
 * @typedef {import('../src/adapters/bidderFactory.js').BidRequest} BidRequest
 * @typedef {import('../src/adapters/bidderFactory.js').Bid} Bid
 * @typedef {import('../src/adapters/bidderFactory.js').ServerResponse} ServerResponse
 * @typedef {import('../src/adapters/bidderFactory.js').SyncOptions} SyncOptions
 * @typedef {import('../src/adapters/bidderFactory.js').UserSync} UserSync
 * @typedef {import('../src/adapters/bidderFactory.js').validBidRequests} validBidRequests
 */

const BIDDER_CODE = 'adgrid';
const REQUEST_URL = 'https://fast.nexx360.io/adgrid';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '2.0';
const ADGRID_KEY = 'adgrid';

const ALIASES = [];

// Define the storage manager for the Adgrid bidder
export const STORAGE = getStorageManager({
  bidderCode: BIDDER_CODE,
});

/**
 * Get the agdridId from local storage
 * @return {object | false } false if localstorageNotEnabled
 */
export function getLocalStorage() {
  if (!STORAGE.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for Adgrid`);
    return false;
  }
  const output = STORAGE.getDataFromLocalStorage(ADGRID_KEY);
  if (output === null) {
    const adgridStorage = { adgridId: generateUUID() };
    STORAGE.setDataInLocalStorage(ADGRID_KEY, JSON.stringify(adgridStorage));
    return adgridStorage;
  }
  try {
    return JSON.parse(output);
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
    if (bidRequest.params.domainId) deepSetValue(imp, 'ext.adgrid.domainId', bidRequest.params.domainId);
    if (bidRequest.params.placement) deepSetValue(imp, 'ext.adgrid.placement', bidRequest.params.placement);
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
  if (!bid || !bid.params) return false;
  if (typeof bid.params.domainId !== 'number') return false;
  if (typeof bid.params.placement !== 'string') return false;
  return true;
}

/**
 * Make a server request from the list of BidRequests.
 *
 * @return ServerRequest Info describing the request to the server.
 */
function buildRequests(bidRequests, bidderRequest) {
  const data = converter.toORTB({ bidRequests, bidderRequest })
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

  const responses = [];
  for (let i = 0; i < respBody.seatbid.length; i++) {
    const seatbid = respBody.seatbid[i];
    for (let j = 0; j < seatbid.bid.length; j++) {
      const bid = seatbid.bid[j];
      const response = createResponse(bid, respBody);
      responses.push(response);
    }
  }
  return responses;
}

export const spec = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
