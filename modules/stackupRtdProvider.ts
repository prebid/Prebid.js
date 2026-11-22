import { fetch as prebidFetch } from "../src/ajax.ts";
import { AllConsentData, gdprDataHandler } from "../src/consentHandler.ts";
import { getHook, submodule } from "../src/hook.js";
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
  deepClone,
  generateUUID,
} from "../src/utils.js";
import { getRefererInfo } from "../src/refererDetection.js";
import {
  recordAuctionEnrichment,
  resetAuctionEnrichments,
  type AuctionEnrichmentStatus,
  type EnrichmentSnapshot,
} from "../libraries/stackupUtils/enrichment.js";
import type { RTDProviderConfig, RtdProviderSpec } from "./rtdModule/spec.ts";

// TCF purposes declared for the sessionStorage cache in the storage disclosure,
// as in metadata/modules/stackupRtdProvider.json:
//   1 = Store and/or access information on a device
//   4 = Use profiles to select personalised advertising
const STORAGE_PURPOSES = [1, 4];

const MODULE_NAME = "stackupRtd";
const MODULE_TYPE = "realTimeData";
const DEFAULT_TIMEOUT = 300;
// Upper bound for the shared enrichment fetch, independent of any auction.
const FETCH_TIMEOUT = 3000;
// Runs right after rtdModule's own startAuction hook (priority 20), so it sees
// every auction the moment core releases it, before the auction is created.
const RELEASE_HOOK_PRIORITY = 19;
// In-memory cache entries kept at once: a long single-page-app session can visit
// many articles, and without a cap the map would grow for the page's lifetime.
const MAX_MEMORY_CACHE_ENTRIES = 20;
const DEFAULT_API_URL = "https://api.stackup-ai.com/v1/enrich-ortb-rtd";
const CACHE_KEY_PREFIX = "stackup:enrich:v1:";
// Bumped whenever the cached snapshot changes shape, so that entries written by
// an earlier version of the module are fetched again rather than served without
// the new fields. 3: site.keywords and site.ext.data.
const CACHE_SCHEMA_VERSION = 3;
const CONTENT_SEGTAXES = new Set([6, 9, 502]);
const USER_SEGTAXES = new Set([4, 501]);
// Site category arrays governed by a single `site.cattax`.
const SITE_CATEGORY_FIELDS = ["cat", "sectioncat", "pagecat"];

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

type RtdState =
  | "idle"
  | "initializing"
  | "fetching"
  | "ready"
  | "error";

interface RtdInternalState {
  state: RtdState;
  articleId: string | null;
  enrichment: EnrichmentSnapshot | null;
  fetchPromise: Promise<EnrichmentSnapshot> | null;
  fetchAbortController: AbortController | null;
  pendingCallbacks: Array<() => void>;
  config: RTDProviderConfig<"stackupRtd">;
  // The enrichment came from the API and is not in the cache yet.
  unsaved: boolean;
  // The cache has been looked up for the current article.
  cacheChecked: boolean;
}

const state: RtdInternalState = {
  state: "idle",
  articleId: null,
  enrichment: null,
  fetchPromise: null,
  fetchAbortController: null,
  pendingCallbacks: [],
  config: null as any,
  unsaved: false,
  cacheChecked: false,
};

// Auctions held for the enrichment, by auction ID, each with what releases it.
const waitingAuctions = new Map<string, () => void>();

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

export type {
  EnrichmentSnapshot,
  Ortb2ContentSegment,
  Ortb2UserSegment,
} from "../libraries/stackupUtils/enrichment.js";

// Raw JSON shape returned by the Stackup enrichment API.
// Mirrors EnrichmentSnapshot.site/user but without the client-added fields
// (articleId, fetchedAt, source) that are stamped on after a successful fetch.
interface RawEnrichmentResponse {
  site: EnrichmentSnapshot["site"];
  user?: Partial<EnrichmentSnapshot["user"]>;
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
  disclosureURL: "local://modules/stackupRtdProvider.json",
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
    purposes: STORAGE_PURPOSES,
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

  // No request when consent already rules enrichment out (GDPR applies, or COPPA)
  if (!enrichmentAllowed(userConsent)) {
    logInfo("[stackupRtd] consent rules out enrichment, module inert");
    state.state = "error";
    return false;
  }
  let articleId: string | null;
  try {
    articleId = resolveArticleId(params).id;
  } catch (e) {
    logError("[stackupRtd] article id resolution failed", e);
    state.state = "error";
    return false;
  }
  if (!articleId) {
    logWarn("[stackupRtd] no article ID resolved, module inert");
    state.state = "error";
    return false;
  }

  // Kick off background fetch — do not await
  loadEnrichment(articleId, params);
  return true;
}

// Makes `articleId` the article the module enriches auctions with. Called at
// init, and again whenever a single-page app has moved on to another article:
// whatever was loaded or loading for the previous one is dropped.
function loadEnrichment(articleId: string, params: StackupRtdParams): void {
  // The previous page is gone: stop its fetch, and let auctions still waiting
  // for it go now (they find no enrichment for their article).
  state.fetchAbortController?.abort();
  state.fetchAbortController = null;
  state.fetchPromise = null;
  state.articleId = articleId;
  state.enrichment = null;
  state.state = "fetching";
  state.unsaved = false;
  state.cacheChecked = false;
  drainPendingCallbacks();

  if (cacheUsable() && useCachedEnrichment(articleId)) {
    // Synchronous, so an auction for an article seen earlier is enriched at
    // once, whether or not core waits for us.
    return;
  }

  const ctl = new AbortController();
  state.fetchAbortController = ctl;
  // Results of a fetch that was superseded by a later navigation are ignored.
  const isCurrent = () => state.fetchAbortController === ctl;
  state.fetchPromise = fetchEnrichment(articleId, params, ctl);
  state.fetchPromise
    .then((data) => {
      if (!isCurrent()) return;
      state.enrichment = data;
      state.unsaved = true;
      state.state = "ready";
      saveEnrichment();
      drainPendingCallbacks();
    })
    .catch((err) => {
      if (!isCurrent()) return;
      logError("[stackupRtd] fetch failed", err);
      state.state = "error";
      drainPendingCallbacks();
    });
}

// sessionStorage is device storage: it is used only while consent says GDPR
// doesn't apply. The in-memory cache is not, and is always usable.
function cacheUsable(): boolean {
  return getCacheConfig().storage === "memory" || storageAllowed();
}

// Asked of the consent module at every storage access, not remembered: it has
// no answer until the CMP gives one (none at all with an unsupported cmpApi),
// and the CMP may change its answer later. A page without a GDPR consent module
// gets no such signal; a consent module configured only after realTimeData
// counts from the moment it is enabled.
function storageAllowed(): boolean {
  return (
    !gdprDataHandler.enabled ||
    deepAccess(gdprDataHandler.getConsentData(), "gdprApplies") === false
  );
}

// Looks up the cache for `articleId`; makes it the enrichment on a hit.
function useCachedEnrichment(articleId: string): boolean {
  state.cacheChecked = true;
  const cached = getCachedEnrichment(articleId);
  if (!cached) return false;
  state.enrichment = { ...cached, source: "cache" };
  state.unsaved = false;
  state.state = "ready";
  return true;
}

// Writes an enrichment fetched from the API to the cache, once it may be used.
function saveEnrichment(): void {
  if (!state.unsaved || !state.enrichment || !cacheUsable()) return;
  state.unsaved = false;
  setCachedEnrichment(state.enrichment.articleId, state.enrichment);
}

// Builds the enrichment API request URL from the resolved articleId and publisher params.
// TODO: link to Stackup API documentation once published.
function buildEnrichmentUrl(
  articleId: string,
  params: StackupRtdParams
): string {
  const base = params.apiUrl ?? DEFAULT_API_URL;
  const domain = requestDomain(params);
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
  params: StackupRtdParams,
  ctl: AbortController
): Promise<EnrichmentSnapshot> {
  // The fetch is shared by every auction on the page, so an auction that stops
  // waiting for it must not cancel it: letting it land (and get cached) is what
  // enriches the auctions that follow. It is bounded here rather than by
  // prebidFetch's own timeout, which publishers can turn off (disableAjaxTimeout).
  const fetchTimer = setTimeout(() => ctl.abort(), FETCH_TIMEOUT);
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
          ...(data.site.cattax !== undefined
            ? { cattax: data.site.cattax }
            : {}),
          ...(data.site.pagecat !== undefined
            ? { pagecat: data.site.pagecat }
            : {}),
          ...siteFirstPartyData(data.site),
          content: { ...data.site.content },
        },
        user: { data: data.user?.data ?? [] },
      };
      // Not cached here: consent may not allow storage yet (see saveEnrichment).
      return snapshot;
    })
    .finally(() => clearTimeout(fetchTimer));
}

// site.keywords and site.ext.data are optional extras: a value of the wrong
// type is left out instead of failing the response, so it cannot cost the
// auction the segments that came with it.
function siteFirstPartyData(
  site: any
): Pick<EnrichmentSnapshot["site"], "keywords" | "ext"> {
  const keywords = keywordTokens(site.keywords);
  const extData = site.ext?.data;
  return {
    ...(keywords.length > 0 ? { keywords: keywords.join(",") } : {}),
    ...(isPlainObject(extData) && Object.keys(extData).length > 0
      ? { ext: { data: extData } }
      : {}),
  };
}

function keywordTokens(keywords: unknown): string[] {
  if (typeof keywords !== "string") return [];
  return keywords
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function isValidEnrichment(data: any): data is RawEnrichmentResponse {
  if (!isPlainObject(data)) return false;
  if (!isPlainObject(data.site) || !isPlainObject(data.site.content)) {
    return false;
  }
  if (!isArray(data.site.content.data)) return false;
  if (data.site.cattax !== undefined && !isNumber(data.site.cattax)) {
    return false;
  }
  if (
    data.site.pagecat !== undefined &&
    (!isArray(data.site.pagecat) || !data.site.pagecat.every(isStr))
  ) {
    return false;
  }

  for (const block of data.site.content.data) {
    if (!isValidDataBlock(block, CONTENT_SEGTAXES)) return false;
  }

  // user.data is optional — some articles have site-level enrichment only
  if (data.user !== undefined && !isPlainObject(data.user)) return false;
  if (data.user?.data !== undefined && !isArray(data.user.data)) return false;
  for (const block of data.user?.data ?? []) {
    if (!isValidDataBlock(block, USER_SEGTAXES)) return false;
  }

  return true;
}

function isValidDataBlock(block: any, allowedSegtaxes: Set<number>): boolean {
  if (!isPlainObject(block) || !isStr(block.name)) return false;
  if (block.ext !== undefined && !isPlainObject(block.ext)) return false;
  const segtax = block.ext?.segtax;
  if (
    segtax !== undefined &&
    (!isNumber(segtax) || !allowedSegtaxes.has(segtax))
  ) {
    return false;
  }
  if (!isArray(block.segment)) return false;
  for (const segment of block.segment) {
    if (!isPlainObject(segment) || !isStr(segment.id)) return false;
    if (segment.name !== undefined && !isStr(segment.name)) return false;
    if (segment.value !== undefined && !isStr(segment.value)) return false;
    if (segment.ext !== undefined && !isPlainObject(segment.ext)) return false;
    if (segment.ext?.confidence !== undefined) {
      if (!isNumber(segment.ext.confidence)) return false;
      if (segment.ext.confidence < 0 || segment.ext.confidence > 1) return false;
    }
  }
  return true;
}

// The domain the API is asked about, which cache entries are keyed by too.
function requestDomain(params?: StackupRtdParams): string {
  // Use Prebid's referer detection so domain is correct inside iframes.
  const domain = getRefererInfo().domain ?? "";
  return params?.debug ? params.debugDomain ?? domain : domain;
}

function cacheKey(articleId: string, params?: StackupRtdParams): string {
  const p = params ?? state.config?.params;
  const domain = requestDomain(p);
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
    // sessionStorage outlives this code and anything on the page can write to
    // it: only use an entry shaped like the snapshot a fresh response gives.
    const d: EnrichmentSnapshot = parsed.d;
    if (
      !isPlainObject(d) ||
      d.articleId !== articleId ||
      !isValidEnrichment(d) ||
      !isArray(d.user?.data)
    ) {
      return null;
    }
    return d;
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
      // Map iteration follows insertion order, so the first key is the oldest
      if (inMemoryEnrichmentCache.size > MAX_MEMORY_CACHE_ENTRIES) {
        inMemoryEnrichmentCache.delete(
          inMemoryEnrichmentCache.keys().next().value
        );
      }
      return;
    }
    storage.setDataInSessionStorage(key, JSON.stringify(payload));
  } catch {
    // quota exceeded — silently ignore
  }
}

// Checked both at init and again for every auction: init runs at setConfig
// time, and the CMP lookup that consent management starts then is asynchronous,
// so the consent passed to init is usually still empty.
function enrichmentAllowed(userConsent: AllConsentData): boolean {
  // COPPA: block all processing in child-directed contexts.
  if (userConsent?.coppa === true) return false;

  // GDPR: StackUp is not on the IAB Global Vendor List, so a user cannot
  // consent to it as a vendor, whatever purposes they allow. Until it is, no
  // enrichment where GDPR applies.
  // No USP/CCPA or GPP checks — this module sends only a URL path and domain
  // to the enrichment API; no user identifiers are transmitted or stored,
  // so US sale-of-data opt-outs have no legal basis here.
  return !deepAccess(userConsent, "gdpr.gdprApplies");
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
  userConsent: AllConsentData,
  timeout?: number
): void {
  const requestedTimeout = config.params?.timeout;
  const ownTimeout =
    isNumber(requestedTimeout) &&
    isFinite(requestedTimeout) &&
    requestedTimeout > 0
      ? requestedTimeout
      : DEFAULT_TIMEOUT;
  // Core passes its auctionDelay as the 5th argument, or 0 when it does not
  // delay auctions at all. It only waits for providers configured with
  // waitForIt; for anything else the auction starts without us, so waiting
  // would only merge into an auction whose bid requests are already built.
  const coreWaits =
    config.waitForIt === true && isNumber(timeout) && timeout > 0;
  // Core's timer started before any provider ran: when auctionDelay is the
  // shorter bound, ours would expire after it, so releaseWaitingAuction releases
  // the auction as core lets it go.
  const effectiveTimeout = coreWaits ? Math.min(ownTimeout, timeout) : 0;

  // The auction keeps an ID already set on the request, by the publisher or by
  // priceFloors (its requestBids hook runs before the RTD providers). Without
  // one, core only generates it once the RTD providers have run: set it now so
  // what we do here can be recorded for analytics under the auction's ID.
  const auctionId = (reqBidsConfigObj.auctionId =
    reqBidsConfigObj.auctionId || generateUUID());

  // A single-page app changes the page without reloading Prebid: find the
  // article this auction is for. Nothing to find if init never succeeded.
  const params = config.params ?? state.config?.params;
  const articleId =
    state.articleId === null || !params ? null : resolveArticleId(params).id;

  let callbackFired = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const release = (
    status: AuctionEnrichmentStatus,
    enrichment: EnrichmentSnapshot | null = null
  ) => {
    if (callbackFired) return; // CRITICAL — never call back twice
    callbackFired = true;
    clearTimeout(timeoutId);
    // A released auction no longer needs the fetch; do not keep it alive until then.
    const pending = state.pendingCallbacks.indexOf(onReady);
    if (pending >= 0) state.pendingCallbacks.splice(pending, 1);
    if (waitingAuctions.get(auctionId) === releaseByCore) {
      waitingAuctions.delete(auctionId);
    }
    recordAuctionEnrichment({ auctionId, status, enrichment });
    callback();
  };

  const onReady = () => {
    if (callbackFired) return;
    if (!state.enrichment || state.enrichment.articleId !== articleId) {
      release("unavailable");
      return;
    }
    let merged: EnrichmentSnapshot;
    try {
      merged = mergeIntoOrtb2(reqBidsConfigObj, state.enrichment);
    } catch (e) {
      logError("[stackupRtd] merge failed, auction proceeds clean", e);
      release("error");
      return;
    }
    release("enriched", merged);
  };

  // Core started the auction without us: an enrichment arriving from now on
  // would reach neither the bid requests nor this auction's record.
  const releaseByCore = () => {
    logWarn(
      "[stackupRtd] auctionDelay ended before the enrichment arrived, auction proceeds clean"
    );
    release("timedOut");
  };

  // This auction's consent is already known: when it rules enrichment out, do
  // not hold the auction for a result that would be discarded.
  if (!enrichmentAllowed(userConsent)) {
    logInfo("[stackupRtd] consent rules out enrichment, auction proceeds clean");
    release("noConsent");
    return;
  }

  if (!articleId) {
    release("unavailable");
    return;
  }
  // Consent may have come to allow the cache since the fetch landed: save what
  // was fetched before it could be, then look for this article.
  saveEnrichment();
  if (articleId !== state.articleId) {
    loadEnrichment(articleId, params);
  } else if (
    state.state !== "ready" &&
    !state.cacheChecked &&
    cacheUsable() &&
    useCachedEnrichment(articleId)
  ) {
    // init could not read the cache: the hit enriches this auction at once, and
    // the fetch init started would only bring the same data again
    const ctl = state.fetchAbortController;
    state.fetchAbortController = null; // its result is ignored from now on
    state.fetchPromise = null;
    ctl?.abort();
  }

  if (state.state === "ready") {
    onReady();
    return;
  }
  if (state.state !== "fetching") {
    // error, idle — give up cleanly
    release("unavailable");
    return;
  }
  if (!coreWaits) {
    release("timedOut");
    return;
  }

  state.pendingCallbacks.push(onReady);
  waitingAuctions.set(auctionId, releaseByCore);
  // Safety net — always release the auction, no matter what. Only this auction
  // stops waiting; the shared fetch keeps going for the auctions that follow.
  timeoutId = setTimeout(() => {
    logWarn(
      "[stackupRtd] enrichment fetch exceeded " +
        effectiveTimeout +
        "ms, releasing auction clean"
    );
    release("timedOut");
  }, effectiveTimeout);
}

function mergeIntoOrtb2(
  reqBidsConfigObj: StartAuctionOptions,
  enrichment: EnrichmentSnapshot
): EnrichmentSnapshot {
  // RTD providers receive a guarded ortb2Fragments whose `global` is
  // getter-only: assigning to it throws in strict mode, so only fill it in
  // when it is missing.
  const fragments =
    reqBidsConfigObj.ortb2Fragments ??
    (reqBidsConfigObj.ortb2Fragments = {} as any);
  if (!fragments.global) fragments.global = {};
  const global = fragments.global;

  // The snapshot is shared by every auction on the page; merge a copy so that
  // whatever later edits this auction's ortb2 cannot reach the next auction.
  const ours = deepClone(enrichment);
  mergeSiteContent(global, ours.site);
  mergeSiteKeywords(global, ours.site.keywords);
  mergeSiteExtData(global, ours.site.ext?.data);
  const userDataAdded = mergeUserData(global, ours.user.data);
  // Return what reached the auction, for its record: activity controls can keep
  // our user.data out of it.
  return userDataAdded || enrichment.user.data.length === 0
    ? enrichment
    : { ...enrichment, user: { data: [] } };
}

// One comma-separated list: the publisher's tokens first, then ours that are
// not already in it. The publisher's value is left as it is when we have
// nothing new to add, or when it is not a string.
function mergeSiteKeywords(global: any, ours: unknown): void {
  const publisher = global.site?.keywords;
  if (publisher !== undefined && !isStr(publisher)) return;

  const tokens = keywordTokens(publisher);
  const seen = new Set(tokens);
  const added = keywordTokens(ours).filter((token) => {
    if (seen.has(token)) return false;
    seen.add(token);
    return true;
  });
  if (added.length === 0) return;

  global.site = global.site ?? {};
  global.site.keywords = [...tokens, ...added].join(",");
}

// Adds only the keys the publisher has not set. A publisher site.ext or
// site.ext.data that is not an object is left alone.
function mergeSiteExtData(global: any, ours: unknown): void {
  if (!isPlainObject(ours) || Object.keys(ours).length === 0) return;
  const ext = global.site?.ext;
  if (ext !== undefined && !isPlainObject(ext)) return;
  const data = ext?.data;
  if (data !== undefined && !isPlainObject(data)) return;

  global.site = global.site ?? {};
  global.site.ext = global.site.ext ?? {};
  if (data === undefined) {
    global.site.ext.data = { ...(ours as Record<string, unknown>) };
    return;
  }
  for (const [key, value] of Object.entries(ours as Record<string, unknown>)) {
    if (!(key in data)) data[key] = value;
  }
}

// The merges below only create objects they are about to fill: an empty
// site.content.data or user.data in the bid request would read as first-party
// data the publisher never sent.
function mergeSiteContent(global: any, ours: EnrichmentSnapshot["site"]): void {
  const ourContent = ours.content;
  const hasContent =
    ourContent.id !== undefined ||
    ourContent.title !== undefined ||
    ourContent.data.length > 0 ||
    ourContent.ext !== undefined;
  const hasCategories = ours.cattax !== undefined && ours.pagecat !== undefined;
  if (!hasContent && !hasCategories) return;

  global.site = global.site ?? {};
  mergeSiteCategories(global.site, ours);
  if (!hasContent) return;
  global.site.content = global.site.content ?? {};
  const target = global.site.content;

  if (target.id === undefined && ourContent.id !== undefined) {
    target.id = ourContent.id;
  }
  if (target.title === undefined && ourContent.title !== undefined) {
    target.title = ourContent.title;
  }

  if (ourContent.data.length > 0) {
    target.data = isArray(target.data) ? target.data : [];
    mergeDataBlocks(target.data, ourContent.data);
  }

  if (ourContent.ext !== undefined) {
    target.ext = mergeContentExtPublisherFirst(target.ext, ourContent.ext);
  }
}

// `site.cattax` declares the taxonomy of `cat[]`, `sectioncat[]` and
// `pagecat[]` at once, and is read as 1 (IAB Content Category Taxonomy 1.0)
// when omitted. The pair is therefore only safe to adopt when both of these
// hold:
//   - the response carries both halves — a lone `pagecat` would be read under
//     the default taxonomy rather than StackUp's, and a lone `cattax` would
//     relabel categories we did not supply;
//   - the publisher declared no site categories at all — writing our `cattax`
//     alongside a publisher `cat`/`sectioncat`/`pagecat` would silently
//     reinterpret their ids, even though those arrays are left untouched.
function mergeSiteCategories(
  site: any,
  ours: EnrichmentSnapshot["site"]
): void {
  if (ours.cattax === undefined || ours.pagecat === undefined) return;
  if (site.cattax !== undefined) return;
  const publisherHasCategories = SITE_CATEGORY_FIELDS.some(
    (field) => isArray(site[field]) && site[field].length
  );
  if (publisherHasCategories) return;

  site.cattax = ours.cattax;
  site.pagecat = ours.pagecat;
}

// Returns whether our blocks ended up in user.data.
function mergeUserData(global: any, ours: any[]): boolean {
  if (ours.length === 0) return false;
  const created = !global.user;
  if (created) global.user = {};
  const user = global.user;
  // Activity controls can hide the publisher's user.data from our reads
  // (transmitUfpd) or drop our writes to it (enrichUfpd). `in` still sees
  // data we cannot read, so we never overwrite it.
  if ("data" in user) {
    const data = user.data;
    if (!isArray(data)) return false;
    mergeDataBlocks(data, ours);
    // enrichUfpd drops these writes without an error: check that they landed.
    // Read the array we merged into: transmitUfpd lets an empty user.data
    // through, but hides it once our merge has filled it.
    return hasDataBlocks(data, ours);
  }

  // Write the merged list in one assignment: the guard lets an empty array
  // through even under enrichUfpd, so `user.data = []` followed by pushes
  // would leave an empty list behind.
  const data: any[] = [];
  mergeDataBlocks(data, ours);
  user.data = data;
  if ("data" in user) return true;
  if (created) {
    // enrichUfpd dropped the write: the user object we created for it would
    // reach bidders empty. `user` itself is not write-protected, so the delete
    // goes through the guard.
    delete global.user;
  }
  return false;
}

// Whether every segment of ours is in target, in a block with the same key.
function hasDataBlocks(target: any[], ours: any[]): boolean {
  return ours.every((ourBlock) => {
    const key = dataBlockKey(ourBlock);
    const block = target.find((candidate: any) => dataBlockKey(candidate) === key);
    const ids = new Set(
      (isArray(block?.segment) ? block.segment : []).map((seg: any) => seg?.id)
    );
    return ourBlock.segment.every((seg: any) => ids.has(seg.id));
  });
}

function mergeDataBlocks(target: any[], ours: any[]): void {
  for (const ourBlock of ours) {
    const dedupedOurs = dedupeSegments(ourBlock);
    const key = dataBlockKey(dedupedOurs);
    const existingIdx = target.findIndex(
      (block: any) => dataBlockKey(block) === key
    );
    if (existingIdx >= 0) {
      target[existingIdx] = mergeDataBlock(target[existingIdx], dedupedOurs);
    } else {
      target.push(dedupedOurs);
    }
  }
}

function dataBlockKey(block: any): string {
  const name = isStr(block?.name) ? block.name : "";
  const segtax = isNumber(block?.ext?.segtax) ? block.ext.segtax : "";
  const dimension = isStr(block?.ext?.stackup?.dimension)
    ? block.ext.stackup.dimension
    : "";
  return `${name}\u0000${segtax}\u0000${dimension}`;
}

function mergeDataBlock(publisherBlock: any, stackupBlock: any): any {
  const publisher = dedupeSegments(publisherBlock);
  const stackup = dedupeSegments(stackupBlock);
  const segments = [...publisher.segment];
  const publisherIds = new Set(segments.map((segment: any) => segment?.id));
  for (const segment of stackup.segment) {
    if (!publisherIds.has(segment.id)) {
      publisherIds.add(segment.id);
      segments.push(segment);
    }
  }
  return {
    ...stackup,
    ...publisher,
    ext: mergeDataBlockExtPublisherFirst(publisher.ext, stackup.ext),
    segment: segments,
  };
}

function mergeDataBlockExtPublisherFirst(publisher: any, stackup: any): any {
  if (!isPlainObject(stackup)) return publisher;
  if (!isPlainObject(publisher)) return stackup;

  const merged = { ...stackup, ...publisher };
  if (isPlainObject(stackup.stackup) && isPlainObject(publisher.stackup)) {
    merged.stackup = { ...stackup.stackup, ...publisher.stackup };
  }
  return merged;
}

function dedupeSegments(block: any): any {
  const byId = new Map<string, any>();
  for (const seg of isArray(block?.segment) ? block.segment : []) {
    // A publisher segment may not be an object; keep it rather than throw.
    const existing = byId.get(seg?.id);
    if (!existing) {
      byId.set(seg?.id, seg);
      continue;
    }
    const ourConf = seg?.ext?.confidence ?? 0;
    const theirConf = existing.ext?.confidence ?? 0;
    if (ourConf > theirConf) byId.set(seg.id, seg);
  }
  return { ...block, segment: Array.from(byId.values()) };
}

function mergeContentExtPublisherFirst(publisher: any, stackup: any): any {
  if (!isPlainObject(stackup)) return publisher;
  if (!isPlainObject(publisher)) return stackup;

  const merged = { ...stackup, ...publisher };
  if (isPlainObject(stackup.stackup) && isPlainObject(publisher.stackup)) {
    merged.stackup = { ...stackup.stackup, ...publisher.stackup };
  }
  return merged;
}

// rtdModule calls this once it stops waiting for its providers, by its
// auctionDelay timer or because every one of them is done. An auction we still
// hold was let go by the timer: release it now, before the auction is created,
// so that a late enrichment can't be merged into it or recorded as enriched.
export function releaseWaitingAuction(next, reqBidsConfigObj?: StartAuctionOptions) {
  waitingAuctions.get(reqBidsConfigObj?.auctionId)?.();
  next.call(this, reqBidsConfigObj);
}

function registerSubmodule() {
  submodule(MODULE_TYPE, subModuleObj as unknown as RtdProviderSpec<string>);
  getHook("startAuction").before(releaseWaitingAuction, RELEASE_HOOK_PRIORITY);
}

registerSubmodule();

// Exported only for unit tests — resets the module-level singleton between test cases.
export function _resetStateForTesting(): void {
  state.state = "idle";
  state.articleId = null;
  state.enrichment = null;
  state.fetchPromise = null;
  state.fetchAbortController?.abort();
  state.fetchAbortController = null;
  state.pendingCallbacks.length = 0;
  waitingAuctions.clear();
  resetAuctionEnrichments();
  inMemoryEnrichmentCache.clear();
  state.config = null as any;
  state.unsaved = false;
  state.cacheChecked = false;
}
