import { deepSetValue, generateUUID } from '../src/utils.js';
import { getStorageManager, StorageManager } from '../src/storageManager.js';
import { AdapterRequest, AdapterResponse, BidderSpec, registerBidder, ServerResponse } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { createResponse, enrichImp, enrichRequest, getAmxId, getLocalStorageFunctionGenerator, getUserSyncs } from '../libraries/nexx360Utils/index.js';
import { ORTBRequest, ORTBResponse } from '../src/prebid.public.js';
import { BidResponse } from '../src/bidfactory.js';

const BIDDER_CODE = 'adgrid';
const REQUEST_URL = 'https://fast.nexx360.io/adgrid';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '2.0';
const ADGRID_KEY = 'adgrid';

type AdgridBidParams = {
  domainId?: string;
  placement?: string;
  allBids?: boolean;
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: AdgridBidParams;
  }
}

const ALIASES = [];

// Define the storage manager for the Adgrid bidder
export const STORAGE: StorageManager = getStorageManager({
  bidderCode: BIDDER_CODE,
});

export const getAdgridLocalStorage = getLocalStorageFunctionGenerator<{ adgridId: string }>(
  STORAGE,
  BIDDER_CODE,
  ADGRID_KEY,
  'adgridId'
);

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
    request = enrichRequest(request, amxId, PAGE_VIEW_ID, BIDDER_VERSION);
    return request;
  },
});

const isBidRequestValid = (bid:BidRequest<typeof BIDDER_CODE>): boolean => {
  if (!bid || !bid.params) return false;
  if (typeof bid.params.domainId !== 'number') return false;
  if (typeof bid.params.placement !== 'string') return false;
  return true;
}

const buildRequests = (
  bidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const data:ORTBRequest = converter.toORTB({bidRequests, bidderRequest})
  const adapterRequest:AdapterRequest = {
    method: 'POST',
    url: REQUEST_URL,
    data,
  }
  return adapterRequest;
}

const interpretResponse = (serverResponse: ServerResponse): AdapterResponse => {
  if (!serverResponse.body) return [];
  const respBody = serverResponse.body as ORTBResponse;
  if (!respBody.seatbid || respBody.seatbid.length === 0) return [];

  const responses: BidResponse[] = [];
  for (let i = 0; i < respBody.seatbid.length; i++) {
    const seatbid = respBody.seatbid[i];
    for (let j = 0; j < seatbid.bid.length; j++) {
      const bid = seatbid.bid[j];
      const response:BidResponse = createResponse(bid, respBody);
      responses.push(response);
    }
  }
  return responses;
}

export const spec:BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  aliases: ALIASES,
  supportedMediaTypes: [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
