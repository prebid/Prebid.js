import { config } from '../src/config.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';
import { politeTriggerPixel } from '../src/utils.js';

const NAME = 'bidClickTracking';
const tracked = new Map();
let enabled = false;
let fireTrackers = false;
let hovered = null;
let listening = false;
let desktopFallback = false;
const observed = new Set();

export function validClickUrl(url) {
  if (typeof url !== 'string' || /%%|\$\{/.test(url)) return false;
  try {
    return new URL(url).protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export function hasClickthroughMacro(bid) {
  return [bid.ad, bid.adUrl].some(value => typeof value === 'string' && value.includes('${CLICKTHROUGH}'));
}

function eligible(bid) {
  return bid?.mediaType === 'banner' && !hasClickthroughMacro(bid) &&
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function clearSlot(slot) {
  const state = tracked.get(slot);
  if (!state) return;
  slot.removeEventListener('pointerenter', state.enter);
  slot.removeEventListener('pointerleave', state.leave);
  tracked.delete(slot);
  if (hovered === state) hovered = null;
}

function clearAll() {
  Array.from(tracked.keys()).forEach(clearSlot);
}

function onBlur() {
  const state = hovered;
  if (!desktopFallback || !state || observed.has(state.bid.adId) || !enabled || state.fired || !state.slot.isConnected || document.visibilityState === 'hidden') return;
  // An iframe can become the document's active element when clicked. Do not
  // infer clicks if focus went to another control, tab or browser window.
  const active = document.activeElement;
  if (!active || active.tagName !== 'IFRAME' || !state.slot.contains(active)) return;
  state.fired = true;
  events.emit(EVENTS.BID_CLICK_INFERRED, {
    bid: state.bid,
    adId: state.bid.adId,
    adUnitCode: state.bid.adUnitCode,
    bidder: state.bid.bidder,
    method: 'iframeFocus'
  });
  if (fireTrackers && validClickUrl(state.bid.clickUrl)) {
    politeTriggerPixel(state.bid.clickUrl);
  }
}

function onClick({ bid }) {
  if (!enabled || !bid || observed.has(bid.adId)) return;
  observed.add(bid.adId);
  for (const [slot, state] of tracked) {
    if (state.bid.adId === bid.adId) clearSlot(slot);
  }
  if (fireTrackers && !hasClickthroughMacro(bid) && validClickUrl(bid.clickUrl)) politeTriggerPixel(bid.clickUrl);
}

function onRender({ bid }) {
  if (!enabled || !desktopFallback || !eligible(bid)) return;
  const slot = getAdUnitElement(bid);
  if (!slot) return;
  clearSlot(slot);
  const state = {
    bid, slot, fired: false,
    enter: null,
    leave: null
  };
  state.enter = () => { hovered = state; };
  state.leave = () => { if (hovered === state) hovered = null; };
  slot.addEventListener('pointerenter', state.enter);
  slot.addEventListener('pointerleave', state.leave);
  tracked.set(slot, state);
}

function onRequest({ adUnitCodes, adUnits } = {}) {
  const codes = adUnitCodes || adUnits?.map(unit => unit.code);
  // Each auction can replace previously rendered creative instances.
  observed.clear();
  for (const [slot, state] of tracked) {
    if (!codes || codes.includes(state.bid.adUnitCode)) clearSlot(slot);
  }
}

function enable() {
  if (listening) return;
  listening = true;
  window.addEventListener('blur', onBlur);
  events.on(EVENTS.AD_RENDER_SUCCEEDED, onRender);
  events.on(EVENTS.BID_CLICK, onClick);
  events.on(EVENTS.BEFORE_REQUEST_BIDS, onRequest);
}

function disable() {
  if (!listening) return;
  listening = false;
  window.removeEventListener('blur', onBlur);
  events.off(EVENTS.AD_RENDER_SUCCEEDED, onRender);
  events.off(EVENTS.BID_CLICK, onClick);
  observed.clear();
  events.off(EVENTS.BEFORE_REQUEST_BIDS, onRequest);
  clearAll();
}

config.getConfig(NAME, cfg => {
  const settings = cfg[NAME] || {};
  enabled = settings.enabled === true;
  fireTrackers = settings.fireTrackers === true;
  desktopFallback = settings.desktopFallback === true;
  enabled ? enable() : disable();
});
