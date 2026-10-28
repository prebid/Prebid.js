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
   * Optional desktop fallback for creatives whose clicks cannot be observed.
   * The display renderer only sees DOM link clicks in an accessible inline
   * creative document. Clicks inside cross-origin nested iframes, adUrl
   * creatives, or creatives that navigate via JavaScript are invisible to it.
   * Focus moving into the creative's iframe (not via the keyboard) can still provide
   * a best-effort signal in those cases, but it is less reliable than an observed click.
   */
  desktopFallback?: boolean;
  /**
   * Fire the ad-server click URL for banner clicks. Off by default. Only fired once the browser confirms the user
   * has interacted with the page (`navigator.userActivation`); click reports are not proof of a user click.
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
}

const NAME = 'bidClickTracking';
/** How long after a Tab keypress a focus change is attributed to the keyboard. */
const KEYBOARD_FOCUS_WINDOW_MS = 500;
const tracked = new Map<HTMLElement, TrackedSlot>();
let enabled = false;
let listening = false;
let desktopFallback = false;
let lastTabAt = -Infinity;

function eligible(bid: Bid): boolean {
  return bid?.mediaType === 'banner' && !hasClickthroughMacro(bid) &&
    typeof window.matchMedia === 'function' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function clearSlot(slot: HTMLElement): void {
  const state = tracked.get(slot);
  if (!state) return;
  if (state.timer != null) clearTimeout(state.timer);
  tracked.delete(slot);
}

function clearAll(): void {
  Array.from(tracked.keys()).forEach(clearSlot);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Tab') lastTabAt = Date.now();
}

// A click inside a cross-origin creative iframe does not bubble up to the
// publisher or to our display renderer. On desktop, however, clicking into
// an iframe moves document focus to that iframe and blurs the window, which
// gives partial coverage for otherwise opaque creatives.
// The page can't tell whether the pointer is over a cross-origin iframe that
// fills its slot (no pointerenter or :hover reaches the parent document), so
// hover is not required. Focus moved with the keyboard is excluded, and
// reportBidClick ignores reports before any user interaction with the page.
// It is only a heuristic: other focus changes can look like clicks, and some
// actual clicks will not change focus.
function onBlur(): void {
  if (!desktopFallback || !enabled || document.visibilityState === 'hidden') return;
  if (Date.now() - lastTabAt < KEYBOARD_FOCUS_WINDOW_MS) return;
  // An iframe becomes the document's active element when clicked. Do not
  // infer clicks if focus went to another control, tab or browser window.
  const active = document.activeElement;
  if (!active || active.tagName !== 'IFRAME') return;
  const state = Array.from(tracked.values()).find(candidate => candidate.slot.contains(active));
  if (!state || state.fired || !state.slot.isConnected) return;
  state.fired = true;
  // A real click event can arrive asynchronously from an accessible creative
  // after the blur. Give it priority; reportBidClick's shared per-bid guard
  // prevents this fallback from firing a second tracker or analytics event.
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
  tracked.set(slot, { bid, slot, fired: false, timer: null });
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
  document.addEventListener('keydown', onKeydown, true);
  events.on(EVENTS.AD_RENDER_SUCCEEDED, onRender);
  events.on(EVENTS.BEFORE_REQUEST_BIDS, onRequest);
}

function disable(): void {
  if (!listening) return;
  listening = false;
  window.removeEventListener('blur', onBlur);
  document.removeEventListener('keydown', onKeydown, true);
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
