import { ortbConverter } from '../libraries/ortbConverter/converter.js';
import { registerBidder } from '../src/adapters/bidderFactory.js';
import type { AdapterRequest, BidderSpec, ExtendedResponse } from '../src/adapters/bidderFactory.js';
import type { BidRequest } from '../src/adapterManager.js';
import { EVENT_TYPE_IMPRESSION, EVENT_TYPE_WIN, TRACKER_METHOD_IMG } from '../src/eventTrackers.js';
import { CLIENT_SECTIONS, hasSection } from '../src/fpd/oneClient.js';
import { BANNER } from '../src/mediaTypes.js';
import { Renderer } from '../src/Renderer.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';
import {
  buildInterstitialDocument,
  createCreativeFrame,
  createInterstitialView,
  injectStyles,
  INTERSTITIAL_CSS,
  INTERSTITIAL_MAX_DURATION_MS,
  INTERSTITIAL_STYLE_ID,
  SVG_NS,
  unwrapCreativeHtml,
} from '../libraries/splashUtils/creative.js';
import {
  deepSetValue,
  generateUUID,
  getWinDimensions,
  isArray,
  isChromeIOSBrowser,
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
const SAFE_RENDERER_URL = 'https://cdn.splashandroll.com/runtime/prebid/safe-renderer/1.0.0/splash-safe-renderer.js';
const TOP_WINDOW = 'top-window';
const SAFE = 'safe';

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

interface SplashBidExt {
  splash?: {
    slot?: { width?: unknown, height?: unknown };
    format?: unknown;
  };
  general?: { display_format?: unknown };
}

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
    if (responseFormat === null) {
      logWarn(`${BIDDER_CODE}: ignoring a bid with an unsupported or conflicting response format`, bid.impid);
      return;
    }
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
      const ext = bid.ext as SplashBidExt | undefined;
      const slotWidth = Number(ext?.splash?.slot?.width) || 0;
      const slotHeight = Number(ext?.splash?.slot?.height) || 0;
      if (format === PARALLAX && slotWidth > 0 && slotHeight > 0) {
        Object.assign(bidResponse, { width: slotWidth, height: slotHeight });
      }
      if (customPresentation(context.bidRequest, context.bidderRequest) === SAFE) {
        const width = Number(bid.w);
        const height = Number(bid.h);
        const creativeSize = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0 ? { width, height } : undefined;
        bidResponse.safeRenderer = {
          url: SAFE_RENDERER_URL,
          config: { format, ...(creativeSize ? { creativeSize } : {}) },
        };
      } else {
        bidResponse.renderer = createRenderer(format, context.bidRequest, {
          slotHeight,
          creativeHeight: Number(bid.h) || 0,
        });
      }
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
  return !!(renderer && renderer.render && renderer.backupOnly !== true);
}

/**
 * How core will render a Parallax or Interstitial bid for this request. Core prefers any Safe Renderer on the bid,
 * replaces the bid's renderers with publisher ones that are not backupOnly, and drops top-window renderers unless
 * `allowTopWindowRenderers` permits them. The top-window renderer is used only with that permission from core and
 * nothing to replace it. Publisher overrides are resolved by core without withholding the bid.
 */
function customPresentation(bid: SplashBidRequest, bidderRequest: unknown): typeof TOP_WINDOW | typeof SAFE {
  const safeRenderers = [bid.mediaTypes?.banner?.safeRenderer, bid.safeRenderer]
    .filter(safeRenderer => safeRenderer && safeRenderer.url);
  const allowTopWindowRenderers = bidderRequest && typeof bidderRequest === 'object' &&
    (bidderRequest as { allowTopWindowRenderers?: unknown }).allowTopWindowRenderers === true;
  const topWindow = allowTopWindowRenderers && !safeRenderers.length &&
    !replacesAdapterRenderer(bid.mediaTypes?.banner?.renderer) && !replacesAdapterRenderer(bid.renderer);
  return topWindow ? TOP_WINDOW : SAFE;
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

function responseDisplayFormat(bid): SplashDisplayFormat | null | undefined {
  let format: SplashDisplayFormat | undefined;
  const ext = bid.ext as SplashBidExt | undefined;
  for (const value of [ext?.splash?.format, ext?.general?.display_format]) {
    if (value === undefined) continue;
    const normalized = normalizeFormat(value);
    if (!normalized || (format && normalized !== format)) return null;
    format = normalized;
  }
  return format;
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

function observeRemoval(element: Element, destroy: () => void, onReparent?: () => void, onLayoutChange?: () => void): MutationObserver | null {
  if (typeof MutationObserver === 'undefined' || !element.parentNode) return null;
  let parents: Node[] = [];
  function observeParents() {
    const nextParents: Node[] = [];
    for (let parent = element.parentNode; parent; parent = parent.parentNode) nextParents.push(parent);
    if (nextParents.length === parents.length && nextParents.every((parent, index) => parent === parents[index])) return;
    const reparented = parents.length > 0;
    if (reparented) observer.disconnect();
    nextParents.forEach(parent => observer.observe(parent, { childList: true }));
    parents = nextParents;
    if (reparented && onReparent) onReparent();
  }
  const observer = new MutationObserver(() => {
    if (!element.isConnected) {
      destroy();
      return;
    }
    try {
      observeParents();
      if (onLayoutChange) onLayoutChange();
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

// ---------------------------------------------------------------------------------------------
// Interstitial
// ---------------------------------------------------------------------------------------------

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

  const { overlay, iframe, closeButton, onMessage } = createInterstitialView(doc, destroy);
  overlay.setAttribute('data-sp-owner', RENDERER_OWNER);
  (doc.body || doc.documentElement).appendChild(overlay);

  const previousFocus = doc.activeElement as HTMLElement | null;
  let unlockScroll = () => {};
  let removalObserver: MutationObserver | null = null;
  let safetyTimer;
  let destroyed = false;

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    win.removeEventListener('message', onMessage);
    doc.removeEventListener('keydown', onKeyDown);
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

  destroyers.set(overlay, destroy);
  try {
    unlockScroll = lockHostScroll(doc);
    removalObserver = observeRemoval(overlay, destroy);
    win.addEventListener('message', onMessage);
    doc.addEventListener('keydown', onKeyDown);
    closeButton.addEventListener('click', destroy);
    safetyTimer = win.setTimeout(destroy, INTERSTITIAL_MAX_DURATION_MS);
    closeButton.focus();
    iframe.srcdoc = buildInterstitialDocument(unwrapCreativeHtml(creativeMarkup(bid)), error => logWarn(`${BIDDER_CODE}: could not prepare the interstitial document`, error));
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
.sp-frame.sp-native-parallax[data-splash-renderer="parallax"]{overflow:clip}
.sp-frame.sp-native-parallax[data-splash-renderer="parallax"] .sp-stage{top:-100vh}
.sp-frame.sp-native-parallax[data-splash-renderer="parallax"] .sp-creative{position:sticky;top:0}
`;

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
    const pointerGuard = installSafariPointerGuard(frame, stage, iframe);
    if (pointerGuard) cleanups.push(pointerGuard.destroy);
    const sizing = installParallaxSizing(frame, stage, sizes, pointerGuard?.refresh);
    cleanups.push(sizing.destroy);
    const removalObserver = observeRemoval(frame, destroy, sizing.refresh, pointerGuard?.refresh);
    if (removalObserver) cleanups.push(() => removalObserver.disconnect());
  } catch (error) {
    destroy();
    throw error;
  }
}

function fitIntrinsicParallaxWidth(frame: HTMLElement, win: Window): boolean {
  // Remove our previous contribution before measuring shrink-to-fit ancestors again.
  frame.style.removeProperty('min-width');
  const rect = frame.getClientRects()[0];
  if (!rect || rect.width > 0) return false;
  // eslint-disable-next-line prebid/no-synchronous-layout-read -- measures the slot it has just changed, which cached values would not reflect
  const viewportWidth = frame.ownerDocument.documentElement.clientWidth;
  let width = viewportWidth;
  let reserved = 0;
  const limits: Array<{ element: HTMLElement, left: number, right: number }> = [];
  const pixels = (value: string) => parseFloat(value) || 0;
  for (let element = frame.parentElement; element; element = element.parentElement) {
    const bounds = element.getClientRects()[0];
    if (!bounds) continue;
    // eslint-disable-next-line prebid/no-synchronous-layout-read -- ancestor padding and borders limit the slot's width; no cached utility provides them
    const css = win.getComputedStyle(element);
    const left = pixels(css.paddingLeft) + pixels(css.borderLeftWidth);
    const right = pixels(css.paddingRight) + pixels(css.borderRightWidth);
    const contentWidth = bounds.width - left - right;
    if (contentWidth > reserved) {
      width = Math.min(width, contentWidth - reserved);
      limits.push({ element, left, right });
    }
    reserved += left + right + pixels(css.marginLeft) + pixels(css.marginRight);
  }
  // Measure native flex/grid/RTL positioning, including ancestors with only intrinsic padding.
  function fitsWidth(value: number): boolean {
    frame.style.minWidth = value + 'px';
    const placed = frame.getClientRects()[0];
    let left = 0;
    let right = viewportWidth;
    limits.forEach(limit => {
      const bounds = limit.element.getClientRects()[0];
      if (bounds) {
        left = Math.max(left, bounds.left + limit.left);
        right = Math.min(right, bounds.right - limit.right);
      }
    });
    return placed.left >= left - 0.25 && placed.right <= right + 0.25;
  }
  if (!fitsWidth(width)) {
    // Only offset layouts need this search; each measurement accounts for moving centered edges.
    let lower = 0;
    let upper = width;
    while (upper - lower > 0.25) {
      const candidate = (lower + upper) / 2;
      if (fitsWidth(candidate)) lower = candidate;
      else upper = candidate;
    }
    width = lower;
  }
  frame.style.minWidth = width + 'px';
  return true;
}

function setParallaxStageHeight(frame: HTMLElement, stage: HTMLElement) {
  const height = frame.style.height || '100%';
  stage.style.height = frame.classList.contains('sp-native-parallax') ? `calc(${height} + 200vh)` : frame.style.height;
}

function installParallaxSizing(frame: HTMLElement, stage: HTMLElement, { slotHeight, creativeHeight }: ParallaxSizes, onGeometryChange?: () => void): { refresh: () => void, destroy: () => void } {
  const win = frame.ownerDocument.defaultView || window;
  let intrinsicWidth = false;
  let destroyed = false;
  let targets: HTMLElement[] = [];
  let animationFrame: number | null = null;
  function computeHeight() {
    const dims = getWinDimensions();
    const viewport = dims.innerHeight || dims.document?.documentElement?.clientHeight || 0;
    // A slot height equal to the creative height means the slot follows the viewport.
    if (!slotHeight || (creativeHeight > 0 && Math.abs(slotHeight - creativeHeight) <= 1)) return viewport;
    return viewport > 0 ? Math.min(slotHeight, viewport) : slotHeight;
  }
  function applySize() {
    if (destroyed) return;
    const height = computeHeight();
    if (height > 0) {
      frame.style.height = height + 'px';
      setParallaxStageHeight(frame, stage);
    }
    const rect = frame.getClientRects()[0];
    if (rect && (!rect.width || intrinsicWidth)) intrinsicWidth = fitIntrinsicParallaxWidth(frame, win);
    if (onGeometryChange) onGeometryChange();
  }
  function onViewportChange() {
    // Window dimensions are cached briefly; a viewport change must read the new height.
    resetWinDimensions();
    applySize();
  }
  function scheduleSize() {
    if (destroyed || animationFrame != null) return;
    // Defer writes outside ResizeObserver delivery to avoid resize feedback-loop errors.
    animationFrame = win.requestAnimationFrame(() => {
      animationFrame = null;
      applySize();
    });
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleSize) : null;
  function refresh() {
    if (destroyed) return;
    const next: HTMLElement[] = [];
    for (let element = frame; element; element = element.parentElement) next.push(element);
    if (observer && (next.length !== targets.length || next.some((element, index) => element !== targets[index]))) {
      if (targets.length) observer.disconnect();
      next.forEach(element => observer.observe(element));
    }
    targets = next;
    applySize();
  }
  try {
    refresh();
  } catch (error) {
    if (observer) observer.disconnect();
    throw error;
  }
  win.addEventListener('resize', onViewportChange, { passive: true });
  win.addEventListener('orientationchange', onViewportChange, { passive: true });
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    win.removeEventListener('resize', onViewportChange);
    win.removeEventListener('orientationchange', onViewportChange);
    if (animationFrame != null) win.cancelAnimationFrame(animationFrame);
    if (observer) observer.disconnect();
    targets = [];
  }
  return { refresh, destroy };
}

function canUseNativeParallax(win: typeof window, doc: Document, parents: HTMLElement[]): boolean {
  const css = win.CSS;
  if (!css || typeof css.supports !== 'function' || !css.supports('overflow', 'clip') || !css.supports('position', 'sticky')) return false;
  // eslint-disable-next-line prebid/no-synchronous-layout-read -- root and ancestor overflow, containment and transforms decide whether sticky positioning works
  const rootStyle = win.getComputedStyle(doc.documentElement);
  const bodyOverflowPropagates = rootStyle.overflowX === 'visible' && rootStyle.overflowY === 'visible';
  return parents.every(parent => {
    // eslint-disable-next-line prebid/no-synchronous-layout-read -- as above, for each ancestor
    const style = win.getComputedStyle(parent);
    const root = parent === doc.documentElement || (parent === doc.body && bodyOverflowPropagates);
    const containment = style.getPropertyValue('contain');
    return (root || [style.overflowX, style.overflowY].every(value => value === 'visible' || value === 'clip')) &&
      (!containment || containment === 'none') &&
      style.transform === 'none' && style.perspective === 'none' && style.filter === 'none' &&
      ['translate', 'rotate', 'scale'].every(property => {
        const value = style.getPropertyValue(property);
        return !value || value === 'none';
      }) && !/transform|perspective|translate|rotate|scale/.test(style.willChange);
  });
}

/**
 * WebKit can ignore a fixed frame's aperture during hit testing and visibility measurement.
 * Sticky positioning keeps vertical motion native where the root scrollport is reachable.
 * Other layouts retain the physically clipped, event-driven absolute frame.
 */
function installSafariPointerGuard(frame: HTMLElement, stage: HTMLElement, iframe: HTMLIFrameElement): { refresh: () => void, destroy: () => void } | null {
  if (!isSafariBrowser() && !isChromeIOSBrowser()) return null;
  const win = frame.ownerDocument.defaultView || window;
  const doc = frame.ownerDocument;
  // eslint-disable-next-line prebid/no-synchronous-layout-read -- used only as the target of scroll and resize events
  const visualViewport = win.visualViewport;
  const viewport = visualViewport && typeof visualViewport.addEventListener === 'function' &&
    typeof visualViewport.removeEventListener === 'function' ? visualViewport : null;
  frame.classList.add('sp-pointer-guarded');
  let animationFrame: number | null = null;
  let observer: IntersectionObserver | null = null;
  let layoutObserver: MutationObserver | null = null;
  let parents: HTMLElement[] = [];
  let nativeMotion = false;
  let visible = typeof IntersectionObserver !== 'function';
  let destroyed = false;
  function alignCreative() {
    // Auction-cached rectangles become stale on scroll; read only this owned element's live rect.
    const rect = frame.getClientRects()[0];
    if (rect) {
      const left = -rect.left + 'px';
      if (nativeMotion) {
        if (iframe.style.marginLeft !== left) iframe.style.marginLeft = left;
      } else {
        const top = -rect.top + 'px';
        if (iframe.style.left !== left) iframe.style.left = left;
        if (iframe.style.top !== top) iframe.style.top = top;
      }
    }
  }
  function updateAlignment() {
    animationFrame = null;
    if (destroyed || !visible || doc.hidden) return;
    alignCreative();
  }
  function scheduleAlignment() {
    if (destroyed || !visible || doc.hidden || animationFrame != null) return;
    animationFrame = win.requestAnimationFrame(updateAlignment);
  }
  function refresh() {
    if (destroyed) return;
    const next: HTMLElement[] = [];
    for (let parent = frame.parentElement; parent; parent = parent.parentElement) next.push(parent);
    if (layoutObserver && (next.length !== parents.length || next.some((parent, index) => parent !== parents[index]))) {
      if (parents.length) layoutObserver.disconnect();
      next.forEach(parent => layoutObserver.observe(parent, { attributes: true }));
    }
    parents = next;
    const useNativeMotion = canUseNativeParallax(win, doc, parents);
    if (useNativeMotion !== nativeMotion) {
      nativeMotion = useNativeMotion;
      frame.classList.toggle('sp-native-parallax', nativeMotion);
      ['left', 'top', 'margin-left'].forEach(property => iframe.style.removeProperty(property));
      alignCreative();
    }
    setParallaxStageHeight(frame, stage);
    scheduleAlignment();
  }
  function syncVisibility() {
    if (destroyed) return;
    if (!visible || doc.hidden) {
      if (animationFrame != null) win.cancelAnimationFrame(animationFrame);
      animationFrame = null;
    } else scheduleAlignment();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (animationFrame != null) win.cancelAnimationFrame(animationFrame);
    if (observer) observer.disconnect();
    if (layoutObserver) layoutObserver.disconnect();
    doc.removeEventListener('visibilitychange', syncVisibility);
    win.removeEventListener('scroll', scheduleAlignment, true);
    doc.removeEventListener('load', refresh, true);
    if (viewport) {
      viewport.removeEventListener('scroll', scheduleAlignment);
      viewport.removeEventListener('resize', scheduleAlignment);
    }
    parents = [];
    frame.classList.remove('sp-pointer-guarded');
    frame.classList.remove('sp-native-parallax');
    setParallaxStageHeight(frame, stage);
    iframe.style.removeProperty('left');
    iframe.style.removeProperty('top');
    iframe.style.removeProperty('margin-left');
  }
  try {
    alignCreative();
    if (typeof MutationObserver === 'function') layoutObserver = new MutationObserver(refresh);
    refresh();
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(entries => {
        visible = entries.some(entry => entry.target === frame && entry.isIntersecting);
        syncVisibility();
      }, { rootMargin: '100px 0px' });
      observer.observe(frame);
    }
    doc.addEventListener('visibilitychange', syncVisibility);
    // Capture also observes nested scroll containers without attaching listeners to publisher nodes.
    win.addEventListener('scroll', scheduleAlignment, { passive: true, capture: true });
    doc.addEventListener('load', refresh, true);
    if (viewport) {
      viewport.addEventListener('scroll', scheduleAlignment, { passive: true });
      viewport.addEventListener('resize', scheduleAlignment, { passive: true });
    }
    syncVisibility();
  } catch (error) {
    destroy();
    throw error;
  }
  return { refresh, destroy };
}
