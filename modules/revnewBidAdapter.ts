import { deepSetValue, generateUUID, logError } from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {AdapterRequest, BidderSpec, registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

import { interpretResponse, enrichImp, enrichRequest, getAmxId, getLocalStorageFunctionGenerator, getUserSyncs } from '../libraries/nexx360Utils/index.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBImp, ORTBRequest } from '../src/prebid.public.js';

const BIDDER_CODE = 'revnew';
const REQUEST_URL = 'https://fast.nexx360.io/revnew';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '1.0';
const GVLID = 1468;
const REVNEW_KEY = 'revnew_storage';

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Omit<T, Keys> & {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

type RevnewBidParams = RequireAtLeastOne<{
  tagId?: string;
  placement?: string;
  customId?: string;
}, "tagId" | "placement">;

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: RevnewBidParams;
  }
}

export const STORAGE = getStorageManager({
  bidderCode: BIDDER_CODE,
});

export const getRevnewLocalStorage = getLocalStorageFunctionGenerator<{ revnewId: string }>(
  STORAGE,
  BIDDER_CODE,
  REVNEW_KEY,
  'revnewId'
);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 120,
  },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    let imp:ORTBImp = buildImp(bidRequest, context);
    imp = enrichImp(imp, bidRequest);
    deepSetValue(imp, 'ext.revnew', bidRequest.params);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    let request:ORTBRequest = buildRequest(imps, bidderRequest, context);
    const amxId = getAmxId(STORAGE, BIDDER_CODE);
    request = enrichRequest(request, amxId, PAGE_VIEW_ID, BIDDER_VERSION);
    return request;
  },
});

const isBidRequestValid = (bid:BidRequest<typeof BIDDER_CODE>): boolean => {
  if (!bid.params.tagId && !bid.params.placement) {
    logError('bid.params.tagId or bid.params.placement must be defined');
    return false;
  }
  return true;
};

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
};

export const spec:BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
