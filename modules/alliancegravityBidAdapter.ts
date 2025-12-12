import { deepSetValue, generateUUID } from '../src/utils.js';
import {getStorageManager} from '../src/storageManager.js';
import {AdapterRequest, BidderSpec, registerBidder} from '../src/adapters/bidderFactory.js';
import {BANNER, NATIVE, VIDEO} from '../src/mediaTypes.js';
import {ortbConverter} from '../libraries/ortbConverter/converter.js'

import { interpretResponse, enrichImp, enrichRequest, getAmxId, getUserSyncs } from '../libraries/alliancegravityUtils/index.js';
import { getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { BidRequest, ClientBidderRequest } from '../src/adapterManager.js';
import { ORTBImp, ORTBRequest } from '../src/prebid.public.js';
import { config } from '../src/config.js';

const BIDDER_CODE = 'alliance_gravity';
const BIDDER_VERSION = '1.0';
const REQUEST_URL = 'https://pbs.production.agrvt.com/openrtb2/auction';
const PAGE_VIEW_ID = generateUUID();
const GVLID = 501;

const DEFAULT_GZIP_ENABLED = false;

declare module '../src/adUnits' {
  interface BidderParams {
    srid: string
  }
}

export const STORAGE = getStorageManager({
  bidderCode: BIDDER_CODE,
});

export const getGzipSetting = (): boolean => {
  const getBidderConfig = config.getBidderConfig();
  if (getBidderConfig.nexx360?.gzipEnabled === 'true') {
    return getBidderConfig.nexx360?.gzipEnabled === 'true';
  }
  return DEFAULT_GZIP_ENABLED;
}

const converter = ortbConverter({
  context: {
    netRevenue: true, // or false if your adapter should set bidResponse.netRevenue = false
    ttl: 90, // default bidResponse.ttl (when not specified in ORTB response.seatbid[].bid[].exp)
  },
  imp(buildImp, bidRequest: BidRequest<typeof BIDDER_CODE>, context) {
    let imp:ORTBImp = buildImp(bidRequest, context);
    imp = enrichImp(imp, bidRequest);
    const divId = bidRequest.params.divId || bidRequest.adUnitCode;
    const slotEl:HTMLElement | null = typeof divId === 'string' ? document.getElementById(divId) : null;
    if (slotEl) {
      const { width, height } = getBoundingClientRect(slotEl);
      deepSetValue(imp, 'ext.dimensions.slotW', width);
      deepSetValue(imp, 'ext.dimensions.slotH', height);
      deepSetValue(imp, 'ext.dimensions.cssMaxW', slotEl.style?.maxWidth);
      deepSetValue(imp, 'ext.dimensions.cssMaxH', slotEl.style?.maxHeight);
    }
    deepSetValue(imp, 'ext.prebid.storedrequest.id', bidRequest.params.srid);
    if (bidRequest.params.adUnitPath) deepSetValue(imp, 'ext.adUnitPath', bidRequest.params.adUnitPath);
    if (bidRequest.params.adUnitName) deepSetValue(imp, 'ext.adUnitName', bidRequest.params.adUnitName);
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
  if (!bid.params.srid || typeof bid.params.srid !== 'string') {
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
    options: {
      endpointCompression: getGzipSetting()
    },
  }
  return adapterRequest;
}

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
