import {
  createIframe,
  createInvisibleIframe,
  inIframe,
  insertElement,
  logError,
  logWarn,
  replaceMacros,
  triggerPixel
} from './utils.js';
import * as events from './events.js';
import {AD_RENDER_FAILED_REASON, BID_STATUS, EVENTS, MESSAGES, PB_LOCATOR} from './constants.js';
import {config} from './config.js';
import {executeRenderer, isRendererRequired} from './Renderer.js';
import {VIDEO} from './mediaTypes.js';
import {auctionManager} from './auctionManager.js';
import {getCreativeRenderer} from './creativeRenderers.js';
import {hook} from './hook.js';
import {fireNativeTrackers} from './native.js';
import {PbPromise} from './utils/promise.js';
import adapterManager from './adapterManager.js';
import {useMetrics} from './utils/perfMetrics.js';
import {filters} from './targeting.js';
import {EVENT_TYPE_WIN, parseEventTrackers, TRACKER_METHOD_IMG} from './eventTrackers.js';
import type {Bid} from "./bidfactory.ts";

const { AD_RENDER_FAILED, AD_RENDER_SUCCEEDED, STALE_RENDER, BID_WON, EXPIRED_RENDER } = EVENTS;
const { EXCEPTION } = AD_RENDER_FAILED_REASON;

declare module './events' {
  interface Events {
    /**
     * Fired when a bid is rendered (successfully or not).
     */
    [EVENTS.BID_WON]: [Bid];
    /**
     * Fired when a bid failed to render.
     */
    [EVENTS.AD_RENDER_FAILED]: [AdRenderFailedData];
    /**
     * Fired when a bid was rendered successfully.
     */
    [EVENTS.AD_RENDER_SUCCEEDED]: [AdRenderSucceededData];
    /**
     * Fired when a bid that was previously rendered is rendered again.
     */
    [EVENTS.STALE_RENDER]: [Bid];
    /**
     * Fired when an expired bid is rendered. A bid expires after `.ttl` seconds from
     * the time it was received.
     */
    [EVENTS.EXPIRED_RENDER]: [Bid];

    [EVENTS.BROWSER_INTERVENTION]: [BrowserInterventionData];
  }
}

export const getBidToRender = hook('sync', function (adId, forRender = true, override = PbPromise.resolve()) {
  return override
    .then(bid => bid ?? auctionManager.findBidByAdId(adId))
    .catch(() => {})
})

export const markWinningBid = hook('sync', function (bid) {
  (parseEventTrackers(bid.eventtrackers)[EVENT_TYPE_WIN]?.[TRACKER_METHOD_IMG] || [])
    .forEach(url => triggerPixel(url));
  events.emit(BID_WON, bid);
  auctionManager.addWinningBid(bid);
})

type AdRenderFailedData = {
  /**
   * Failure reason.
   */
  reason: (typeof AD_RENDER_FAILED_REASON)[keyof typeof AD_RENDER_FAILED_REASON];
  /**
   * failure description
   */
  message: string;
  /**
   * The bid that failed to render.
   */
  bid?: Bid;
  /**
   * Ad ID of the bid that failed to render.
   */
  adId?: string;
}

/**
 * Emit the AD_RENDER_FAILED event.
 */
export function emitAdRenderFail({ reason, message, bid, id }: Omit<AdRenderFailedData, 'adId'> & { id?: string }) {
  const data: AdRenderFailedData = { reason, message };
  if (bid) {
    data.bid = bid;
    data.adId = bid.adId;
  }
  if (id) data.adId = id;

  logError(`Error rendering ad (id: ${id}): ${message}`);
  events.emit(AD_RENDER_FAILED, data);
}

type AdRenderSucceededData = {
  /**
   * document object that was used to `.write` the ad. Should be `null` if unavailable (e.g. for documents in
   * a cross-origin frame).
   */
  doc: Document | null;
  /**
   * The bid that was rendered.
   */
  bid: Bid;
  /**
   * Ad ID of the bid that was rendered.
   */
  adId: string;
}
/**
 * Emit the AD_RENDER_SUCCEEDED event.
 * (Note: Invocation of this function indicates that the render function did not generate an error, it does not guarantee that tracking for this event has occurred yet.)
 */
export function emitAdRenderSucceeded({ doc, bid, id }) {
  const data: AdRenderSucceededData = { doc, bid, adId: id};

  adapterManager.callAdRenderSucceededBidder(bid.adapterCode || bid.bidder, bid);

  events.emit(AD_RENDER_SUCCEEDED, data);
}

/**
 * Data for the BROWSER_INTERVENTION event.
 */
type BrowserInterventionData = {
  bid: Bid;
  adId: string;
  intervention: any;
}
/**
 * Emit the BROWSER_INTERVENTION event.
 * This event is fired when the browser blocks an ad from rendering, typically due to ad blocking software or browser security features.
 */
export function emitBrowserIntervention(data: BrowserInterventionData) {
  const { bid, intervention } = data;
  adapterManager.callOnInterventionBidder(bid.adapterCode || bid.bidder, bid, intervention);
  events.emit(EVENTS.BROWSER_INTERVENTION, data);
}

export function handleCreativeEvent(data, bidResponse) {
  switch (data.event) {
    case EVENTS.AD_RENDER_FAILED:
      emitAdRenderFail({
        bid: bidResponse,
        id: bidResponse.adId,
        reason: data.info.reason,
        message: data.info.message
      });
      break;
    case EVENTS.AD_RENDER_SUCCEEDED:
      emitAdRenderSucceeded({
        doc: null,
        bid: bidResponse,
        id: bidResponse.adId
      });
      break;
    case EVENTS.BROWSER_INTERVENTION:
      emitBrowserIntervention({
        bid: bidResponse,
        adId: bidResponse.adId,
        intervention: data.intervention
      });
      break;
    default:
      logError(`Received event request for unsupported event: '${data.event}' (adId: '${bidResponse.adId}')`);
  }
}

export function handleNativeMessage(data, bidResponse, {resizeFn, fireTrackers = fireNativeTrackers}) {
  switch (data.action) {
    case 'resizeNativeHeight':
      resizeFn(data.width, data.height);
      break;
    default:
      fireTrackers(data, bidResponse);
  }
}

const HANDLERS: any = {
  [MESSAGES.EVENT]: handleCreativeEvent
}

if (FEATURES.NATIVE) {
  HANDLERS[MESSAGES.NATIVE] = handleNativeMessage;
}

function creativeMessageHandler(deps) {
  return function (type, data, bidResponse) {
    if (HANDLERS.hasOwnProperty(type)) {
      HANDLERS[type](data, bidResponse, deps);
    }
  }
}

type RenderOptions = {
  clickUrl?: string;
}

export const getRenderingData = hook('sync', function (bidResponse: Bid, options?: RenderOptions): Record<string, any> {
  const {ad, adUrl, cpm, originalCpm, width, height, instl} = bidResponse
  const repl = {
    AUCTION_PRICE: originalCpm || cpm,
    CLICKTHROUGH: options?.clickUrl || ''
  }
  return {
    ad: replaceMacros(ad, repl),
    adUrl: replaceMacros(adUrl, repl),
    width,
    height,
    instl
  };
})

export const doRender = hook('sync', function({renderFn, resizeFn, bidResponse, options, doc, isMainDocument = doc === document && !inIframe()}) {
  const videoBid = (FEATURES.VIDEO && bidResponse.mediaType === VIDEO)
  if (isMainDocument || videoBid) {
    emitAdRenderFail({
      reason: AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
      message: videoBid ? 'Cannot render video ad without a renderer' : `renderAd was prevented from writing to the main document.`,
      bid: bidResponse,
      id: bidResponse.adId
    });
    return;
  }
  const data = getRenderingData(bidResponse, options);
  renderFn(Object.assign({adId: bidResponse.adId}, data));
  const {width, height} = data;
  if ((width ?? height) != null) {
    resizeFn(width, height);
  }
});

doRender.before(function (next, args) {
  // run renderers from a high priority hook to allow the video module to insert itself between this and "normal" rendering.
  const {bidResponse, doc} = args;
  if (isRendererRequired(bidResponse.renderer)) {
    executeRenderer(bidResponse.renderer, bidResponse, doc);
    emitAdRenderSucceeded({doc, bid: bidResponse, id: bidResponse.adId})
    next.bail();
  } else {
    next(args);
  }
}, 100)

export function handleRender({renderFn, resizeFn, adId, options, bidResponse, doc}) {
  deferRendering(bidResponse, () => {
    if (bidResponse == null) {
      emitAdRenderFail({
        reason: AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
        message: `Cannot find ad '${adId}'`,
        id: adId
      });
      return;
    }
    if (bidResponse.status === BID_STATUS.RENDERED) {
      logWarn(`Ad id ${adId} has been rendered before`);
      events.emit(STALE_RENDER, bidResponse);
      if (config.getConfig('auctionOptions')?.suppressStaleRender) {
        return;
      }
    }
    if (!filters.isBidNotExpired(bidResponse)) {
      logWarn(`Ad id ${adId} has been expired`);
      events.emit(EXPIRED_RENDER, bidResponse);
      if (config.getConfig('auctionOptions')?.suppressExpiredRender) {
        return;
      }
    }

    try {
      doRender({renderFn, resizeFn, bidResponse, options, doc});
    } catch (e) {
      emitAdRenderFail({
        reason: AD_RENDER_FAILED_REASON.EXCEPTION,
        message: e.message,
        id: adId,
        bid: bidResponse
      });
    }
  })
}

export function markBidAsRendered(bidResponse) {
  const metrics = useMetrics(bidResponse.metrics);
  metrics.checkpoint('bidRender');
  metrics.timeBetween('bidWon', 'bidRender', 'render.deferred');
  metrics.timeBetween('auctionEnd', 'bidRender', 'render.pending');
  metrics.timeBetween('requestBids', 'bidRender', 'render.e2e');
  bidResponse.status = BID_STATUS.RENDERED;
}

const DEFERRED_RENDER = new WeakMap();
const WINNERS = new WeakSet();

export function deferRendering(bidResponse, renderFn) {
  if (bidResponse == null) {
    // if the bid is missing, let renderFn deal with it now
    renderFn();
    return;
  }
  DEFERRED_RENDER.set(bidResponse, renderFn);
  if (!bidResponse.deferRendering) {
    renderIfDeferred(bidResponse);
  }
  markWinner(bidResponse);
}

export function markWinner(bidResponse) {
  if (!WINNERS.has(bidResponse)) {
    WINNERS.add(bidResponse);
    markWinningBid(bidResponse);
  }
}

export function renderIfDeferred(bidResponse) {
  const renderFn = DEFERRED_RENDER.get(bidResponse);
  if (renderFn) {
    renderFn();
    markBidAsRendered(bidResponse);
    DEFERRED_RENDER.delete(bidResponse);
  }
}

export function renderAdDirect(doc, adId, options) {
  let bid;
  function fail(reason, message) {
    emitAdRenderFail(Object.assign({id: adId, bid}, {reason, message}));
  }
  function resizeFn(width, height) {
    const frame = doc.defaultView?.frameElement;
    if (frame) {
      if (width) {
        frame.width = width;
        frame.style.width && (frame.style.width = `${width}px`);
      }
      if (height) {
        frame.height = height;
        frame.style.height && (frame.style.height = `${height}px`);
      }
    }
  }
  const messageHandler = creativeMessageHandler({resizeFn});

  function renderFn(adData) {
    getCreativeRenderer(bid)
      .then(render => render(adData, {
        sendMessage: (type, data) => messageHandler(type, data, bid),
        mkFrame: createIframe,
      }, doc.defaultView))
      .then(
        () => emitAdRenderSucceeded({doc, bid, id: bid.adId}),
        (e) => {
          fail(e?.reason || AD_RENDER_FAILED_REASON.EXCEPTION, e?.message)
          e?.stack && logError(e);
        }
      );
    // TODO: this is almost certainly the wrong way to do this
    const creativeComment = document.createComment(`Creative ${bid.creativeId} served by ${bid.bidder} Prebid.js Header Bidding`);
    insertElement(creativeComment, doc, 'html');
  }
  try {
    if (!adId || !doc) {
      fail(AD_RENDER_FAILED_REASON.MISSING_DOC_OR_ADID, `missing ${adId ? 'doc' : 'adId'}`);
    } else {
      getBidToRender(adId).then(bidResponse => {
        bid = bidResponse;
        handleRender({renderFn, resizeFn, adId, options: {clickUrl: options?.clickThrough}, bidResponse, doc});
      });
    }
  } catch (e) {
    fail(EXCEPTION, e.message);
  }
}

/**
 * Insert an invisible, named iframe that can be used by creatives to locate the window Prebid is running in
 * (by looking for one that has `.frames[PB_LOCATOR]` defined).
 * This is necessary because in some situations creatives may be rendered inside nested iframes - Prebid is not necessarily
 * in the immediate parent window.
 */
export function insertLocatorFrame() {
  if (!window.frames[PB_LOCATOR]) {
    if (!document.body) {
      window.requestAnimationFrame(insertLocatorFrame);
    } else {
      const frame = createInvisibleIframe();
      frame.name = PB_LOCATOR;
      document.body.appendChild(frame);
    }
  }
}
