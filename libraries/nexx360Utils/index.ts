import { deepAccess, deepSetValue, generateUUID, getParameterByName, logInfo, sizesToSizeTuples } from '../../src/utils.js';
import { Renderer } from '../../src/Renderer.js';
import { config } from '../../src/config.js';
import { getCurrencyFromBidderRequest } from '../ortb2Utils/currency.js';
import { INSTREAM, OUTSTREAM } from '../../src/video.js';
import { BANNER, MediaType, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { BidResponse, VideoBidResponse } from '../../src/bidfactory.js';
import { StorageManager } from '../../src/storageManager.js';
import { BidRequest, ORTBImp, ORTBRequest, ORTBResponse } from '../../src/prebid.public.js';
import { AdapterRequest, AdapterResponse, ServerResponse } from '../../src/adapters/bidderFactory.js';
import { ClientBidderRequest } from '../../src/adapterManager.js';
import { Nexx360ServerAuction } from './types.js';

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

let sessionId:string | null = null;

const getSessionId = ():string => {
  if (sessionId) return sessionId;
  const id:string = generateUUID();
  sessionId = id;
  return id;
};

let lastPageUrl:string = '';
let requestCounter:number = 0;

const getRequestCount = ():number => {
  if (lastPageUrl === window.location.pathname) {
    return ++requestCounter;
  }
  lastPageUrl = window.location.pathname;
  return 0;
};

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

const createOustreamRendererFunction = (
  divId: string,
  width: number,
  height: number
) => (bidResponse: VideoBidResponse) => {
  bidResponse.renderer.push(() => {
    (window as any).ANOutstreamVideo.renderAd({
      sizes: [width, height],
      targetId: divId,
      adResponse: bidResponse.vastXml,
      rendererOptions: {
        showBigPlayButton: false,
        showProgressBar: 'bar',
        showVolume: false,
        allowFullscreen: true,
        skippable: false,
        content: bidResponse.vastXml
      }
    });
  });
};

export type CreateRenderPayload = {
  requestId: string,
  vastXml: string,
  divId: string,
  width: number,
  height: number
};

export const createRenderer = (
  { requestId, vastXml, divId, width, height }: CreateRenderPayload
): Renderer | undefined => {
  if (!vastXml) {
    logInfo('No VAST in bidResponse');
    return;
  }
  const installPayload = {
    id: requestId,
    url: OUTSTREAM_RENDERER_URL,
    loaded: false,
    adUnitCode: divId,
    targetId: divId,
  };
  const renderer = Renderer.install(installPayload);
  renderer.setRender(createOustreamRendererFunction(divId, width, height));
  return renderer;
};

export const enrichImp = (imp:ORTBImp, bidRequest:BidRequest<string>): ORTBImp => {
  deepSetValue(imp, 'tagid', bidRequest.adUnitCode);
  deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
  const divId = bidRequest.params.divId || bidRequest.adUnitCode;
  deepSetValue(imp, 'ext.divId', divId);
  if (imp.video) {
    let playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
    if (imp.video.w != null && imp.video.h != null) {
      const declaredPrimary = sizesToSizeTuples(playerSize)[0];
      if (!declaredPrimary || declaredPrimary[0] !== imp.video.w || declaredPrimary[1] !== imp.video.h) {
        playerSize = [[imp.video.w, imp.video.h]];
      }
    }
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    if (playerSize != null) deepSetValue(imp, 'video.ext.playerSize', playerSize);
    if (videoContext != null) deepSetValue(imp, 'video.ext.context', videoContext);
  }
  return imp;
};

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
  if (bid.dealid) response.dealId = bid.dealid;

  if (bid.ext.mediaType === BANNER) response.ad = bid.adm;
  if ([INSTREAM, OUTSTREAM].includes(bid.ext.mediaType as string)) response.vastXml = bid.adm;
  if (bid.ext.mediaType === OUTSTREAM && (bid.ext.divId || bid.ext.adUnitCode)) {
    const renderer = createRenderer({
      requestId: response.requestId,
      vastXml: response.vastXml,
      divId: bid.ext.divId || bid.ext.adUnitCode,
      width: response.width,
      height: response.height
    });
    if (renderer) {
      response.renderer = renderer;
      response.divId = bid.ext.divId;
    } else {
      logInfo('Could not create renderer for outstream bid');
    }
  };

  if (bid.ext.mediaType === NATIVE) {
    try {
      response.native = { ortb: JSON.parse(bid.adm) };
    } catch (e) {}
  }
  return response as BidResponse;
}

// --- Server auction data extraction ---

/**
 * Bidder request carrying the server-side auction data from the response `ext`,
 * for consumption by the Nexx360 analytics adapter on the `bidderDone` event.
 */
export type Nexx360BidderRequest = ClientBidderRequest<string> & { serverAuctionData?: Nexx360ServerAuction };

/** Request built by `buildRequests`, handed back to `interpretResponse` with its bidder request. */
export type Nexx360AdapterRequest = AdapterRequest & { bidderRequest?: Nexx360BidderRequest };

function getServerAuction(responseBody: any): Nexx360ServerAuction | null {
  const serverAuction = deepAccess(responseBody, 'ext.serverAuction');
  if (serverAuction && typeof serverAuction === 'object' && serverAuction.auctionId) {
    return serverAuction as Nexx360ServerAuction;
  }
  return null;
}

export const interpretResponse = (serverResponse: ServerResponse, request?: Nexx360AdapterRequest): AdapterResponse => {
  if (!serverResponse.body) return [];
  const respBody = serverResponse.body as ORTBResponse;

  // Store server-auction data on the bidder request, which Prebid emits on `bidderDone`,
  // rather than on the bids: a response without bids still reports its server auction,
  // and the data cannot leak into an unrelated auction. Other adapters share this function
  // and may call it without a request.
  const serverAuctionData = getServerAuction(respBody);
  if (serverAuctionData && request?.bidderRequest) {
    request.bidderRequest.serverAuctionData = serverAuctionData;
  }

  if (!respBody.seatbid || respBody.seatbid.length === 0) {
    return [];
  }

  const responses: BidResponse[] = [];
  for (let i = 0; i < respBody.seatbid.length; i++) {
    const seatbid = respBody.seatbid[i];
    for (let j = 0; j < seatbid.bid.length; j++) {
      const bid = seatbid.bid[j];
      responses.push(createResponse(bid, respBody));
    }
  }
  return responses;
};

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
};

export const getGzipSetting = (
  bidderCode: string,
  defaultEnabled: boolean = true,
): boolean => {
  if (getParameterByName('nexx360_debug') === '1') return false;
  const bidderConfig = config.getBidderConfig();
  const gzipEnabled = bidderConfig[bidderCode]?.gzipEnabled;
  if (gzipEnabled === true || gzipEnabled === 'true') return true;
  if (gzipEnabled === false || gzipEnabled === 'false') return false;
  return defaultEnabled;
};
