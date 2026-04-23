import { deepSetValue, generateUUID, logError } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { AdapterRequest, BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'

import { interpretResponse, enrichImp, enrichRequest, getGzipSetting, getLocalStorageFunctionGenerator, getUserSyncs } from '../libraries/nexx360Utils/index.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBImp, ORTBRequest } from '../src/prebid.public.js';

const BIDDER_CODE = 'mtc';
const REQUEST_URL = 'https://fast.nexx360.io/mtc';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '1.0';
const MTC_KEY = 'mtc_storage';

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Omit<T, Keys> & {
    [K in Keys]-?: Required<Pick<T, K>> &
      Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

type MtcBidParams = RequireAtLeastOne<{
  tagId?: string;
  placement?: string;
  customId?: string;
}, "tagId" | "placement">;

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: MtcBidParams;
  }
}

export const STORAGE = getStorageManager({
  bidderCode: BIDDER_CODE,
});

export const getMtcLocalStorage = getLocalStorageFunctionGenerator<{ mtcId: string }>(
  STORAGE,
  BIDDER_CODE,
  MTC_KEY,
  'mtcId'
);

const converter = ortbConverter({
  context: {
    netRevenue: true,
    ttl: 120,
  },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    let imp:ORTBImp = buildImp(bidRequest, context);
    imp = enrichImp(imp, bidRequest);
    deepSetValue(imp, 'ext.mtc', bidRequest.params);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    let request:ORTBRequest = buildRequest(imps, bidderRequest, context);
    request = enrichRequest(request, null, PAGE_VIEW_ID, BIDDER_VERSION);
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
  const data:ORTBRequest = converter.toORTB({ bidRequests, bidderRequest })
  const adapterRequest:AdapterRequest = {
    method: 'POST',
    url: REQUEST_URL,
    data,
    options: {
      endpointCompression: getGzipSetting(BIDDER_CODE, true),
    },
  }
  return adapterRequest;
};

export const spec:BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
