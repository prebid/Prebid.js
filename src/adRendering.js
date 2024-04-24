import {createIframe, deepAccess, inIframe, insertElement, logError, logWarn, replaceMacros} from './utils.js';
import * as events from './events.js';
import { AD_RENDER_FAILED_REASON, BID_STATUS, EVENTS, MESSAGES } from './constants.js';
import {config} from './config.js';
import {executeRenderer, isRendererRequired} from './Renderer.js';
import {VIDEO} from './mediaTypes.js';
import {auctionManager} from './auctionManager.js';
import {getCreativeRenderer} from './creativeRenderers.js';
import {hook} from './hook.js';
import {fireNativeTrackers} from './native.js';
import {GreedyPromise} from './utils/promise.js';

const { AD_RENDER_FAILED, AD_RENDER_SUCCEEDED, STALE_RENDER, BID_WON } = EVENTS;
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

export const doRender = hook('sync', function({renderFn, resizeFn, bidResponse, options}) {
  if (FEATURES.VIDEO && bidResponse.mediaType === VIDEO) {
    emitAdRenderFail({
      reason: AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
      message: 'Cannot render video ad',
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
    if (deepAccess(config.getConfig('auctionOptions'), 'suppressStaleRender')) {
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
  markWinningBid(bidResponse);
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
      emitAdRenderSucceeded({doc, bid, adId: bid.adId});
    } else {
      getCreativeRenderer(bid)
        .then(render => render(adData, {
          sendMessage: (type, data) => messageHandler(type, data, bid),
          mkFrame: createIframe,
        }, doc.defaultView))
        .then(
          () => emitAdRenderSucceeded({doc, bid, adId: bid.adId}),
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
      if ((doc === document && !inIframe())) {
        fail(AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT, `renderAd was prevented from writing to the main document.`);
      } else {
        getBidToRender(adId).then(bidResponse => {
          bid = bidResponse;
          handleRender({renderFn, resizeFn, adId, options: {clickUrl: options?.clickThrough}, bidResponse, doc});
        });
      }
    }
  } catch (e) {
    fail(EXCEPTION, e.message);
  }
}
