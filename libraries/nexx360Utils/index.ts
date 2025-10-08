import { deepAccess, deepSetValue, generateUUID, logInfo } from '../../src/utils.js';
import {Renderer} from '../../src/Renderer.js';
import { getCurrencyFromBidderRequest } from '../ortb2Utils/currency.js';
import { INSTREAM, OUTSTREAM } from '../../src/video.js';
import { BANNER, MediaType, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { BidResponse } from '../../src/bidfactory.js';
import { StorageManager } from '../../src/storageManager.js';
import { ORTBRequest } from '../../src/prebid.public.js';

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

let sessionId:string | null = null;

const getSessionId = ():string => {
  if (!sessionId) {
    sessionId = generateUUID();
  }
  return sessionId;
}

let lastPageUrl:string = '';
let requestCounter:number = 0;

const getRequestCount = ():number => {
  if (lastPageUrl === window.location.pathname) {
    return ++requestCounter;
  }
  lastPageUrl = window.location.pathname;
  return 0;
}

export const getLocalStorageFunctionGenerator = <
  T extends Record<string, string>
>(
    storage: StorageManager,
    bidderCode: string,
    storageKey: string,
    jsonKey: keyof T
  ): (() => T | null) => {
  return () => {
    if (!storage.localStorageIsEnabled()) {
      logInfo(`localstorage not enabled for ${bidderCode}`);
      return null;
    }

    const output = storage.getDataFromLocalStorage(storageKey);
    if (output === null) {
      const storageElement: T = { [jsonKey]: generateUUID() } as T;
      storage.setDataInLocalStorage(storageKey, JSON.stringify(storageElement));
      return storageElement;
    }
    try {
      return JSON.parse(output) as T;
    } catch (e) {
      logInfo(`failed to parse localstorage for ${bidderCode}:`, e);
      return null;
    }
  };
};

export function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  if (typeof serverResponses === 'object' &&
  serverResponses != null &&
  serverResponses.length > 0 &&
  serverResponses[0].hasOwnProperty('body') &&
  serverResponses[0].body.hasOwnProperty('ext') &&
  serverResponses[0].body.ext.hasOwnProperty('cookies') &&
  typeof serverResponses[0].body.ext.cookies === 'object') {
    return serverResponses[0].body.ext.cookies.slice(0, 5);
  } else {
    return [];
  }
};

const outstreamRender = (response: BidResponse): void => {
  (response as any).renderer.push(() => {
    (window as any).ANOutstreamVideo.renderAd({
      sizes: [(response as any).width, (response as any).height],
      targetId: (response as any).divId,
      adResponse: (response as any).vastXml,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
        content: (response as any).vastXml
      }
    });
  });
};

export function createRenderer(bid, url) {
  const renderer = Renderer.install({
    id: bid.id,
    url: url,
    loaded: false,
    adUnitCode: bid.ext.adUnitCode,
    targetId: bid.ext.divId,
  });
  renderer.setRender(outstreamRender);
  return renderer;
};

export function enrichImp(imp, bidRequest) {
  deepSetValue(imp, 'tagid', bidRequest.adUnitCode);
  deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
  const divId = bidRequest.params.divId || bidRequest.adUnitCode;
  deepSetValue(imp, 'ext.divId', divId);
  if (imp.video) {
    const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    deepSetValue(imp, 'video.ext.playerSize', playerSize);
    deepSetValue(imp, 'video.ext.context', videoContext);
  }
  return imp;
}

export const enrichRequest = (
  request: ORTBRequest,
  amxId: string | null,
  pageViewId: string,
  bidderVersion: string):ORTBRequest => {
  if (amxId) {
    deepSetValue(request, 'ext.localStorage.amxId', amxId);
    if (!request.user) request.user = {};
    if (!request.user.ext) request.user.ext = {};
    if (!request.user.ext.eids) request.user.ext.eids = [];
    (request.user.ext.eids as any).push({
      source: 'amxdt.net',
      uids: [{
        id: `${amxId}`,
        atype: 1
      }]
    });
  }
  deepSetValue(request, 'ext.version', '$prebid.version$');
  deepSetValue(request, 'ext.source', 'prebid.js');
  deepSetValue(request, 'ext.pageViewId', pageViewId);
  deepSetValue(request, 'ext.bidderVersion', bidderVersion);
  deepSetValue(request, 'ext.sessionId', getSessionId());
  deepSetValue(request, 'ext.requestCounter', getRequestCount());
  deepSetValue(request, 'cur', [getCurrencyFromBidderRequest(request) || 'USD']);
  if (!request.user) request.user = {};
  return request;
};

export function createResponse(bid:any, ortbResponse:any): BidResponse {
  let mediaType: MediaType = BANNER;
  if ([INSTREAM, OUTSTREAM].includes(bid.ext.mediaType as string)) mediaType = VIDEO;
  if (bid.ext.mediaType === NATIVE) mediaType = NATIVE;
  const response:any = {
    requestId: bid.impid,
    cpm: bid.price,
    width: bid.w,
    height: bid.h,
    creativeId: bid.crid,
    currency: ortbResponse.cur,
    netRevenue: true,
    ttl: 120,
    mediaType,
    meta: {
      advertiserDomains: bid.adomain,
      demandSource: bid.ext.ssp,
    },
  };
  if (bid.dealid) response.dealid = bid.dealid;

  if (bid.ext.mediaType === BANNER) response.ad = bid.adm;
  if ([INSTREAM, OUTSTREAM].includes(bid.ext.mediaType as string)) response.vastXml = bid.adm;

  if (bid.ext.mediaType === OUTSTREAM) {
    response.renderer = createRenderer(bid, OUTSTREAM_RENDERER_URL);
    if (bid.ext.divId) response.divId = bid.ext.divId
  };

  if (bid.ext.mediaType === NATIVE) {
    try {
      response.native = { ortb: JSON.parse(bid.adm) }
    } catch (e) {}
  }
  return response as BidResponse;
}

/**
 * Get the AMX ID
 * @return { string | false } false if localstorageNotEnabled
 */
export const getAmxId = (
  storage: StorageManager,
  bidderCode: string
): string | null => {
  if (!storage.localStorageIsEnabled()) {
    logInfo(`localstorage not enabled for ${bidderCode}`);
    return null;
  }
  const amxId = storage.getDataFromLocalStorage('__amuidpb');
  return amxId || null;
}
