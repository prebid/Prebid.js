import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import type { AdapterRequest, BidderSpec, ExtendedResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest } from '../src/adapterManager.js';
import { config } from '../src/config.js';
import { EVENT_TYPE_IMPRESSION, EVENT_TYPE_WIN, TRACKER_METHOD_IMG } from '../src/eventTrackers.js';
import { CLIENT_SECTIONS, hasSection } from '../src/fpd/oneClient.js';
import { BANNER } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';
import {
  deepAccess,
  deepSetValue,
  generateUUID,
  getWinDimensions,
  isArray,
  isSafariBrowser,
  isStr,
  logError,
  logWarn,
  replaceMacros,
  resetWinDimensions,
} from '../src/utils.js';

const BIDDER_CODE = 'splash';
const GVLID = 1490;
const CURRENCY = 'PLN';
const TTL = 300;
const ENDPOINT_URL = 'https://ssp.splashandroll.com/auction/splash';
const STG_ENDPOINT_URL = 'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash';
const STANDARD = 'standard';
const PARALLAX = 'parallax';
const INTERSTITIAL = 'interstitial';
const DISPLAY_FORMATS = [STANDARD, PARALLAX, INTERSTITIAL];

export type SplashDisplayFormat = 'standard' | 'parallax' | 'interstitial';

export interface SplashBidParams {
  /** Splash publisher ID. */
  publisherId: string;
  /** Splash placement ID, sent as `imp.tagid`. */
  placementId: string;
  /** Creative format of the ad unit. Defaults to `'standard'`. */
  displayFormat?: SplashDisplayFormat;
  /** Floor CPM in PLN, used only when the Price Floors module sets no floor. */
  bidfloor?: number;
  /** Auction endpoint. Defaults to production; the staging URL serves Splash test placements. */
  endpoint?: 'https://ssp.splashandroll.com/auction/splash' | 'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash';
}

declare module '../src/adUnits' {
  interface BidderParams {
    [BIDDER_CODE]: SplashBidParams;
  }
}

type SplashBidRequest = BidRequest<typeof BIDDER_CODE>;

const converter = ortbConverter<typeof BIDDER_CODE>({
  context: {
    netRevenue: true,
    ttl: TTL,
    currency: CURRENCY,
    mediaType: BANNER,
  },
  imp(buildImp, bidRequest, context) {
    const imp = buildImp(bidRequest, context);
    const { params } = bidRequest;
    const format = displayFormatOf(params);
    imp.tagid = params.placementId;
    const banner = imp.banner;
    if (banner && banner.w == null && banner.h == null && isArray(banner.format) && banner.format.length) {
      banner.w = banner.format[0].w;
      banner.h = banner.format[0].h;
    }
    if (imp.bidfloor == null && Number.isFinite(params.bidfloor) && params.bidfloor > 0) {
      imp.bidfloor = params.bidfloor;
      imp.bidfloorcur = CURRENCY;
    }
    if (format === INTERSTITIAL && imp.instl == null) imp.instl = 1;
    deepSetValue(imp, 'ext.general.placement_type', 'display');
    deepSetValue(imp, 'ext.general.display_format', format);
    return imp;
  },
  request(buildRequest, imps, bidderRequest, context) {
    const request = buildRequest(imps, bidderRequest, context);
    const { params } = context.bidRequests[0];
    request.cur = [CURRENCY];
    const client = CLIENT_SECTIONS.find(section => hasSection(request, section)) || 'site';
    deepSetValue(request, `${client}.publisher.id`, params.publisherId);
    // The Splash auction requires a client ID; the placement ID is used when FPD provides none.
    if (!request[client].id) request[client].id = params.placementId;
    return request;
  },
  bidResponse(buildBidResponse, bid, context) {
    if (!Number.isFinite(bid.price) || bid.price <= 0) return;
    const format = displayFormatOf(context.bidRequest.params);
    const responseFormat = responseDisplayFormat(bid);
    if (responseFormat && responseFormat !== format) {
      logWarn(`${BIDDER_CODE}: ignoring a ${responseFormat} bid for a ${format} ad unit`, bid.impid);
      return;
    }
    if (format !== STANDARD && !isNonEmptyString(bid.adm)) return;
    const bidResponse = buildBidResponse(bid, context);
    if (bidResponse.creativeId == null) bidResponse.creativeId = bid.id;
    const domains = bidResponse.meta.advertiserDomains;
    if (isArray(domains)) {
      bidResponse.meta.advertiserDomains = domains.filter(domain => isStr(domain) && domain.length > 0);
    } else {
      delete bidResponse.meta.advertiserDomains;
    }
    addEventTrackers(bidResponse, bid);
    if (format !== STANDARD) {
      const slotWidth = Number(deepAccess(bid, 'ext.splash.slot.width')) || 0;
      const slotHeight = Number(deepAccess(bid, 'ext.splash.slot.height')) || 0;
      if (format === PARALLAX && slotWidth > 0 && slotHeight > 0) {
        Object.assign(bidResponse, { width: slotWidth, height: slotHeight });
      }
      bidResponse.renderer = createRenderer(format, context.bidRequest, {
        slotHeight,
        creativeHeight: Number(bid.h) || 0,
      });
    }
    return bidResponse;
  },
  overrides: {
    bidResponse: {
      banner(orig, bidResponse, bid, context) {
        // With markup present, nurl is reported as a win event tracker rather than a pixel prepended to the ad.
        orig(bidResponse, bid.adm ? { ...bid, nurl: undefined } : bid, context);
      },
    },
  },
});

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  supportedMediaTypes: [BANNER],

  isBidRequestValid(bid) {
    const params = bid && bid.params;
    if (!params || !isNonEmptyString(params.publisherId) || !isNonEmptyString(params.placementId)) {
      logWarn(`${BIDDER_CODE}: publisherId and placementId must be non-empty strings`);
      return false;
    }
    if (params.displayFormat != null && !DISPLAY_FORMATS.includes(params.displayFormat)) {
      logWarn(`${BIDDER_CODE}: unsupported displayFormat`, params.displayFormat);
      return false;
    }
    if (displayFormatOf(params) !== STANDARD && !customRenderingAllowed(bid)) {
      logWarn(`${BIDDER_CODE}: ${params.displayFormat} requires the adapter's top-window renderer, which this configuration disables`);
      return false;
    }
    return true;
  },

  buildRequests(bidRequests, bidderRequest) {
    const groups = new Map<string, { url: string, bids: SplashBidRequest[] }>();
    bidRequests.forEach(bid => {
      const url = resolveEndpoint(bid.params.endpoint);
      const key = url + ' ' + bid.params.publisherId;
      if (!groups.has(key)) groups.set(key, { url, bids: [] });
      groups.get(key).bids.push(bid);
    });
    return Array.from(groups.values()).map(({ url, bids }): AdapterRequest => ({
      method: 'POST',
      url,
      data: converter.toORTB({ bidRequests: bids, bidderRequest }),
    }));
  },

  interpretResponse(serverResponse, request) {
    const body = serverResponse && serverResponse.body;
    if (!body || !isArray(body.seatbid)) return [];
    const seatbid = body.seatbid
      .filter(seat => seat && isArray(seat.bid))
      .map(seat => ({ ...seat, bid: seat.bid.filter(bid => bid && typeof bid === 'object') }));
    return (converter.fromORTB({ request: request.data, response: { ...body, seatbid } }) as ExtendedResponse).bids;
  },
};

registerBidder(spec);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function displayFormatOf(params: SplashBidParams): SplashDisplayFormat {
  return params.displayFormat || STANDARD;
}

function replacesAdapterRenderer(renderer): boolean {
  return !!renderer && typeof renderer.render === 'function' && renderer.backupOnly !== true;
}

function customRenderingAllowed(bid: SplashBidRequest): boolean {
  // Core drops adapter renderers when top-window renderers are disabled, and replaces them with
  // a publisher Safe Renderer or with a publisher renderer that is not backupOnly.
  return config.getConfig('allowTopWindowRenderers') !== false &&
    !deepAccess(bid, 'mediaTypes.banner.safeRenderer.url') && !deepAccess(bid, 'safeRenderer.url') &&
    !replacesAdapterRenderer(deepAccess(bid, 'mediaTypes.banner.renderer')) && !replacesAdapterRenderer(deepAccess(bid, 'renderer'));
}

function resolveEndpoint(endpoint: unknown): string {
  if (endpoint == null) return ENDPOINT_URL;
  if (endpoint === ENDPOINT_URL || endpoint === STG_ENDPOINT_URL) return endpoint;
  logWarn(`${BIDDER_CODE}: unsupported endpoint, using ${ENDPOINT_URL}`, endpoint);
  return ENDPOINT_URL;
}

function normalizeFormat(value: unknown): SplashDisplayFormat | undefined {
  const format = typeof value === 'string' ? value.toLowerCase() : '';
  return DISPLAY_FORMATS.includes(format) ? format as SplashDisplayFormat : undefined;
}

function responseDisplayFormat(bid): SplashDisplayFormat | undefined {
  return normalizeFormat(deepAccess(bid, 'ext.splash.format')) || normalizeFormat(deepAccess(bid, 'ext.general.display_format'));
}

function addEventTrackers(bidResponse, bid) {
  const macros = { AUCTION_PRICE: bid.price, AUCTION_CURRENCY: bidResponse.currency };
  const trackers = [[bid.burl, EVENT_TYPE_IMPRESSION], [bid.adm ? bid.nurl : null, EVENT_TYPE_WIN]]
    .filter(([url]) => isStr(url) && /^https:\/\//i.test(url))
    .map(([url, event]) => ({ event, method: TRACKER_METHOD_IMG, url: replaceMacros(url, macros) }));
  if (trackers.length) bidResponse.eventtrackers = (bidResponse.eventtrackers || []).concat(trackers);
}

function createRenderer(format: SplashDisplayFormat, bidRequest: SplashBidRequest, sizes: ParallaxSizes) {
  const renderer = Renderer.install({
    id: bidRequest.bidId,
    adUnitCode: bidRequest.adUnitCode,
    renderNow: true,
  });
  renderer.setRender((bid, doc) => {
    try {
      if (format === PARALLAX) renderParallax(bid, sizes);
      else renderInterstitial(bid, doc);
    } catch (e) {
      logError(`${BIDDER_CODE}: ${format} render failed`, e);
      throw e;
    }
  });
  return renderer;
}

function creativeMarkup(bid): string {
  // Core substitutes these macros for its own renderer; custom renderers receive the raw markup.
  return replaceMacros(bid.ad, { AUCTION_PRICE: bid.originalCpm || bid.cpm, CLICKTHROUGH: '' }) || '';
}

const RENDERER_OWNER = generateUUID();
const destroyers = new WeakMap<Element, () => void>();

function injectStyles(doc: Document, id: string, css: string) {
  if (doc.getElementById(id)) return;
  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  (doc.head || doc.documentElement).appendChild(style);
}

function createCreativeFrame(doc: Document, className: string, title: string): HTMLIFrameElement {
  const iframe = doc.createElement('iframe');
  iframe.className = className;
  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('scrolling', 'no');
  iframe.title = title;
  return iframe;
}

function observeRemoval(element: Element, destroy: () => void): MutationObserver | null {
  if (typeof MutationObserver === 'undefined' || !element.parentNode) return null;
  let parents: Node[] = [];
  function observeParents() {
    const nextParents: Node[] = [];
    for (let parent = element.parentNode; parent; parent = parent.parentNode) nextParents.push(parent);
    if (nextParents.length === parents.length && nextParents.every((parent, index) => parent === parents[index])) return;
    if (parents.length) observer.disconnect();
    nextParents.forEach(parent => observer.observe(parent, { childList: true }));
    parents = nextParents;
  }
  const observer = new MutationObserver(() => {
    if (!element.isConnected) {
      destroy();
      return;
    }
    try {
      observeParents();
    } catch (error) {
      destroy();
      logWarn(`${BIDDER_CODE}: removal observer failed`, error);
    }
  });
  try {
    observeParents();
  } catch (error) {
    observer.disconnect();
    throw error;
  }
  return observer;
}

/**
 * Unwraps Splash creative containers so that the markup renders directly in the renderer's iframe:
 * an SSP iframe around Standard Display markup, or the inner content of legacy Parallax markup.
 */
function unwrapCreativeHtml(html: string): string {
  if (!html) return '';
  try {
    if (html.indexOf('froc-standard-display') !== -1) {
      const body = new DOMParser().parseFromString(html, 'text/html').body;
      const child = body && body.children.length === 1 ? body.children[0] : null;
      const srcdoc = child && child.tagName === 'IFRAME' ? child.getAttribute('srcdoc') : null;
      return srcdoc && srcdoc.indexOf('froc-standard-display') !== -1 ? srcdoc : html;
    }
    if (html.indexOf('splitboard') === -1) return html;
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const inner = parsed.querySelector('.splitboard-content') || parsed.querySelector('.splitboard');
    if (!inner) return html;
    const nested = inner.querySelector('iframe[srcdoc]');
    const srcdoc = nested && nested.getAttribute('srcdoc');
    if (srcdoc) return srcdoc;
    return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;height:100%}</style></head><body>' +
      inner.innerHTML + '</body></html>';
  } catch (e) {
    return html;
  }
}

// ---------------------------------------------------------------------------------------------
// Interstitial
// ---------------------------------------------------------------------------------------------

const INTERSTITIAL_STYLE_ID = 'splash-interstitial-style';
const INTERSTITIAL_MAX_DURATION_MS = 5 * 60 * 1000;
const INTERSTITIAL_CSS = `
.sp-interstitial-overlay[data-splash-renderer="interstitial"]{position:fixed;inset:0;z-index:2147483000;display:block;width:100%;height:100%;margin:0;padding:0;background:transparent;overflow:hidden;box-sizing:border-box}
@supports (height: 100dvh) {
  .sp-interstitial-overlay[data-splash-renderer="interstitial"]{height:100dvh}
}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] *{box-sizing:border-box}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-creative{position:absolute;inset:0;display:block;width:100%;height:100%;border:0;background:transparent}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close{position:absolute;top:12px;right:12px;top:calc(12px + env(safe-area-inset-top,0px));right:calc(12px + env(safe-area-inset-right,0px));z-index:1;min-width:88px;min-height:50px;padding:8px 16px;border:1px solid #d1d5db;border-radius:4px;background:#fff;color:#111827;font:600 14px Arial,sans-serif;cursor:pointer}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close[hidden]{display:none}
.sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-close:focus-visible{outline:2px solid #111827;outline-offset:2px}
@supports (height: 100dvh) {
  .sp-interstitial-overlay[data-splash-renderer="interstitial"] .sp-interstitial-creative{height:100dvh}
}
`;
// The creative's own close control; while it is available, the host close button stays hidden.
const CREATIVE_CLOSE_SELECTOR = '[data-froc-interstitial-controls-ready="1"] .froc-display-close:not([disabled])';
const FRAME_STYLE_ID = 'splash-prebid-interstitial-frame-style';
const FRAME_STYLE =
  'html,body{width:100%;height:100%;margin:0;padding:0;overflow:hidden;background:transparent}' +
  'body iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;display:block!important;background:transparent!important}';
// Runs inside the creative frame: relays creative messages from owned nested frames, closes on Escape
// in owned frames and reports creative errors so that the host close button can be shown.
const FRAME_BRIDGE = '(function(){' +
  'if(window.__splashPrebidInterstitialBridge)return;' +
  'window.__splashPrebidInterstitialBridge=true;' +
  'function onEscape(event){if(event.key==="Escape"){event.preventDefault();window.parent.postMessage({source:"froc-display",type:"close"},"*");}}' +
  'function bindFrame(frame){' +
    'if(!frame.__splashEscapeLoadBound){frame.__splashEscapeLoadBound=true;frame.addEventListener("load",function(){bindFrame(frame);});}' +
    'try{bindEscape(frame.contentDocument);}catch(e){}' +
  '}' +
  'function bindEscape(doc){' +
    'if(!doc)return;' +
    'if(!doc.__splashEscapeBound){doc.__splashEscapeBound=true;doc.addEventListener("keydown",onEscape);' +
      'doc.addEventListener("load",function(event){if(event.target&&event.target.tagName==="IFRAME")bindFrame(event.target);},true);}' +
    'var frames=doc.querySelectorAll("iframe");for(var i=0;i<frames.length;i++)bindFrame(frames[i]);' +
  '}' +
  'bindEscape(document);document.addEventListener("DOMContentLoaded",function(){bindEscape(document);});' +
  'function reportError(){window.parent.postMessage({source:"froc-display",type:"render-error"},"*");}' +
  'window.addEventListener("error",reportError);window.addEventListener("unhandledrejection",reportError);' +
  'window.addEventListener("message",function(event){' +
    'var data=event&&event.data;' +
    'if(!data||data.source!=="froc-display")return;' +
    'var frames=document.querySelectorAll("iframe"),owned=false;' +
    'for(var i=0;i<frames.length;i++){if(event.source===frames[i].contentWindow){owned=true;break;}}' +
    'if(!owned)return;' +
    'if(data.type==="close"||data.type==="click"||data.type==="custom-event")window.parent.postMessage(data,"*");' +
  '});' +
'}());';

function buildInterstitialDocument(html: string): string {
  if (html.indexOf(FRAME_STYLE_ID) !== -1) return html;
  if (/<(?:!doctype|html|head|body)[\s>]/i.test(html)) {
    try {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const style = parsed.createElement('style');
      style.id = FRAME_STYLE_ID;
      style.textContent = FRAME_STYLE;
      const script = parsed.createElement('script');
      script.text = FRAME_BRIDGE;
      parsed.head.appendChild(style);
      parsed.head.insertBefore(script, parsed.head.firstChild);
      return '<!doctype ' + (parsed.doctype ? parsed.doctype.name : 'html') + '>' + parsed.documentElement.outerHTML;
    } catch (e) {
      logWarn(`${BIDDER_CODE}: could not prepare the interstitial document`, e);
    }
  }
  return '<!doctype html><html><head><meta charset="utf-8"><style id="' + FRAME_STYLE_ID + '">' + FRAME_STYLE +
    '</style><script>' + FRAME_BRIDGE + '</script></head><body>' + html + '</body></html>';
}

function lockHostScroll(doc: Document): () => void {
  let lock = doc.querySelector('style[data-splash-scroll-lock]');
  if (!lock) {
    lock = doc.createElement('style');
    lock.setAttribute('data-splash-scroll-lock', '0');
    lock.textContent = 'html,body{overflow:hidden!important}';
    (doc.head || doc.documentElement).appendChild(lock);
  }
  lock.setAttribute('data-splash-scroll-lock', String(Number(lock.getAttribute('data-splash-scroll-lock')) + 1));
  let released = false;
  return function unlockScroll() {
    if (released) return;
    released = true;
    const count = Number(lock.getAttribute('data-splash-scroll-lock')) - 1;
    lock.setAttribute('data-splash-scroll-lock', String(count));
    if (count <= 0 && lock.parentNode) lock.parentNode.removeChild(lock);
  };
}

function destroyOwnedInterstitials(doc: Document) {
  doc.querySelectorAll('.sp-interstitial-overlay[data-sp-owner="' + RENDERER_OWNER + '"]').forEach(overlay => {
    const destroy = destroyers.get(overlay);
    if (destroy) destroy();
    else if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  });
}

function renderInterstitial(bid, renderDoc?: Document) {
  const doc = renderDoc || document;
  const win = doc.defaultView || window;
  injectStyles(doc, INTERSTITIAL_STYLE_ID, INTERSTITIAL_CSS);
  destroyOwnedInterstitials(doc);

  const overlay = doc.createElement('div');
  overlay.className = 'sp-interstitial-overlay';
  overlay.setAttribute('data-sp-owner', RENDERER_OWNER);
  overlay.setAttribute('data-splash-renderer', 'interstitial');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Advertisement');
  const iframe = createCreativeFrame(doc, 'sp-interstitial-creative', 'Splash interstitial creative');
  const closeButton = doc.createElement('button');
  closeButton.className = 'sp-interstitial-close';
  closeButton.type = 'button';
  closeButton.textContent = 'Close ad';
  closeButton.setAttribute('aria-label', 'Close advertisement');
  overlay.appendChild(iframe);
  overlay.appendChild(closeButton);
  (doc.body || doc.documentElement).appendChild(overlay);

  const previousFocus = doc.activeElement as HTMLElement | null;
  let unlockScroll = () => {};
  let removalObserver: MutationObserver | null = null;
  let safetyTimer;
  let creativeFailed = false;
  let destroyed = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    win.removeEventListener('message', onMessage);
    doc.removeEventListener('keydown', onKeyDown);
    iframe.removeEventListener('load', updateCloseButton);
    closeButton.removeEventListener('click', destroy);
    win.clearTimeout(safetyTimer);
    if (removalObserver) removalObserver.disconnect();
    unlockScroll();
    destroyers.delete(overlay);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    destroy();
  }

  function updateCloseButton() {
    let creativeClose: boolean;
    try {
      creativeClose = !creativeFailed && !!iframe.contentDocument.querySelector(CREATIVE_CLOSE_SELECTOR);
    } catch (e) {
      // A creative that navigated away from the owned document cannot report its own close control.
      creativeClose = false;
    }
    const closeButtonFocused = doc.activeElement === closeButton;
    closeButton.hidden = creativeClose;
    if (creativeClose && closeButtonFocused) iframe.focus();
  }

  function onMessage(event: MessageEvent) {
    const data = event && event.data;
    if (!data || data.source !== 'froc-display' || event.source !== iframe.contentWindow) return;
    if (data.type === 'close') {
      destroy();
    } else if (data.type === 'render-error') {
      creativeFailed = true;
      updateCloseButton();
    }
  }

  destroyers.set(overlay, destroy);
  try {
    unlockScroll = lockHostScroll(doc);
    removalObserver = observeRemoval(overlay, destroy);
    win.addEventListener('message', onMessage);
    doc.addEventListener('keydown', onKeyDown);
    closeButton.addEventListener('click', destroy);
    iframe.addEventListener('load', updateCloseButton);
    safetyTimer = win.setTimeout(destroy, INTERSTITIAL_MAX_DURATION_MS);
    closeButton.focus();
    iframe.srcdoc = buildInterstitialDocument(unwrapCreativeHtml(creativeMarkup(bid)));
  } catch (error) {
    destroy();
    throw error;
  }
}

// ---------------------------------------------------------------------------------------------
// Parallax
// ---------------------------------------------------------------------------------------------

type ParallaxSizes = { slotHeight: number, creativeHeight: number };

const PARALLAX_STYLE_ID = 'splash-parallax-style';
const PARALLAX_CSS = `
.sp-frame.splitboard[data-splash-renderer="parallax"]{position:relative;z-index:1;width:100%;max-width:100%;overflow:hidden;box-sizing:border-box;background:transparent;touch-action:pan-y pinch-zoom}
.sp-frame[data-splash-renderer="parallax"] *{box-sizing:border-box}
.sp-frame[data-splash-renderer="parallax"] .sp-stage.splitboard-content{position:relative;width:100%;height:100%}
.sp-frame[data-splash-renderer="parallax"] .sp-creative{position:fixed;top:0;left:0;width:100vw;height:100vh;display:block;border:0;background:transparent;pointer-events:auto}
.sp-clip-svg[data-splash-renderer="parallax"]{position:absolute;width:0;height:0;overflow:hidden}
.sp-frame.sp-pointer-guarded[data-splash-renderer="parallax"] .sp-creative{position:absolute}
`;
const SVG_NS = 'http://www.w3.org/2000/svg';

function createClipSvg(doc: Document, clipId: string): SVGSVGElement {
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'sp-clip-svg');
  svg.setAttribute('data-splash-renderer', 'parallax');
  svg.setAttribute('height', '0');
  svg.setAttribute('width', '0');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const defs = doc.createElementNS(SVG_NS, 'defs');
  const clipPath = doc.createElementNS(SVG_NS, 'clipPath');
  clipPath.setAttribute('id', clipId);
  clipPath.setAttribute('clipPathUnits', 'objectBoundingBox');
  const polygon = doc.createElementNS(SVG_NS, 'polygon');
  polygon.setAttribute('points', '0 0.99, 0 0.01, 1 0.01, 1 0.99');
  clipPath.appendChild(polygon);
  defs.appendChild(clipPath);
  svg.appendChild(defs);
  return svg;
}

function renderParallax(bid, sizes: ParallaxSizes) {
  const slot = getAdUnitElement(bid);
  if (!slot) throw new Error(`${BIDDER_CODE}: slot element not found for ${bid.adUnitCode}`);
  const doc = slot.ownerDocument;
  injectStyles(doc, PARALLAX_STYLE_ID, PARALLAX_CSS);
  slot.querySelectorAll('.sp-frame[data-sp-owner="' + RENDERER_OWNER + '"]').forEach(previous => {
    const destroy = destroyers.get(previous);
    if (destroy) destroy();
  });

  const frame = doc.createElement('div');
  frame.className = 'sp-frame splitboard';
  frame.setAttribute('data-sp-owner', RENDERER_OWNER);
  frame.setAttribute('data-splash-renderer', 'parallax');
  const clipId = 'sp-clip-' + generateUUID();
  frame.style.setProperty('-webkit-clip-path', 'url(#' + clipId + ')');
  frame.style.clipPath = 'url(#' + clipId + ')';
  const stage = doc.createElement('div');
  stage.className = 'sp-stage splitboard-content';
  const iframe = createCreativeFrame(doc, 'sp-creative', 'Splash parallax creative');
  stage.appendChild(iframe);
  frame.appendChild(stage);
  slot.appendChild(frame);
  const clipSvg = createClipSvg(doc, clipId);
  slot.appendChild(clipSvg);

  const cleanups: Array<() => void> = [];
  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    cleanups.forEach(cleanup => cleanup());
    destroyers.delete(frame);
    if (frame.parentNode) frame.parentNode.removeChild(frame);
    if (clipSvg.parentNode) clipSvg.parentNode.removeChild(clipSvg);
  }
  destroyers.set(frame, destroy);
  try {
    iframe.srcdoc = unwrapCreativeHtml(creativeMarkup(bid));
    cleanups.push(installParallaxSizing(frame, stage, sizes));
    const removePointerGuard = installSafariPointerGuard(frame, iframe);
    if (removePointerGuard) cleanups.push(removePointerGuard);
    const removalObserver = observeRemoval(frame, destroy);
    if (removalObserver) cleanups.push(() => removalObserver.disconnect());
  } catch (error) {
    destroy();
    throw error;
  }
}

function installParallaxSizing(frame: HTMLElement, stage: HTMLElement, { slotHeight, creativeHeight }: ParallaxSizes): () => void {
  const win = frame.ownerDocument.defaultView || window;
  const container = frame.parentElement.parentElement;
  let intrinsicWidth = false;
  function computeHeight() {
    const dims = getWinDimensions();
    const viewport = dims.innerHeight || deepAccess(dims, 'document.documentElement.clientHeight') || 0;
    // A slot height equal to the creative height means the slot follows the viewport.
    if (!slotHeight || (creativeHeight > 0 && Math.abs(slotHeight - creativeHeight) <= 1)) return viewport;
    return viewport > 0 ? Math.min(slotHeight, viewport) : slotHeight;
  }
  function applySize() {
    const height = computeHeight();
    if (height > 0) {
      frame.style.height = height + 'px';
      stage.style.height = height + 'px';
    }
    // An auto-width inline-block slot has no intrinsic width from the out-of-flow iframe.
    const rect = frame.getClientRects()[0];
    if (rect && (!rect.width || intrinsicWidth) && container) {
      const bounds = container.getClientRects()[0];
      if (bounds) {
        const css = win.getComputedStyle(container);
        const right = Math.min(frame.ownerDocument.documentElement.clientWidth,
          bounds.right - parseFloat(css.paddingRight) - parseFloat(css.borderRightWidth));
        const width = Math.max(0, right - rect.left) + 'px';
        if (frame.style.minWidth !== width) frame.style.minWidth = width;
        intrinsicWidth = true;
      }
    }
  }
  function onViewportChange() {
    // Window dimensions are cached briefly; a viewport change must read the new height.
    resetWinDimensions();
    applySize();
  }
  applySize();
  const observer = typeof ResizeObserver === 'function' && container ? new ResizeObserver(applySize) : null;
  if (observer) {
    try {
      observer.observe(container);
    } catch (error) {
      observer.disconnect();
      throw error;
    }
  }
  win.addEventListener('resize', onViewportChange, { passive: true });
  win.addEventListener('orientationchange', onViewportChange, { passive: true });
  return () => {
    win.removeEventListener('resize', onViewportChange);
    win.removeEventListener('orientationchange', onViewportChange);
    if (observer) observer.disconnect();
  };
}

/**
 * Safari can hit-test fixed descendants outside the aperture. An absolutely positioned iframe
 * stays physically clipped while scroll offsets keep the creative aligned to the viewport.
 */
function installSafariPointerGuard(frame: HTMLElement, iframe: HTMLIFrameElement): (() => void) | null {
  if (!isSafariBrowser()) return null;
  const win = frame.ownerDocument.defaultView || window;
  const query = win.matchMedia && win.matchMedia('(pointer: fine) and (hover: hover)');
  if (!query || !query.matches) return null;
  frame.classList.add('sp-pointer-guarded');
  let animationFrame: number;
  function alignCreative() {
    // Auction-cached rectangles become stale on scroll; read only this owned element's live rect.
    const rect = frame.getClientRects()[0];
    if (rect) {
      const left = -rect.left + 'px';
      const top = -rect.top + 'px';
      if (iframe.style.left !== left) iframe.style.left = left;
      if (iframe.style.top !== top) iframe.style.top = top;
    }
    // Layout shifts and slot reparenting need alignment even without a scroll/resize event.
    animationFrame = win.requestAnimationFrame(alignCreative);
  }
  alignCreative();
  return () => {
    win.cancelAnimationFrame(animationFrame);
    frame.classList.remove('sp-pointer-guarded');
    iframe.style.removeProperty('left');
    iframe.style.removeProperty('top');
  };
}
