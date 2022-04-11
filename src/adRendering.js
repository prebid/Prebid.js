import {logError} from './utils.js';
import * as events from './events.js';
import CONSTANTS from './constants.json';

const {AD_RENDER_FAILED, AD_RENDER_SUCCEEDED} = CONSTANTS.EVENTS;

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

  logError(message);
  events.emit(AD_RENDER_FAILED, data);
}

/**
 * Emit the AD_RENDER_SUCCEEDED event.
 *
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
