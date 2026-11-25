import { EVENTS } from '../../src/constants.js';
import * as events from '../../src/events.js';
import { logWarn } from '../../src/utils.js';
import type { Bid } from '../../src/bidfactory.ts';

/**
 * AdCOM creative attributes for in-banner video: 6 (auto-play) and 7 (user-initiated).
 */
export const IBV_ATTRS = [6, 7];
export const BID_UNAUTHORIZED_VIDEO_REJECTION_REASON = 'Unauthorized video';

export const DEFAULT_OBSERVE_DURATION = 3000;
export const MAX_OBSERVE_DURATION = 10000;
const MAX_FRAME_DEPTH = 2;

export type UnauthorizedVideoStage = 'bidResponse' | 'render';
/**
 * - `blocked`: the applicable `battr` list contains 6 or 7.
 * - `undeclared`: the bid's `meta.attr` does not contain 6 or 7.
 */
export type UnauthorizedVideoReason = 'blocked' | 'undeclared';

export type UnauthorizedVideoConfig = {
  /**
   * Turn on unauthorized video detection. Default `false`.
   */
  enabled?: boolean;
  /**
   * Reject banner bids whose markup shows video signals, instead of only reporting them. Default `false`.
   * Only applies to the markup scan; the post-render check can only report.
   */
  reject?: boolean;
  /**
   * Fraction (0 to 1) of banner bids whose markup is scanned. Default `1`.
   */
  sampleRate?: number;
  /**
   * Additional markup patterns that indicate video, e.g. a known video player's script URL.
   * Strings match case-insensitively as substrings.
   */
  patterns?: (string | RegExp)[];
  /**
   * Post-render check of rendered banner winners, for documents Prebid can reach (same-origin frames).
   */
  observe?: {
    /**
     * Fraction (0 to 1) of rendered banner bids to observe. Default `0` (off).
     */
    sampleRate?: number;
    /**
     * How long (in ms) to watch the rendered document for video. Default 3000, at most 10000.
     */
    duration?: number;
  };
};

type FieldConfig = {
  /**
   * Whether to enforce validation for this field. Default `true`.
   */
  enforce?: boolean;
  /**
   * Whether to reject bids that do not declare a value for this field.
   */
  blockUnknown?: boolean;
};

export type BidResponseFilterConfig = {
  cat?: FieldConfig & {
    /**
     * Blocked category IDs, checked in addition to `ortb2.bcat`.
     */
    bcat?: string[];
    /**
     * Category taxonomy of `bcat`. Default 1.
     */
    cattax?: number;
  };
  adv?: FieldConfig & {
    /**
     * Blocked advertiser domains, checked in addition to `ortb2.badv`.
     */
    badv?: string[];
  };
  attr?: FieldConfig & {
    /**
     * Blocked creative attributes, checked in addition to the ad unit's `battr`.
     */
    battr?: number[];
  };
  mediaTypes?: FieldConfig & {
    /**
     * Reject banner bids on multi-format ad units whose video context is `inbanner`.
     */
    rejectIbvBannerOnMultiFormat?: boolean;
  };
  unauthorizedVideo?: UnauthorizedVideoConfig;
};

export type UnauthorizedVideoData = {
  bid: Bid;
  adUnitCode: string;
  /**
   * `bidResponse` for the markup scan, `render` for the post-render check.
   */
  stage: UnauthorizedVideoStage;
  reason: UnauthorizedVideoReason;
  /**
   * What indicated video, e.g. `videoElement`, `vast`, `imaSdk`, or `pattern:<pattern>`.
   */
  signals: string[];
};

declare module '../../src/config' {
  interface Config {
    bidResponseFilter?: BidResponseFilterConfig;
  }
}

declare module '../../src/events' {
  interface Events {
    /**
     * Fired by the bidResponseFilter module when a banner bid shows video it was not authorized to.
     */
    [EVENTS.UNAUTHORIZED_VIDEO]: [UnauthorizedVideoData];
  }
}

type ResolvedConfig = {
  reject: boolean;
  sampleRate: number;
  patterns: (string | RegExp)[];
  observeSampleRate: number;
  observeDuration: number;
};

// Kept conservative: ordinary display markup should not contain any of these.
const MARKUP_SIGNALS: [string, RegExp][] = [
  ['videoElement', /<video[\s>/]/i],
  ['vast', /<vast[\s>]/i],
  ['imaSdk', /imasdk\.googleapis\.com\/js\/sdkloader\//i],
];

let current: ResolvedConfig | null = null;
const reported = new WeakMap<object, Set<UnauthorizedVideoStage>>();
const observed = new WeakSet<object>();
const activeWatches = new Set<() => void>();
let getBattrLists: (bid: Bid) => number[][] = () => [];

function rate(value, defaultValue) {
  const n = Number(value ?? defaultValue);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : defaultValue;
}

function sampled(sampleRate: number) {
  return sampleRate >= 1 || (sampleRate > 0 && Math.random() < sampleRate);
}

/**
 * Apply `bidResponseFilter.unauthorizedVideo` config. `battrLists` returns the creative attribute
 * blocklists that apply to a bid.
 */
export function configureUnauthorizedVideo(cfg: UnauthorizedVideoConfig | undefined, battrLists?: (bid: Bid) => number[][]) {
  if (battrLists) getBattrLists = battrLists;
  const wasObserving = current?.observeSampleRate > 0;
  if (!cfg?.enabled) {
    current = null;
  } else {
    const duration = Number(cfg.observe?.duration ?? DEFAULT_OBSERVE_DURATION);
    current = {
      reject: cfg.reject === true,
      sampleRate: rate(cfg.sampleRate, 1),
      patterns: Array.isArray(cfg.patterns)
        ? cfg.patterns.filter(p => (typeof p === 'string' && p.length > 0) || p instanceof RegExp)
        : [],
      observeSampleRate: rate(cfg.observe?.sampleRate, 0),
      observeDuration: Number.isFinite(duration) && duration > 0
        ? Math.min(duration, MAX_OBSERVE_DURATION)
        : DEFAULT_OBSERVE_DURATION,
    };
  }
  const observing = current?.observeSampleRate > 0;
  if (observing && !wasObserving) {
    events.on(EVENTS.AD_RENDER_SUCCEEDED, onRenderSucceeded);
  } else if (!observing && wasObserving) {
    events.off(EVENTS.AD_RENDER_SUCCEEDED, onRenderSucceeded);
    activeWatches.forEach(stop => stop());
    activeWatches.clear();
  }
}

export function resetUnauthorizedVideo() {
  configureUnauthorizedVideo(undefined);
}

function isBanner(bid: Bid) {
  return (bid?.mediaType ?? bid?.meta?.mediaType) === 'banner';
}

export function getUnauthorizedReason(bid: Bid, battrLists: number[][]): UnauthorizedVideoReason | null {
  if (battrLists.some(list => Array.isArray(list) && list.some(attr => IBV_ATTRS.includes(Number(attr))))) {
    return 'blocked';
  }
  const attr = bid?.meta?.attr;
  if (!Array.isArray(attr) || !attr.some(a => IBV_ATTRS.includes(Number(a)))) {
    return 'undeclared';
  }
  return null;
}

export function scanMarkup(markup: string, patterns: (string | RegExp)[] = []): string[] {
  const signals = MARKUP_SIGNALS.filter(([, re]) => re.test(markup)).map(([name]) => name);
  const lower = markup.toLowerCase();
  patterns.forEach(pattern => {
    let match;
    if (typeof pattern === 'string') {
      match = lower.includes(pattern.toLowerCase());
    } else {
      pattern.lastIndex = 0;
      match = pattern.test(markup);
    }
    if (match) signals.push(`pattern:${String(pattern)}`);
  });
  return signals;
}

function report(bid: Bid, adUnitCode: string, stage: UnauthorizedVideoStage, reason: UnauthorizedVideoReason, signals: string[]) {
  let stages = reported.get(bid);
  if (!stages) {
    stages = new Set();
    reported.set(bid, stages);
  }
  if (stages.has(stage)) return false;
  stages.add(stage);
  logWarn(`bidResponseFilter: ${reason} video from ${bid.bidder} on ad unit ${adUnitCode} (${stage}): ${signals.join(', ')}`);
  events.emit(EVENTS.UNAUTHORIZED_VIDEO, { bid, adUnitCode, stage, reason, signals });
  return true;
}

/**
 * Scan a banner bid's markup for video. Returns true if the bid should be rejected.
 */
export function checkBidResponse(adUnitCode: string, bid: Bid, battrLists: number[][]): boolean {
  if (current == null || !isBanner(bid) || typeof bid.ad !== 'string' || !bid.ad) return false;
  const reason = getUnauthorizedReason(bid, battrLists);
  if (reason == null || !sampled(current.sampleRate)) return false;
  const signals = scanMarkup(bid.ad, current.patterns);
  if (signals.length === 0) return false;
  // a listener may change the config
  const { reject } = current;
  report(bid, adUnitCode, 'bidResponse', reason, signals);
  return reject;
}

function frameDocument(frame: HTMLIFrameElement): Document | null {
  try {
    return frame.contentDocument ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Watch `doc`, and the same-origin frames inside it, for a `<video>` element for `duration` ms.
 * Calls `onVideo` at most once; all observers and listeners are removed on detection or timeout.
 */
export function watchForVideo(doc: Document, duration: number, onVideo: () => void, onDone?: () => void) {
  const cleanups: (() => void)[] = [];
  const watchedDocs = new WeakSet<Document>();
  let done = false;

  function finish(found: boolean) {
    if (done) return;
    done = true;
    cleanups.forEach(fn => fn());
    onDone?.();
    if (found) onVideo();
  }

  function watchFrame(frame: HTMLIFrameElement, depth: number) {
    let frameCleanups: (() => void)[] = [];
    const cleanupFrameDoc = () => {
      frameCleanups.forEach(fn => fn());
      frameCleanups = [];
    };
    const onLoad = () => {
      cleanupFrameDoc();
      const child = frameDocument(frame);
      if (child) watchDoc(child, depth, frameCleanups);
    };
    frame.addEventListener('load', onLoad);
    cleanups.push(() => {
      frame.removeEventListener('load', onLoad);
      cleanupFrameDoc();
    });
    onLoad();
  }

  function watchFrames(root: ParentNode, depth: number) {
    if (depth > MAX_FRAME_DEPTH) return;
    root.querySelectorAll('iframe').forEach(frame => !done && watchFrame(frame, depth));
  }

  function watchDoc(target: Document, depth: number, localCleanups?: (() => void)[]) {
    if (done || watchedDocs.has(target)) return;
    watchedDocs.add(target);
    if (target.querySelector('video')) {
      finish(true);
      return;
    }
    const registerCleanup = (fn: () => void) => {
      cleanups.push(fn);
      localCleanups?.push(fn);
    };
    const view = target.defaultView as (Window & typeof globalThis) | null;
    const Observer = view?.MutationObserver ?? MutationObserver;
    const observer = new Observer((records) => {
      for (const record of records) {
        for (const node of Array.from(record.addedNodes)) {
          if (node.nodeType !== 1) continue;
          const el = node as Element;
          if (el.nodeName === 'VIDEO' || el.querySelector('video')) {
            finish(true);
            return;
          }
          if (el.nodeName === 'IFRAME') {
            depth < MAX_FRAME_DEPTH && watchFrame(el as HTMLIFrameElement, depth + 1);
          } else {
            watchFrames(el, depth + 1);
          }
        }
      }
    });
    observer.observe(target.documentElement ?? target, { childList: true, subtree: true });
    registerCleanup(() => observer.disconnect());
    watchFrames(target, depth + 1);
  }

  const timer = setTimeout(() => finish(false), duration);
  cleanups.push(() => clearTimeout(timer));
  try {
    watchDoc(doc, 0);
  } catch (e) {
    finish(false);
  }
  return () => finish(false);
}

function onRenderSucceeded({ doc, bid }: { doc: Document | null; bid: Bid }) {
  const cfg = current;
  if (cfg == null || doc == null || bid == null || !isBanner(bid) || observed.has(bid) ||
    reported.get(bid)?.has('render')) return;
  // the page's own document can hold the publisher's video content
  if (doc === document) return;
  const reason = getUnauthorizedReason(bid, getBattrLists(bid));
  if (reason == null || !sampled(cfg.observeSampleRate)) return;
  observed.add(bid);
  // attach after the event, off the rendering path
  const timer = setTimeout(() => {
    activeWatches.delete(cancelPending);
    let finished = false;
    let stop: (() => void) | undefined;
    stop = watchForVideo(doc, cfg.observeDuration, () => {
      report(bid, bid.adUnitCode, 'render', reason, ['videoElement']);
    }, () => {
      finished = true;
      if (stop) activeWatches.delete(stop);
    });
    if (!finished) activeWatches.add(stop);
  }, 0);
  const cancelPending = () => clearTimeout(timer);
  activeWatches.add(cancelPending);
}
