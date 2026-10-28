import { config } from '../src/config.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';
import { reportBidClick, hasClickthroughMacro, validClickUrl } from '../src/adRendering.js';

export { hasClickthroughMacro, validClickUrl };

const NAME = 'bidClickTracking';
const tracked = new Map();
let enabled = false;
let hovered = null;
let listening = false;
let desktopFallback = false;

function eligible(bid) {
  return bid?.mediaType === 'banner' && !hasClickthroughMacro(bid) &&
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function clearSlot(slot) {
  const state = tracked.get(slot);
  if (!state) return;
  clearTimeout(state.timer);
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
  if (!desktopFallback || !state || !enabled || state.fired || !state.slot.isConnected || document.visibilityState === 'hidden') return;
  // An iframe can become the document's active element when clicked. Do not
  // infer clicks if focus went to another control, tab or browser window.
  const active = document.activeElement;
  if (!active || active.tagName !== 'IFRAME' || !state.slot.contains(active)) return;
  state.fired = true;
  // The direct creative click message may arrive just after window blur.
  // Allow it to win before reporting the less reliable inference.
  state.timer = setTimeout(() => {
    state.timer = null;
    if (enabled && desktopFallback && state.slot.isConnected) reportBidClick(state.bid, 'iframeFocus');
  }, 100);
}

function onRender({ bid }) {
  if (!enabled || !desktopFallback || !eligible(bid)) return;
  const slot = getAdUnitElement(bid);
  if (!slot) return;
  clearSlot(slot);
  const state = {
    bid, slot, fired: false, timer: null,
    enter: null,
    leave: null
  };
  state.enter = () => { hovered = state; };
  state.leave = () => { if (hovered === state) hovered = null; };
  slot.addEventListener('pointerenter', state.enter);
  slot.addEventListener('pointerleave', state.leave);
  tracked.set(slot, state);
}

function onRequest(adUnits = []) {
  const codes = Array.isArray(adUnits) ? adUnits.map(unit => unit.code) : adUnits?.adUnitCodes;
  for (const [slot, state] of tracked) {
    if (!codes || codes.includes(state.bid.adUnitCode)) clearSlot(slot);
  }
}

function enable() {
  if (listening) return;
  listening = true;
  window.addEventListener('blur', onBlur);
  events.on(EVENTS.AD_RENDER_SUCCEEDED, onRender);
  events.on(EVENTS.BEFORE_REQUEST_BIDS, onRequest);
}

function disable() {
  if (!listening) return;
  listening = false;
  window.removeEventListener('blur', onBlur);
  events.off(EVENTS.AD_RENDER_SUCCEEDED, onRender);
  events.off(EVENTS.BEFORE_REQUEST_BIDS, onRequest);
  clearAll();
}

config.getConfig(NAME, cfg => {
  const settings = cfg[NAME] || {};
  enabled = settings.enabled === true;
  desktopFallback = settings.desktopFallback === true;
  enabled ? enable() : disable();
});
