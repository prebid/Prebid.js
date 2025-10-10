import { deepSetValue, generateUUID } from '../src/utils.js';
import { getStorageManager, StorageManager } from '../src/storageManager.js';
import { AdapterRequest, BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { interpretResponse, enrichImp, enrichRequest, getAmxId, getLocalStorageFunctionGenerator, getUserSyncs } from '../libraries/nexx360Utils/index.js';
import { ORTBRequest } from '../src/prebid.public.js';

const BIDDER_CODE = 'adgrid';
const REQUEST_URL = 'https://fast.nexx360.io/adgrid';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '2.0';
const ADGRID_KEY = 'adgrid';

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Omit<T, Keys> & {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

type AdgridBidParams = RequireAtLeastOne<{
  domainId?: string;
  placement?: string;
  allBids?: boolean;
  customId?: string;
}, "domainId" | "placement">;

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
    const params = bidRequest.params as AdgridBidParams;
    if (params.domainId) deepSetValue(imp, 'ext.adgrid.domainId', params.domainId);
    if (params.placement) deepSetValue(imp, 'ext.adgrid.placement', params.placement);
    if (params.allBids) deepSetValue(imp, 'ext.adgrid.allBids', params.allBids);
    if (params.customId) deepSetValue(imp, 'ext.adgrid.customId', params.customId);
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
