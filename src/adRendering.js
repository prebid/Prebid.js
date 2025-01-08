import {
  createIframe,
  createInvisibleIframe,
  inIframe,
  insertElement,
  logError,
  logWarn,
  replaceMacros
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
import {GreedyPromise} from './utils/promise.js';
import adapterManager from './adapterManager.js';
import {useMetrics} from './utils/perfMetrics.js';
import {filters} from './targeting.js';

const { AD_RENDER_FAILED, AD_RENDER_SUCCEEDED, STALE_RENDER, BID_WON, EXPIRED_RENDER } = EVENTS;
const { EXCEPTION } = AD_RENDER_FAILED_REASON;

export const getBidToRender = hook('sync', function (adId, forRender = true, override = GreedyPromise.resolve()) {
  return override
    .then(bid => bid ?? auctionManager.findBidByAdId(adId))
    .catch(() => {})
})

export const markWinningBid = hook('sync', function (bid) {
  events.emit(BID_WON, bid);
  auctionManager.addWinningBid(bid);
})

/**
 * Emit the AD_RENDER_FAILED event.
 *
 * @param {Object} data
 * @param data.reason one of the values in AD_RENDER_FAILED_REASON
 * @param data.message failure description
 * @param [data.bid] bid response object that failed to render
 * @param [data.id] adId that failed to render
 */
export function emitAdRenderFail({ reason, message, bid, id }) {
  const data = { reason, message };
  if (bid) {
    data.bid = bid;
    data.adId = bid.adId;
  }
  if (id) data.adId = id;

  logError(`Error rendering ad (id: ${id}): ${message}`);
  events.emit(AD_RENDER_FAILED, data);
}

/**
 * Emit the AD_RENDER_SUCCEEDED event.
 * (Note: Invocation of this function indicates that the render function did not generate an error, it does not guarantee that tracking for this event has occurred yet.)
 * @param {Object} data
 * @param data.doc document object that was used to `.write` the ad. Should be `null` if unavailable (e.g. for documents in
 * a cross-origin frame).
 * @param [data.bid] bid response object for the ad that was rendered
 * @param [data.id] adId that was rendered.
 */
export function emitAdRenderSucceeded({ doc, bid, id }) {
  const data = { doc };
  if (bid) data.bid = bid;
  if (id) data.adId = id;

  adapterManager.callAdRenderSucceededBidder(bid.adapterCode || bid.bidder, bid);

  events.emit(AD_RENDER_SUCCEEDED, data);
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

const HANDLERS = {
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

export const getRenderingData = hook('sync', function (bidResponse, options) {
  const {ad, adUrl, cpm, originalCpm, width, height} = bidResponse
  const repl = {
    AUCTION_PRICE: originalCpm || cpm,
    CLICKTHROUGH: options?.clickUrl || ''
  }
  return {
    ad: replaceMacros(ad, repl),
    adUrl: replaceMacros(adUrl, repl),
    width,
    height
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
    if (doc.defaultView && doc.defaultView.frameElement) {
      width && (doc.defaultView.frameElement.width = width);
      height && (doc.defaultView.frameElement.height = height);
    }
  }
  const messageHandler = creativeMessageHandler({resizeFn});
  function renderFn(adData) {
    if (adData.ad) {
      doc.write(adData.ad);
      doc.close();
      emitAdRenderSucceeded({doc, bid, id: bid.adId});
    } else {
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
    }
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
