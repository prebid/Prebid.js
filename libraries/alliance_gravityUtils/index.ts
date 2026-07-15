import { deepAccess, deepSetValue, logInfo } from '../../src/utils.js';
import { Renderer } from '../../src/Renderer.js';
import { INSTREAM, OUTSTREAM } from '../../src/video.js';
import { BANNER, NATIVE, VIDEO } from '../../src/mediaTypes.js';
import { BidResponse, VideoBidResponse } from '../../src/bidfactory.js';
import { BidRequest, ORTBImp } from '../../src/prebid.public.js';
import { addEventTrackers } from '../pbsExtensions/processors/eventTrackers.js';
import { ORTB_MTYPES } from '../ortbConverter/processors/mediaType.js';

const OUTSTREAM_RENDERER_URL = 'https://acdn.adnxs.com/video/outstream/ANOutstreamVideo.js';

export function getUserSyncs(syncOptions, serverResponses, gdprConsent, uspConsent) {
  if (typeof serverResponses === 'object' &&
  serverResponses != null &&
  serverResponses.length > 0 &&
  serverResponses[0].hasOwnProperty('body') &&
  serverResponses[0].body.hasOwnProperty('ext') &&
  serverResponses[0].body.ext.hasOwnProperty('cookies') &&
  typeof serverResponses[0].body.ext.cookies === 'object' &&
  Array.isArray(serverResponses[0].body.ext.cookies)) {
    return serverResponses[0].body.ext.cookies.slice(0, 5);
  } else {
    return [];
  }
};

const createOustreamRendererFunction = (
  adUnitCode: string,
  width: number,
  height: number
) => (bidResponse: VideoBidResponse) => {
  bidResponse.renderer.push(() => {
    (window as any).ANOutstreamVideo.renderAd({
      sizes: [width, height],
      targetId: adUnitCode,
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
  adUnitCode: string,
  width: number,
  height: number
};

export const createRenderer = (
  { requestId, vastXml, adUnitCode, width, height }: CreateRenderPayload
): Renderer | undefined => {
  if (!vastXml) {
    logInfo('No VAST in bidResponse');
    return;
  }
  const installPayload = {
    id: requestId,
    url: OUTSTREAM_RENDERER_URL,
    loaded: false,
    adUnitCode: adUnitCode,
    targetId: adUnitCode,
  };
  const renderer = Renderer.install(installPayload);
  renderer.setRender(createOustreamRendererFunction(adUnitCode, width, height));
  return renderer;
};

export const enrichImp = (imp:ORTBImp, bidRequest:BidRequest<string>): ORTBImp => {
  deepSetValue(imp, 'tagid', bidRequest.adUnitCode);
  deepSetValue(imp, 'ext.adUnitCode', bidRequest.adUnitCode);
  if (imp.video) {
    const playerSize = deepAccess(bidRequest, 'mediaTypes.video.playerSize');
    const videoContext = deepAccess(bidRequest, 'mediaTypes.video.context');
    deepSetValue(imp, 'video.ext.playerSize', playerSize);
    deepSetValue(imp, 'video.ext.context', videoContext);
  }
  return imp;
};

export function mediaTypeOverride(orig: (bidResponse: any, bid: any, context: any) => void, bidResponse: any, bid: any, context: any): void {
  if (bidResponse.mediaType || ORTB_MTYPES.hasOwnProperty(bid.mtype)) {
    orig(bidResponse, bid, context);
    return;
  }
  const prebidType = deepAccess(bid, 'ext.prebid.type');
  if ([BANNER, VIDEO, NATIVE].includes(prebidType)) {
    bidResponse.mediaType = prebidType;
    return;
  }
  const legacyType = deepAccess(bid, 'ext.mediaType');
  if (legacyType === INSTREAM || legacyType === OUTSTREAM) {
    bidResponse.mediaType = VIDEO;
    return;
  }
  if ([BANNER, NATIVE].includes(legacyType)) {
    bidResponse.mediaType = legacyType;
    return;
  }
  orig(bidResponse, bid, context);
}

export function videoResponseOverride(orig: (bidResponse: any, bid: any, context: any) => void, bidResponse: any, bid: any, context: any): void {
  orig(bidResponse, bid, context);
  if (bidResponse.mediaType !== VIDEO) return;
  if (deepAccess(context, 'bidRequest.mediaTypes.video.context') !== OUTSTREAM) return;

  const adUnitCode = context.bidRequest.adUnitCode;
  const renderer = createRenderer({
    requestId: bidResponse.requestId,
    vastXml: bidResponse.vastXml,
    adUnitCode,
    width: bidResponse.width,
    height: bidResponse.height,
  });
  if (renderer) {
    bidResponse.renderer = renderer;
    bidResponse.adUnitCode = adUnitCode;
  } else {
    logInfo('Could not create renderer for outstream bid');
  }
}

export function enrichBidResponse(bidResponse: any, bid: any): BidResponse {
  if (bid.ext?.ssp) {
    bidResponse.meta = bidResponse.meta || {};
    bidResponse.meta.demandSource = bid.ext.ssp;
  }
  addEventTrackers(bidResponse, bid);
  return bidResponse as BidResponse;
}
