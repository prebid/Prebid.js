import { fetch as prebidFetch } from "../src/ajax.ts";
import { AllConsentData } from "../src/consentHandler.ts";
import { submodule } from "../src/hook.js";
import { StartAuctionOptions } from "../src/prebid.ts";
import {
  getStorageManager,
  discloseStorageUse,
} from "../src/storageManager.js";
import { MODULE_TYPE_RTD } from "../src/activities/modules.js";
import {
  logInfo,
  logError,
  logWarn,
  deepAccess,
  isStr,
  isArray,
  isNumber,
  isPlainObject,
  cyrb53Hash,
} from "../src/utils.js";
import { getRefererInfo } from "../src/refererDetection.js";
import type { RTDProviderConfig, RtdProviderSpec } from "./rtdModule/spec.ts";

// TCF purposes required by stackupRtd:
//   1 = Store and/or access information on a device
//   4 = Select personalised content
const REQUIRED_PURPOSES = [1, 4];

const MODULE_NAME = "stackupRtd";
const MODULE_TYPE = "realTimeData";
const DEFAULT_TIMEOUT = 300;
const DEFAULT_API_URL = "https://api.stackup-ai.com/v1/enrich-ortb-rtd";
const CACHE_KEY_PREFIX = "stackup:enrich:v1:";
const CACHE_SCHEMA_VERSION = 1;
// Maximum number of auction snapshots to keep in memory at once.
// On long-lived SPA sessions many auctions can fire; without a cap the map
// grows without bound. FIFO eviction keeps the last N entries — enough for
// any analytics adapter to read a snapshot before it is evicted.
const MAX_SNAPSHOTS = 10;

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

type RtdState =
  | "idle"
  | "initializing"
  | "fetching"
  | "ready"
  | "timedOut"
  | "error";

interface RtdInternalState {
  state: RtdState;
  articleId: string | null;
  enrichment: EnrichmentSnapshot | null;
  fetchPromise: Promise<EnrichmentSnapshot> | null;
  fetchAbortController: AbortController | null;
  pendingCallbacks: Array<() => void>;
  snapshotsByAuctionId: Map<string, EnrichmentSnapshot>;
  config: RTDProviderConfig<"stackupRtd">;
}

const state: RtdInternalState = {
  state: "idle",
  articleId: null,
  enrichment: null,
  fetchPromise: null,
  fetchAbortController: null,
  pendingCallbacks: [],
  snapshotsByAuctionId: new Map(),
  config: null as any,
};

export interface StackupRtdParams {
  apiUrl?: string; // default: "https://api.stackup-ai.com/v1/enrich-ortb-rtd"
  pubId: string; // Publisher ID issued by Stackup
  timeout?: number; // default: 300 ms
  articleId?: string;
  articleIdMode?: "explicit" | "path";
  cache?: {
    enabled?: boolean;
    ttlSeconds?: number;
    storage?: "session" | "memory";
  };
  debug?: boolean;
  debugDomain?: string; // overrides the domain sent to the API when debug: true
}

declare module "./rtdModule/spec.ts" {
  interface ProviderConfig {
    stackupRtd: {
      params?: StackupRtdParams;
    };
  }
}

type BrandSafetyBlock = unknown; // TODO: define properly when we have real data
type EmotionBlock = unknown; // TODO: define properly when we have real data

// types/stackup.ts — shared between RTD and analytics modules

export interface EnrichmentSnapshot {
  articleId: string;
  fetchedAt: number; // unix ms when enrichment landed
  source: "api" | "cache";
  site: {
    content: {
      id: string;
      title?: string;
      data: Ortb2ContentSegment[];
      ext?: {
        brand_safety?: BrandSafetyBlock;
        emotion?: EmotionBlock;
      };
    };
  };
  user: {
    data: Ortb2UserSegment[];
  };
}

export interface Ortb2ContentSegment {
  id?: string;
  name: string; // provider domain: 'data.stackup-ai.com'
  ext: {
    segtax: 502; // StackUP Content Taxonomy 1.0
    stackup?: { taxonomy_version: string; source_tier?: string };
  };
  segment: Array<{
    id: string;
    name?: string; // optional — some segments carry only id + value
    value?: string;
    ext?: { confidence?: number };
  }>;
}

export interface Ortb2UserSegment {
  id?: string;
  name: string; // provider domain: 'data.stackup-ai.com'
  ext: {
    segtax: 501; // StackUP Audience Taxonomy 1.0 — one block per dimension
    stackup?: { dimension: string; taxonomy_version: string };
  };
  segment: Array<{
    id: string;
    name?: string; // optional — profile dimension uses only id + value
    value?: string;
    ext?: { confidence?: number };
  }>;
}

// Raw JSON shape returned by the Stackup enrichment API.
// Mirrors EnrichmentSnapshot.site/user but without the client-added fields
// (articleId, fetchedAt, source) that are stamped on after a successful fetch.
interface RawEnrichmentResponse {
  site: {
    content: {
      id?: string;
      title?: string;
      data: Ortb2ContentSegment[];
      ext?: {
        brand_safety?: BrandSafetyBlock;
        emotion?: EmotionBlock;
      };
    };
  };
  user?: {
    data?: Ortb2UserSegment[];
  };
}

type CacheStorageMode = "session" | "memory";

const inMemoryEnrichmentCache = new Map<
  string,
  { v: number; t: number; d: EnrichmentSnapshot }
>();

function getCacheConfig(): {
  enabled: boolean;
  ttlSeconds: number;
  storage: CacheStorageMode;
} {
  const c = state.config?.params?.cache;
  return {
    enabled: c?.enabled ?? true,
    ttlSeconds: c?.ttlSeconds ?? 3600,
    storage: c?.storage ?? "session",
  };
}

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

export const subModuleObj: RtdProviderSpec<"stackupRtd"> = {
  name: MODULE_NAME as "stackupRtd",
  init,
  getBidRequestData,
};

function init(
  config: RTDProviderConfig<"stackupRtd">,
  userConsent: AllConsentData
): boolean {
  // Disclose the sessionStorage key pattern to storageControl on first init.
  // Must be called after hook.ready() — init() is only invoked post-auction setup,
  // so this is always safe. discloseStorageUse is a sync hook that throws if called
  // before hook.ready() (fun-hooks queuing only applies to async hooks).
  discloseStorageUse(MODULE_NAME, {
    type: "web",
    identifier: CACHE_KEY_PREFIX + "*",
    purposes: REQUIRED_PURPOSES,
  });

  // Guard against being called with no config (defensive — framework shouldn't do this)
  if (!config) {
    logWarn("[stackupRtd] init called without config, module inert");
    state.state = "error";
    return false;
  }
  state.config = config;
  state.state = "initializing";

  // params and pubId are required — fail fast if missing
  const params = config.params;
  if (!params || !params.pubId) {
    logWarn("[stackupRtd] missing required params.pubId, module inert");
    state.state = "error";
    return false;
  }

  // Respect consent — no enrichment if user has not granted relevant purposes
  if (!hasRequiredConsent(userConsent)) {
    logInfo("[stackupRtd] consent not granted, module inert");
    state.state = "error";
    return false;
  }

  try {
    const { id } = resolveArticleId(params);
    state.articleId = id;
  } catch (e) {
    logError("[stackupRtd] article id resolution failed", e);
    state.state = "error";
    return false;
  }

  // Kick off background fetch — do not await
  if (!state.articleId) {
    logWarn("[stackupRtd] no article ID resolved, module inert");
    state.state = "error";
    return false;
  }
  state.fetchPromise = fetchEnrichment(state.articleId, params);
  state.state = "fetching";

  state.fetchPromise
    .then((data) => {
      state.enrichment = data;
      state.state = "ready";
      drainPendingCallbacks();
    })
    .catch((err) => {
      logError("[stackupRtd] fetch failed", err);
      state.state = "error";
      drainPendingCallbacks();
    });

  return true;
}

// Builds the enrichment API request URL from the resolved articleId and publisher params.
// TODO: link to Stackup API documentation once published.
function buildEnrichmentUrl(
  articleId: string,
  params: StackupRtdParams
): string {
  const base = params.apiUrl ?? DEFAULT_API_URL;
  // Use Prebid's referer detection so domain is correct inside iframes.
  const domain = getRefererInfo().domain;

  if (params.debug) {
    const debugDomain = params.debugDomain ?? domain;
    return `${base}?pubId=${encodeURIComponent(
      params.pubId
    )}&articleId=${encodeURIComponent(articleId)}&domain=${encodeURIComponent(
      debugDomain
    )}`;
  }

  return `${base}?pubId=${encodeURIComponent(
    params.pubId
  )}&articleId=${encodeURIComponent(articleId)}&domain=${encodeURIComponent(
    domain
  )}`;
}

// Flushes all getBidRequestData callbacks queued while the enrichment fetch was in flight.
// Called once the fetch settles (success or error) to unblock any waiting auctions.
function drainPendingCallbacks(): void {
  const callbacks = state.pendingCallbacks.splice(0);
  for (const cb of callbacks) {
    try {
      cb();
    } catch (e) {
      logError("[stackupRtd] pending callback threw", e);
    }
  }
}

function fetchEnrichment(
  articleId: string,
  params: StackupRtdParams
): Promise<EnrichmentSnapshot> {
  // Check cache first
  const cached = getCachedEnrichment(articleId);
  if (cached) {
    return Promise.resolve({ ...cached, source: "cache" });
  }

  // AbortController lets getBidRequestData abort this fetch from its safety net
  // when the auction-delay budget is exceeded, stopping the wasted network round-trip.
  // The safety net in getBidRequestData fires at params.timeout and is the single
  // source of truth for abort timing — do not add a second independent timer here.
  const ctl = new AbortController();
  state.fetchAbortController = ctl;

  const url = buildEnrichmentUrl(articleId, params);
  return prebidFetch(url, { signal: ctl.signal })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    })
    .then((responseText) => {
      const data = JSON.parse(responseText);
      if (!isValidEnrichment(data)) {
        throw new Error("schema validation failed");
      }
      const snapshot: EnrichmentSnapshot = {
        articleId,
        fetchedAt: Date.now(),
        source: "api",
        site: {
          content: {
            ...data.site.content,
            id: data.site.content.id ?? articleId,
          },
        },
        user: { data: data.user?.data ?? [] },
      };
      setCachedEnrichment(articleId, snapshot);
      return snapshot;
    });
}

function isValidEnrichment(data: any): data is RawEnrichmentResponse {
  if (!isPlainObject(data)) return false;
  if (!data.site?.content) return false;
  if (!isArray(data.site.content.data)) return false;

  // Validate every segment in site.content.data.
  // segtax 502 = StackUP Content Taxonomy 1.0 — the only value emitted by the
  // StackUP worker and returned by the /v1/enrich-ortb-rtd endpoint.
  for (const block of data.site.content.data) {
    if (!isStr(block.name)) return false;
    if (block.ext?.segtax !== 502) return false;
    if (!isArray(block.segment)) return false;
    for (const seg of block.segment) {
      if (!isStr(seg.id)) return false;
      // name is optional — some dimensions (e.g. profile) carry only id + value
      if (seg.name !== undefined && !isStr(seg.name)) return false;
      if (seg.ext?.confidence !== undefined) {
        if (!isNumber(seg.ext.confidence)) return false;
        if (seg.ext.confidence < 0 || seg.ext.confidence > 1) return false;
      }
    }
  }

  // user.data is optional — some articles have site-level enrichment only
  if (data.user?.data && !isArray(data.user.data)) return false;

  return true;
}

function cacheKey(articleId: string, params?: StackupRtdParams): string {
  const p = params ?? state.config?.params;
  const domain = (p?.debug ? p?.debugDomain : getRefererInfo().domain) ?? "";
  const base = p?.apiUrl ?? DEFAULT_API_URL;
  const keyInput = `${articleId}|pub:${
    p?.pubId ?? ""
  }|domain:${domain}|api:${base}`;
  return CACHE_KEY_PREFIX + "path_" + cyrb53Hash(keyInput);
}

function getCachedEnrichment(articleId: string): EnrichmentSnapshot | null {
  const cache = getCacheConfig();
  if (!cache.enabled) return null;
  try {
    const key = cacheKey(articleId);
    const parsed =
      cache.storage === "memory"
        ? inMemoryEnrichmentCache.get(key)
        : (() => {
            const raw = storage.getDataFromSessionStorage(key);
            return raw ? JSON.parse(raw) : null;
          })();
    if (!parsed) return null;
    if (parsed.v !== CACHE_SCHEMA_VERSION) return null;
    const ttlMs = cache.ttlSeconds * 1000;
    if (Date.now() - parsed.t > ttlMs) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

function setCachedEnrichment(
  articleId: string,
  data: EnrichmentSnapshot
): void {
  const cache = getCacheConfig();
  if (!cache.enabled) return;
  try {
    const key = cacheKey(articleId);
    const payload = { v: CACHE_SCHEMA_VERSION, t: Date.now(), d: data };
    if (cache.storage === "memory") {
      inMemoryEnrichmentCache.set(key, payload);
      return;
    }
    storage.setDataInSessionStorage(key, JSON.stringify(payload));
  } catch {
    // quota exceeded — silently ignore
  }
}

function hasRequiredConsent(userConsent: AllConsentData): boolean {
  // COPPA: block all processing in child-directed contexts.
  if (userConsent.coppa === true) return false;

  // GDPR: require per-purpose consent when GDPR applies.
  // No USP/CCPA or GPP checks — this module sends only a URL path and domain
  // to the enrichment API; no user identifiers are transmitted or stored,
  // so US sale-of-data opt-outs have no legal basis here.
  const gdprApplies = deepAccess(userConsent, "gdpr.gdprApplies");
  if (!gdprApplies) return true;

  const purposeConsents =
    deepAccess(userConsent, "gdpr.vendorData.purpose.consents") || {};
  const purposeLegitimateInterests =
    deepAccess(userConsent, "gdpr.vendorData.purpose.legitimateInterests") ||
    {};

  return REQUIRED_PURPOSES.every(
    (id) =>
      purposeConsents[id] === true || purposeLegitimateInterests[id] === true
  );
}

function resolveArticleId(params: StackupRtdParams): {
  id: string | null;
  source: "explicit" | "path" | null;
} {
  const mode = params.articleIdMode ?? "path";

  if (mode === "explicit") {
    if (isStr(params.articleId)) {
      const id = params.articleId.trim();
      if (id.length > 0 && id.length <= 512) {
        return { id, source: "explicit" };
      }
    }
    return { id: null, source: null };
  }

  // mode === "path" (default)
  const id = resolveFromPath();
  return id ? { id, source: "path" } : { id: null, source: null };
}

function resolveFromPath(): string | null {
  try {
    // Use Prebid's referer detection — works across iframes and AMP frames
    // where window.location may not reflect the actual publisher page.
    const ri = getRefererInfo();
    const pageUrl = ri.page;
    if (!pageUrl) return null;

    let path = new URL(pageUrl).pathname;

    // Normalize: lowercase, collapse double slashes
    path = path.toLowerCase().replace(/\/{2,}/g, "/");

    // Strip trailing slash — but keep bare "/" (homepage) intact
    if (path.length > 1) {
      path = path.replace(/\/$/, "");
    }

    // Strip AMP path variants — must mirror the server-side pipeline in normalize.ts
    // so the client cache key (derived from articleId) is consistent across AMP and
    // canonical URLs for the same article.
    path = path.replace(/^\/amp\//, "/"); // AMP-first prefix: /amp/news/… → /news/…
    path = path.replace(/\/_amp\//g, "/"); // Google AMP cache segment: /news/_amp/… → /news/…
    path = path.replace(/\/amp\/?$/, ""); // AMP suffix: /news/article/amp → /news/article

    // Final collapse and trailing-slash cleanup after substitutions
    path = path.replace(/\/{2,}/g, "/");
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    path = path || "/";

    // Return the raw path — the API matches it against article_analysis.normalized_path.
    // The sessionStorage cache key is derived by hashing this value via cacheKey();
    // same page URL → same normalized path → same hash → cache hit on revisit.
    return path;
  } catch {
    return null;
  }
}

function getBidRequestData(
  reqBidsConfigObj: StartAuctionOptions,
  callback: () => void,
  config: RTDProviderConfig<"stackupRtd">,
  _userConsent: AllConsentData,
  timeout?: number
): void {
  const requestedTimeout = config.params?.timeout;
  const ownTimeout =
    isNumber(requestedTimeout) &&
    isFinite(requestedTimeout) &&
    requestedTimeout > 0
      ? requestedTimeout
      : DEFAULT_TIMEOUT;
  // Honor the auction-delay budget passed by core as the 5th argument.
  // Core computes it as `shouldDelayAuction ? auctionDelay : 0`, so it is 0
  // when the publisher runs us non-blocking or omits auctionDelay entirely.
  // A naive Math.min would zero-out our own budget in that case, so treat
  // 0/falsy as "no external cap" and fall back to our own timeout.
  const budget = isNumber(timeout) && timeout > 0 ? timeout : Infinity;
  const effectiveTimeout = Math.min(ownTimeout, budget);

  let callbackFired = false;
  const release = () => {
    if (callbackFired) return; // CRITICAL — never call back twice
    callbackFired = true;
    callback();
  };

  // Safety net — always release the auction, no matter what
  const timeoutId = setTimeout(() => {
    if (state.state === "fetching") {
      logWarn(
        "[stackupRtd] enrichment fetch exceeded " +
          effectiveTimeout +
          "ms, releasing auction clean"
      );
      state.state = "timedOut";
      // Abort the in-flight AJAX request so the network round-trip stops
      // immediately rather than running until params.timeout fires.
      state.fetchAbortController?.abort();
    }
    release();
  }, effectiveTimeout);

  const onReady = () => {
    clearTimeout(timeoutId);
    if (state.enrichment) {
      try {
        mergeIntoOrtb2(reqBidsConfigObj, state.enrichment);
        // Stash snapshot keyed by auctionId so analytics adapter can retrieve it
        if (reqBidsConfigObj.auctionId) {
          storeSnapshot(reqBidsConfigObj.auctionId, state.enrichment);
        }
      } catch (e) {
        logError("[stackupRtd] merge failed, auction proceeds clean", e);
      }
    }
    release();
  };

  if (state.state === "ready") {
    onReady();
  } else if (state.state === "fetching") {
    state.pendingCallbacks.push(onReady);
  } else {
    // error, timedOut, idle — give up cleanly
    clearTimeout(timeoutId);
    release();
  }
}

// Inserts a snapshot keyed by auctionId, evicting the oldest entry when the
// map exceeds MAX_SNAPSHOTS. Map insertion order is guaranteed by the spec so
// `.keys().next().value` always returns the oldest key.
function storeSnapshot(auctionId: string, snapshot: EnrichmentSnapshot): void {
  state.snapshotsByAuctionId.set(auctionId, snapshot);
  if (state.snapshotsByAuctionId.size > MAX_SNAPSHOTS) {
    const oldest = state.snapshotsByAuctionId.keys().next().value;
    state.snapshotsByAuctionId.delete(oldest);
  }
}

function mergeIntoOrtb2(
  reqBidsConfigObj: StartAuctionOptions,
  enrichment: EnrichmentSnapshot
): void {
  const global = reqBidsConfigObj.ortb2Fragments?.global ?? {};
  reqBidsConfigObj.ortb2Fragments = reqBidsConfigObj.ortb2Fragments ?? {};
  reqBidsConfigObj.ortb2Fragments.global = global;

  mergeSiteContent(global, enrichment.site.content);
  mergeUserData(global, enrichment.user.data);
}

function mergeSiteContent(global: any, ours: any): void {
  global.site = global.site ?? {};
  global.site.content = global.site.content ?? { data: [] };
  const target = global.site.content;

  target.id = target.id ?? ours.id;
  target.title = target.title ?? ours.title;

  // Array merge by provider name
  target.data = target.data ?? [];
  for (const ourBlock of ours.data) {
    const existingIdx = target.data.findIndex(
      (b: any) => b.name === ourBlock.name
    );
    if (existingIdx >= 0) {
      target.data[existingIdx] = dedupeSegments(ourBlock);
    } else {
      target.data.push(dedupeSegments(ourBlock));
    }
  }

  // Extension merge — publisher wins on conflict
  target.ext = target.ext ?? {};
  if (!target.ext.brand_safety && ours.ext?.brand_safety) {
    target.ext.brand_safety = ours.ext.brand_safety;
  }
  if (!target.ext.emotion && ours.ext?.emotion) {
    target.ext.emotion = ours.ext.emotion;
  }
}

function mergeUserData(global: any, ours: any[]): void {
  global.user = global.user ?? {};
  global.user.data = global.user.data ?? [];

  for (const ourBlock of ours) {
    const existingIdx = global.user.data.findIndex(
      (b: any) => b.name === ourBlock.name
    );
    if (existingIdx >= 0) {
      global.user.data[existingIdx] = dedupeSegments(ourBlock);
    } else {
      global.user.data.push(dedupeSegments(ourBlock));
    }
  }
}

function dedupeSegments(block: any): any {
  const byId = new Map<string, any>();
  for (const seg of block.segment) {
    const existing = byId.get(seg.id);
    if (!existing) {
      byId.set(seg.id, seg);
      continue;
    }
    const ourConf = seg.ext?.confidence ?? 0;
    const theirConf = existing.ext?.confidence ?? 0;
    if (ourConf > theirConf) byId.set(seg.id, seg);
  }
  return { ...block, segment: Array.from(byId.values()) };
}

function registerSubmodule() {
  submodule(MODULE_TYPE, subModuleObj as unknown as RtdProviderSpec<string>);
}

registerSubmodule();

// Exported only for unit tests — returns the current size of the snapshot map.
export function _snapshotMapSizeForTesting(): number {
  return state.snapshotsByAuctionId.size;
}

// Exported only for unit tests — resets the module-level singleton between test cases.
export function _resetStateForTesting(): void {
  state.state = "idle";
  state.articleId = null;
  state.enrichment = null;
  state.fetchPromise = null;
  state.fetchAbortController = null;
  state.pendingCallbacks.length = 0;
  state.snapshotsByAuctionId.clear();
  inMemoryEnrichmentCache.clear();
  state.config = null as any;
}
