import { config } from '../src/config.js';
import * as events from '../src/events.js';
import { EVENTS } from '../src/constants.js';
import { getAdUnitElement } from '../src/utils/adUnits.js';
import { reportBidClick, hasClickthroughMacro, validClickUrl } from '../src/adRendering.js';
import type { Bid } from '../src/bidfactory.ts';
import type { AdUnit } from '../src/adUnits.ts';

export { hasClickthroughMacro, validClickUrl };

export interface BidClickTrackingConfig {
  /**
   * Enables observed banner and native click events.
   */
  enabled?: boolean;
  /**
   * Also infer desktop banner clicks from hover and iframe focus.
   * Inferred clicks are less reliable than observed clicks.
   */
  desktopFallback?: boolean;
  /**
   * Fire the ad-server click URL for banner clicks. Off by default.
   */
  fireTrackers?: boolean;
  /**
   * Report native clicks and their bidder trackers only once per bid.
   * Defaults to true; set false to allow repeated native clicks.
   */
  dedupeNativeClicks?: boolean;
}

/** @augmentationOptional */
declare module '../src/config' {
  interface Config {
    bidClickTracking?: BidClickTrackingConfig;
  }
}

interface TrackedSlot {
  bid: Bid;
  slot: HTMLElement;
  fired: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  enter: () => void;
  leave: () => void;
}

const NAME = 'bidClickTracking';
const tracked = new Map<HTMLElement, TrackedSlot>();
let enabled = false;
let hovered: TrackedSlot | null = null;
let listening = false;
let desktopFallback = false;

function eligible(bid: Bid): boolean {
  return bid?.mediaType === 'banner' && !hasClickthroughMacro(bid) &&
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function clearSlot(slot: HTMLElement): void {
  const state = tracked.get(slot);
  if (!state) return;
  if (state.timer != null) clearTimeout(state.timer);
  slot.removeEventListener('pointerenter', state.enter);
  slot.removeEventListener('pointerleave', state.leave);
  tracked.delete(slot);
  if (hovered === state) hovered = null;
}

function clearAll(): void {
  Array.from(tracked.keys()).forEach(clearSlot);
}

function onBlur(): void {
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

function onRender({ bid }: { bid: Bid }): void {
  if (!enabled || !desktopFallback || !eligible(bid)) return;
  const slot = getAdUnitElement(bid);
  if (!slot) return;
  clearSlot(slot);
  const state: TrackedSlot = {
    bid, slot, fired: false, timer: null,
    enter: () => { hovered = state; },
    leave: () => { if (hovered === state) hovered = null; }
  };
  slot.addEventListener('pointerenter', state.enter);
  slot.addEventListener('pointerleave', state.leave);
  tracked.set(slot, state);
}

function onRequest(adUnits: AdUnit[] = []): void {
  const codes = adUnits.map(unit => unit.code);
  for (const [slot, state] of tracked) {
    if (codes.includes(state.bid.adUnitCode)) clearSlot(slot);
  }
}

function enable(): void {
  if (listening) return;
  listening = true;
  window.addEventListener('blur', onBlur);
  events.on(EVENTS.AD_RENDER_SUCCEEDED, onRender);
  events.on(EVENTS.BEFORE_REQUEST_BIDS, onRequest);
}

function disable(): void {
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
