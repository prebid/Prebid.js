import {createIframe, deepAccess, inIframe, insertElement, logError, logWarn, replaceMacros} from './utils.js';
import * as events from './events.js';
import CONSTANTS from './constants.json';
import {config} from './config.js';
import {executeRenderer, isRendererRequired} from './Renderer.js';
import {VIDEO} from './mediaTypes.js';
import {auctionManager} from './auctionManager.js';
import {getGlobal} from './prebidGlobal.js';
import {getCreativeRenderer} from './creativeRenderers.js';

const {AD_RENDER_FAILED, AD_RENDER_SUCCEEDED, STALE_RENDER, BID_WON} = CONSTANTS.EVENTS;
const {EXCEPTION} = CONSTANTS.AD_RENDER_FAILED_REASON;

/**
 * Emit the AD_RENDER_FAILED event.
 *
 * @param reason one of the values in CONSTANTS.AD_RENDER_FAILED_REASON
 * @param message failure description
 * @param bid? bid response object that failed to render
 * @param id? adId that failed to render
 */
export function emitAdRenderFail({ reason, message, bid, id }) {
  const data = { reason, message };
  if (bid) data.bid = bid;
  if (id) data.adId = id;

  logError(`Error rendering ad (id: ${id}): ${message}`);
  events.emit(AD_RENDER_FAILED, data);
}

/**
 * Emit the AD_RENDER_SUCCEEDED event.
 * (Note: Invocation of this function indicates that the render function did not generate an error, it does not guarantee that tracking for this event has occurred yet.)
 * @param doc document object that was used to `.write` the ad. Should be `null` if unavailable (e.g. for documents in
 * a cross-origin frame).
 * @param bid bid response object for the ad that was rendered
 * @param id adId that was rendered.
 */
export function emitAdRenderSucceeded({ doc, bid, id }) {
  const data = { doc };
  if (bid) data.bid = bid;
  if (id) data.adId = id;

  events.emit(AD_RENDER_SUCCEEDED, data);
}

export function handleCreativeEvent(data, bidResponse) {
  switch (data.event) {
    case CONSTANTS.EVENTS.AD_RENDER_FAILED:
      emitAdRenderFail({
        bid: bidResponse,
        id: bidResponse.adId,
        reason: data.info.reason,
        message: data.info.message
      });
      break;
    case CONSTANTS.EVENTS.AD_RENDER_SUCCEEDED:
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

const HANDLERS = {
  [CONSTANTS.MESSAGES.EVENT]: handleCreativeEvent
}

export function handleCreativeMessage(type, data, bidResponse, handlers = HANDLERS) {
  if (handlers.hasOwnProperty(type)) {
    handlers[type](data, bidResponse);
  }
}

export function handleRender(renderFn, {adId, options, bidResponse}) {
  if (bidResponse == null) {
    emitAdRenderFail({
      reason: CONSTANTS.AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
      message: `Cannot find ad '${adId}'`,
      id: adId
    });
    return;
  }
  if (bidResponse.status === CONSTANTS.BID_STATUS.RENDERED) {
    logWarn(`Ad id ${adId} has been rendered before`);
    events.emit(STALE_RENDER, bidResponse);
    if (deepAccess(config.getConfig('auctionOptions'), 'suppressStaleRender')) {
      return;
    }
  }
  try {
    const {adId, ad, adUrl, width, height, renderer, cpm, originalCpm, mediaType} = bidResponse;
    // rendering for outstream safeframe
    if (isRendererRequired(renderer)) {
      executeRenderer(renderer, bidResponse);
    } else if (adId) {
      if (mediaType === VIDEO) {
        emitAdRenderFail({
          reason: CONSTANTS.AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
          message: 'Cannot render video ad',
          bid: bidResponse,
          id: adId
        });
        return;
      }
      const repl = {
        AUCTION_PRICE: originalCpm || cpm,
        CLICKTHROUGH: options?.clickUrl || ''
      };
      renderFn({
        ad: replaceMacros(ad, repl),
        adUrl: replaceMacros(adUrl, repl),
        adId,
        width,
        height
      });
    }
  } catch (e) {
    emitAdRenderFail({
      reason: CONSTANTS.AD_RENDER_FAILED_REASON.EXCEPTION,
      message: e.message,
      id: adId,
      bid: bidResponse
    });
    return;
  }
  // save winning bids
  auctionManager.addWinningBid(bidResponse);

  events.emit(BID_WON, bidResponse);
}

export function renderAdDirect(doc, adId, options) {
  let bid;
  function fail(reason, message) {
    emitAdRenderFail(Object.assign({id: adId, bid}, {reason, message}));
  }
  function renderFn(adData) {
    if (adData.ad) {
      doc.write(adData.ad);
      doc.close();
    } else {
      getCreativeRenderer().then(render => render(adData, {sendMessage: (type, data) => handleCreativeMessage(type, data, bid), mkFrame: createIframe}, doc.defaultView))
    }
    if (doc.defaultView && doc.defaultView.frameElement) {
      doc.defaultView.frameElement.width = adData.width;
      doc.defaultView.frameElement.height = adData.height;
    }
    // TODO: this is almost certainly the wrong way to do this
    const creativeComment = document.createComment(`Creative ${bid.creativeId} served by ${bid.bidder} Prebid.js Header Bidding`);
    insertElement(creativeComment, doc, 'html');
  }
  try {
    if (!adId || !doc) {
      fail(CONSTANTS.AD_RENDER_FAILED_REASON.MISSING_DOC_OR_ADID, `missing ${adId ? 'doc' : 'adId'}`);
    } else {
      bid = auctionManager.findBidByAdId(adId);

      if (FEATURES.VIDEO) {
        // TODO: could the video module implement this as a custom renderer, rather than a special case in here?
        const adUnit = bid && auctionManager.index.getAdUnit(bid);
        const videoModule = getGlobal().videoModule;
        if (adUnit?.video && videoModule) {
          videoModule.renderBid(adUnit.video.divId, bid);
          return;
        }
      }

      if ((doc === document && !inIframe())) {
        fail(CONSTANTS.AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT, `renderAd was prevented from writing to the main document.`);
      } else {
        handleRender(renderFn, {adId, options: {clickUrl: options?.clickThrough}, bidResponse: bid});
      }
    }
  } catch (e) {
    fail(EXCEPTION, e.message);
  }
}
