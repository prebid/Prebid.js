import { deepSetValue, generateUUID, logError } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { AdapterRequest, BidderSpec, registerBidder } from '../src/adapters/bidderFactory.js';
import { BANNER, NATIVE, VIDEO } from '../src/mediaTypes.js';
import { ortbConverter } from '../libraries/ortbConverter/converter.js'

import { interpretResponse, enrichImp, enrichRequest, getAmxId, getLocalStorageFunctionGenerator, getUserSyncs } from '../libraries/nexx360Utils/index.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBImp, ORTBRequest } from '../src/prebid.public.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'insurads';
const REQUEST_URL = 'https://fast.nexx360.io/booster';
const PAGE_VIEW_ID = generateUUID();
const BIDDER_VERSION = '7.1';
const GVLID = 596;
const ALT_KEY = 'nexx360_storage';

const DEFAULT_GZIP_ENABLED = false;

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Omit<T, Keys> & {
    [K in Keys]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

type InsurAdsBidParams = RequireAtLeastOne<{
  tagId?: string;
  placement?: string;
  videoTagId?: string;
  nativeTagId?: string;
  adUnitPath?: string;
  adUnitName?: string;
  divId?: string;
  allBids?: boolean;
  customId?: string;
  bidders?: Record<string, unknown>;
}, "tagId" | "placement">;

declare module '../src/adUnits' {
  interface BidderParams {
    ['nexx360']: InsurAdsBidParams;
  }
}

export const STORAGE = getStorageManager({
  bidderCode: BIDDER_CODE,
});

export const getInsurAdsLocalStorage = getLocalStorageFunctionGenerator<{ nexx360Id: string }>(
  STORAGE,
  BIDDER_CODE,
  ALT_KEY,
  'nexx360Id'
);

export const getGzipSetting = (): boolean => {
  const bidderConfig = config.getBidderConfig();
  const gzipEnabled = bidderConfig.insurads?.gzipEnabled;

  if (gzipEnabled === true || gzipEnabled === 'true') {
    return true;
  }
  return DEFAULT_GZIP_ENABLED;
}

const converter = ortbConverter({
  context: {
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 90, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    let imp: ORTBImp = buildImp(bidRequest, context);
    imp = enrichImp(imp, bidRequest);
    const divId = bidRequest.params.divId || bidRequest.adUnitCode;
    const slotEl: HTMLElement | null = typeof divId === 'string' ? document.getElementById(divId) : null;
    if (slotEl) {
      const { width, height } = getBoundingClientRect(slotEl);
      deepSetValue(imp, 'ext.dimensions.slotW', width);
      deepSetValue(imp, 'ext.dimensions.slotH', height);
      deepSetValue(imp, 'ext.dimensions.cssMaxW', slotEl.style?.maxWidth);
      deepSetValue(imp, 'ext.dimensions.cssMaxH', slotEl.style?.maxHeight);
    }
    deepSetValue(imp, 'ext.nexx360', bidRequest.params);
    deepSetValue(imp, 'ext.nexx360.divId', divId);
    if (bidRequest.params.adUnitPath) deepSetValue(imp, 'ext.adUnitPath', bidRequest.params.adUnitPath);
    if (bidRequest.params.adUnitName) deepSetValue(imp, 'ext.adUnitName', bidRequest.params.adUnitName);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    let request: ORTBRequest = buildRequest(imps, bidderRequest, context);
    const amxId = getAmxId(STORAGE, BIDDER_CODE);
    request = enrichRequest(request, amxId, PAGE_VIEW_ID, BIDDER_VERSION);
    return request;
  },
});

const isBidRequestValid = (bid: BidRequest<typeof BIDDER_CODE>): boolean => {
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

const buildRequests = (
  bidRequests: BidRequest<typeof BIDDER_CODE>[],
  bidderRequest: ClientBidderRequest<typeof BIDDER_CODE>,
): AdapterRequest => {
  const data: ORTBRequest = converter.toORTB({ bidRequests, bidderRequest })
  const adapterRequest: AdapterRequest = {
    method: 'POST',
    url: REQUEST_URL,
    data,
    options: {
      endpointCompression: getGzipSetting()
    },
  }
  return adapterRequest;
}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER, VIDEO, NATIVE],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
};

registerBidder(spec);
