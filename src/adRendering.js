import {logError} from './utils.js';
import events from './events.js';
import CONSTANTS from './constants.json';

const {AD_RENDER_FAILED, AD_RENDER_SUCCEEDED} = CONSTANTS.EVENTS;

export function emitAdRenderFail({ reason, message, bid, id }) {
  const data = { reason, message };
  if (bid) data.bid = bid;
  if (id) data.adId = id;

  logError(message);
  events.emit(AD_RENDER_FAILED, data);
}

export function emitAdRenderSucceeded({ doc, bid, id }) {
  const data = { doc };
  if (bid) data.bid = bid;
  if (id) data.adId = id;

  events.emit(AD_RENDER_SUCCEEDED, data);
}
