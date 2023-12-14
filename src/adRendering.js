import {deepAccess, logError, logWarn, replaceMacros} from './utils.js';
import * as events from './events.js';
import constants from './constants.json';
import {config} from './config.js';
import {executeRenderer, isRendererRequired} from './Renderer.js';
import {VIDEO} from './mediaTypes.js';
import {auctionManager} from './auctionManager.js';

const {AD_RENDER_FAILED, AD_RENDER_SUCCEEDED, STALE_RENDER, BID_WON} = constants.EVENTS;

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

export function handleRender(renderFn, {adId, options, bidResponse}) {
  if (bidResponse == null) {
    emitAdRenderFail({
      reason: constants.AD_RENDER_FAILED_REASON.CANNOT_FIND_AD,
      message: `Cannot find ad '${adId}'`,
      id: adId
    });
    return;
  }
  if (bidResponse.status === constants.BID_STATUS.RENDERED) {
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
          reason: constants.AD_RENDER_FAILED_REASON.PREVENT_WRITING_ON_MAIN_DOCUMENT,
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
      reason: constants.AD_RENDER_FAILED_REASON.EXCEPTION,
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
