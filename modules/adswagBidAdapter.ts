import { getUserSyncParams } from "../libraries/userSyncUtils/userSyncUtils.js";
import { type BidderSpec, registerBidder } from "../src/adapters/bidderFactory.js";
import { ajax } from "../src/ajax.js";
import { AUDIO, BANNER, VIDEO } from "../src/mediaTypes.js";
import { config } from "../src/config.js";
import { Renderer } from "../src/Renderer.js";
import { getStorageManager } from "../src/storageManager.js";
import {
  deepAccess,
  deepSetValue,
  formatQS,
  generateUUID,
  isArray,
  isFn,
  isPlainObject,
  isStr,
  logError,
  logWarn,
} from "../src/utils.js";

// Adswag Prebid.js bid adapter — client-side banner + video (web incl.
// CTV-derived) + audio. Native is deliberately NOT declared (owner decision
// 2026-08-10): Prebid's submission checklist requires every declared media
// type's documented test unit to consistently return creatives, and the
// platform cannot serve native yet — declaring it would fail that
// requirement. Native support returns as a follow-up PR when platform-side
// native serving ships; until then native objects on mixed units
// are simply ignored (the unit's other media types still bid).
// Talks to the Adswag bid endpoint (POST /prebid/bid) with an OpenRTB 2.6
// JSON body and maps the OpenRTB bid response back to Prebid bids.
// Publisher-side code: FAIL-OPEN in every path — no throw ever reaches the
// page or the auction; every failure degrades to a clean no-bid.
//
// Requests are sent as Prebid's default object payload (text/plain content
// type): the server never inspects Content-Type (it json-decodes the raw
// body), so the POST stays a CORS *simple request* — no preflight. Do not
// add a contentType option without a server-side reason.

// Prebid's FEATURES build flag object (webpack DefinePlugin constant in real
// Prebid.js builds; a runtime global in the in-repo test env). Declared here
// so the TS compiler accepts the bare references; the try/catch guards at
// every use site keep a missing global from failing any bid.
declare const FEATURES: { AUDIO?: boolean };

// --- types -------------------------------------------------------------------

/** Bidder params on `bids[].params` (documented in adswagBidAdapter.md). */
export interface AdswagBidParams {
  /** Adswag publisher id (issued at onboarding). Required. */
  publisherId: string;
  /** Explicit placement override; omit to let GPID/adUnitCode resolve it. */
  placementId?: string;
  /** Static floor (EUR), used only when the floors module isn't configured. */
  bidFloor?: number;
  /**
   * Adswag bid endpoint URL (in-repo/self-distributed builds; the upstream
   * variant hardcodes the production endpoint — see resolveEndpoint).
   */
  endpoint?: string;
  /** Overrides for mediaTypes.video ad-unit params. */
  video?: Record<string, unknown>;
}

/**
 * The `adswag` global-config namespace: `pbjs.setConfig({ adswag: { … } })`.
 */
export interface AdswagConfig {
  /**
   * Adswag bid endpoint URL, applied to every Adswag ad unit on the page
   * (a per-bid `params.endpoint` wins over it). Honored only for hosts on
   * the `adswag.ai` domain in the upstream build — see resolveEndpoint.
   */
  endpoint?: string;
}

// Typed bid params and config namespace for TypeScript consumers
// (declaration merging into Prebid core's registries — the convention for
// new adapters: a module's public param and config surfaces are typed).
declare module "../src/adUnits" {
  interface BidderParams {
    [BIDDER_CODE]: AdswagBidParams;
  }
}

declare module "../src/config" {
  interface Config {
    [BIDDER_CODE]?: AdswagConfig;
  }
}

type Size = [number, number];

/** Per-bid metadata retained client-side on the ServerRequest (never sent). */
interface ImpMeta {
  bidId: string;
  hasBanner: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  bannerSize: Size | undefined;
  videoSize: Size | null;
  /** Outstream video the page has not brought its own renderer for. */
  outstream: boolean;
  adUnitCode: string | undefined;
}

interface AdswagServerRequest {
  method: "POST";
  url: string;
  data: string;
  options: { withCredentials: boolean };
  bidRequests: ImpMeta[];
}

/**
 * The Prebid bid object interpretResponse emits (fields shared by every
 * media type). Core's `BidResponse` is a union discriminated on `mediaType`,
 * so `OutgoingBid` mirrors that shape below.
 */
interface OutgoingBidBase {
  requestId: string;
  cpm: number;
  currency: string;
  creativeId: string;
  netRevenue: boolean;
  ttl: number;
  // Prebid core requires desirability on bid responses (BaseBidResponse);
  // the auction recomputes it (adjustDesirability, default = cpm), so the
  // adapter-set value is the documented default and never diverges.
  desirability: number;
  width?: number;
  height?: number;
  meta?: {
    advertiserDomains?: string[];
    dsa?: Record<string, unknown>;
    advertiserName?: string;
  };
  burl?: string;
}

type OutgoingBid = OutgoingBidBase &
  (
    | { mediaType: typeof BANNER; ad?: string; adUrl?: string }
    | {
      mediaType: typeof VIDEO;
      vastXml?: string;
      vastUrl?: string;
      /** Set on outstream wins only (createRenderer). */
      renderer?: InstanceType<typeof Renderer>;
    }
    | { mediaType: typeof AUDIO; vastXml?: string; vastUrl?: string }
  );

const BIDDER_CODE = "adswag";
// IAB TCF vendor id (GVL 1417). Prebid core may suppress bidders without a
// gvlid when GDPR applies — Adswag is EU-only, so this is launch-relevant.
const GVLID = 1417;
const DEFAULT_CURRENCY = "EUR"; // all Adswag bids are EUR
// The server omits ttl on the bid response; conservative adapter default so
// cached bids expire quickly.
const DEFAULT_TTL = 300;
// The Adswag first-party UUID (consent-gated — see consentPermissions),
// stored per publisher domain and carried as an eid with the adswag.ai
// source (owner decision 2026-08-06: the eid source matches the endpoint +
// maintainer-contact domain family; frozen permanently at upstream
// submission).
const ADSWAG_UUID_KEY = "adswag_uuid";
const ADSWAG_EID_SOURCE = "adswag.ai";
const UUID_COOKIE_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 365d (cookie path)

// Stable user-sync surface (owner decision 2026-08-06): the adapter
// references exactly these two URLs, forever; everything that ever changes
// (no-op → first-party minting → redirect chains) is server-side behavior
// behind them. They launch as consent-validating no-ops server-side.
const SYNC_IFRAME_URL = "https://ev.adswag.ai/sync/iframe";
const SYNC_PIXEL_URL = "https://ev.adswag.ai/sync/pixel";

// Outstream renderer, loaded by core only when an outstream video bid wins,
// so it costs nothing on every other auction. Deliberately a CHANNEL ALIAS
// and not a version-pinned URL: this file lives in the Prebid.js release
// train, and a player fix must not need an upstream PR to reach publishers.
// The object behind it is a ~1 KB bootstrap that in turn loads a pinned,
// immutable player build. `v1` versions the renderer's contract with this
// adapter — a breaking change there gets a new path and a new adapter PR.
const RENDERER_URL = "https://player.adswag.ai/outstream/v1/renderer.js";

// In real Prebid builds every StorageManager access runs through core's
// activity controls (deviceAccess + TCF enforcement on gvlid 1417); the
// adapter's own purpose-1 gate below is belt-and-braces on top (no
// identifier is stored or read without consent).
export const storage = getStorageManager({ bidderCode: BIDDER_CODE });

// Transport indirection for fire-and-forget notices, so tests can stub the
// network layer without touching globals.
export const dep = { ajax };

function isNonEmptyStr(v: unknown): v is string {
  return isStr(v) && (v as string).trim() !== "";
}

// normalizeSizes accepts [w,h] or [[w,h], ...] and returns [[w,h], ...] of
// positive integers only.
function normalizeSizes(sizes): Size[] {
  if (!isArray(sizes)) return [];
  const list =
    sizes.length === 2 && !isArray(sizes[0]) ? [sizes] : sizes;
  const out: Size[] = [];
  for (const s of list) {
    if (!isArray(s) || s.length < 2) continue;
    const w = Number(s[0]);
    const h = Number(s[1]);
    if (Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0) {
      out.push([w, h]);
    }
  }
  return out;
}

// getBannerSizes derives banner formats from the DECLARED banner media type.
//
// `bid.sizes` is not publisher input: core sets it to
// `mediaTypes.banner.sizes || mediaTypes.video.playerSize || []`
// (src/adapterManager.ts), so on a video-only unit it holds the player size.
// Reading it unconditionally would fabricate a banner format for an imp that
// declared no banner, turning the canonical Prebid video setup into a
// multi-format imp — and a video placement then no-bids on channel mismatch.
// So the alias is consulted only for units that declare no other media type,
// which is the legacy `sizes`-without-`mediaTypes` shape it exists for.
function getBannerSizes(bid) {
  const sizes = normalizeSizes(deepAccess(bid, "mediaTypes.banner.sizes"));
  if (sizes.length > 0) return sizes;
  if (declaresNonBannerMediaType(bid)) return [];
  return normalizeSizes(bid && bid.sizes);
}

// declaresNonBannerMediaType: does the ad unit declare video or audio? Only
// the DECLARATION matters here, not whether the params validate — a unit that
// declared video with broken params asked for video, not for a banner at its
// player size. `mediaTypes` is the surface to check because it is the one core
// derives the `sizes` alias from; the audio-via-ortb2Imp path cannot produce a
// stale alias in the first place.
function declaresNonBannerMediaType(bid) {
  return (
    isPlainObject(deepAccess(bid, "mediaTypes.video")) ||
    isPlainObject(deepAccess(bid, "mediaTypes.audio"))
  );
}

// --- video -----------------------------------------------------------------

// getVideoParams merges mediaTypes.video with params.video (bidder config
// overrides the ad unit, per the Prebid 4.0 video-params convention). All
// documented video params are READ here; only the subset the server's
// OpenRTB video model accepts is EMITTED (buildVideo) — read broadly,
// emit narrowly.
function getVideoParams(bid) {
  const mt = deepAccess(bid, "mediaTypes.video");
  if (!isPlainObject(mt)) return null;
  const overrides = deepAccess(bid, "params.video");
  return isPlainObject(overrides) ? { ...mt, ...overrides } : { ...mt };
}

function isValidVideo(video) {
  // Prebid video rule: mimes is the required minimum; everything else is
  // lenient/fail-open.
  return (
    isPlainObject(video) &&
    isArray(video.mimes) &&
    video.mimes.filter(isNonEmptyStr).length > 0
  );
}

function hasValidVideo(bid) {
  return isValidVideo(getVideoParams(bid));
}

// videoPlayerSize accepts playerSize as [w,h] or [[w,h]] per Prebid docs.
function videoPlayerSize(video) {
  const sizes = normalizeSizes(video && video.playerSize);
  return sizes.length ? sizes[0] : null;
}

function positiveInt(v) {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// context instream/outstream → video.plcmt (2.6 subtypes), matching the
// server's placement mapping: 1 = instream, 4 = standalone — the server
// treats both 2 and 4 as outstream.
function derivePlcmt(video) {
  const explicit = positiveInt(video.plcmt);
  if (explicit && explicit <= 4) return explicit;
  if (video.context === "instream") return 1;
  if (video.context === "outstream") return 4;
  return null;
}

// buildVideo emits exactly the fields the server's OpenRTB video model
// accepts: mimes, minduration, maxduration, protocols, w/h, plcmt,
// linearity, skip, skipafter. Params the adapter reads but the server has
// no field for (startdelay, placement (legacy), minbitrate, maxbitrate,
// delivery, playbackmethod, api) are deliberately dropped — a signal the
// server does not model does not exist to the platform. Pod fields ride
// the CTV ad-server path, never this adapter.
function buildVideo(video) {
  const out: Record<string, any> = { mimes: video.mimes.filter(isNonEmptyStr) };
  const minDur = positiveInt(video.minduration);
  // minduration 0 is a valid "no minimum" and matches Go's zero value: omit.
  if (minDur) out.minduration = minDur;
  const maxDur = positiveInt(video.maxduration);
  if (maxDur) out.maxduration = maxDur;
  if (isArray(video.protocols)) {
    const protocols = video.protocols.map(positiveInt).filter(Boolean);
    if (protocols.length) out.protocols = protocols;
  }
  const size = videoPlayerSize(video);
  if (size) {
    out.w = size[0];
    out.h = size[1];
  } else {
    const w = positiveInt(video.w);
    const h = positiveInt(video.h);
    if (w && h) {
      out.w = w;
      out.h = h;
    }
  }
  const plcmt = derivePlcmt(video);
  if (plcmt) out.plcmt = plcmt;
  const linearity = positiveInt(video.linearity);
  if (linearity) out.linearity = linearity;
  if (video.skip === 0 || video.skip === 1) {
    out.skip = video.skip;
    const skipafter = positiveInt(video.skipafter);
    if (skipafter) out.skipafter = skipafter;
  }
  return out;
}

// --- audio -------------------------------------------------------------------
//
// Prebid.js audio media type (FEATURES.AUDIO build flag; core validates
// mediaTypes.audio like the other types). The server treats audio as its
// own channel; whether an audio impression gets a bid depends on an audio
// placement being registered — otherwise it receives
// the standard empty-200 no-bid, fail-open. Audio is also accepted as
// ortb2Imp.audio on units whose ad-server setup needs a video-typed unit
// (established bidder precedent).

// audioEnabled checks Prebid's FEATURES.AUDIO build flag (a missing global
// never fails another media type's bid — the try/catch keeps audio-less
// builds fail-open).
function audioEnabled() {
  try {
    return !!FEATURES.AUDIO;
  } catch (e) {
    return false;
  }
}

function getAudioParams(bid) {
  if (!audioEnabled()) return null;
  const mt = deepAccess(bid, "mediaTypes.audio");
  if (isPlainObject(mt)) return mt;
  const ortb2ImpAudio = deepAccess(bid, "ortb2Imp.audio");
  return isPlainObject(ortb2ImpAudio) ? ortb2ImpAudio : null;
}

function isValidAudio(audio) {
  // Same posture as video: mimes is the required minimum, the rest is
  // lenient/fail-open.
  return (
    isPlainObject(audio) &&
    isArray(audio.mimes) &&
    audio.mimes.filter(isNonEmptyStr).length > 0
  );
}

function hasValidAudio(bid) {
  return isValidAudio(getAudioParams(bid));
}

// buildAudio emits exactly the fields the server's OpenRTB audio model
// accepts on this path: mimes, minduration/maxduration,
// minbitrate/maxbitrate, protocols, feed — read broadly, emit narrowly.
// Pod fields ride the CTV/audio ad-server path, never this adapter.
function buildAudio(audio) {
  const out: Record<string, any> = { mimes: audio.mimes.filter(isNonEmptyStr) };
  const minDur = positiveInt(audio.minduration);
  if (minDur) out.minduration = minDur;
  const maxDur = positiveInt(audio.maxduration);
  if (maxDur) out.maxduration = maxDur;
  const minBr = positiveInt(audio.minbitrate);
  if (minBr) out.minbitrate = minBr;
  const maxBr = positiveInt(audio.maxbitrate);
  if (maxBr) out.maxbitrate = maxBr;
  if (isArray(audio.protocols)) {
    const protocols = audio.protocols.map(positiveInt).filter(Boolean);
    if (protocols.length) out.protocols = protocols;
  }
  const feed = positiveInt(audio.feed);
  if (feed) out.feed = feed;
  return out;
}

// DEFAULT_ENDPOINT differs between the two distributions of this module:
//   - self-distributed (authoritative source): null — no dev-host fallback,
//     an unconfigured adapter fails open to a no-bid rather than silently
//     phoning home to a host the publisher never opted into.
//   - upstream prebid/Prebid.js artifact: the production endpoint constant.
//     Publishers installing from the Prebid download page opt into the
//     Adswag production host by including the adapter (Prebid convention),
//     and Module Rules require a working default. The endpoint is frozen.
// The Adswag release tooling swaps exactly the marked line below; both
// variants share every other line of this file.
// UPSTREAM-ENDPOINT (do not edit this marker; the export script matches it)
const DEFAULT_ENDPOINT: string | null = "https://bid.adswag.ai/prebid/bid";

// isPermittedEndpoint enforces the review-checklist rule that endpoint
// domains cannot be fully variable: in the upstream distribution (which has
// a built-in default) an override is honored only for Adswag-operated hosts
// (our dev/staging test integrations); anything else is ignored and the
// request goes to the production endpoint. The self-distributed in-repo
// build has no default to protect — the endpoint is always an explicit,
// deliberate configuration — so any host is accepted there.
function isPermittedEndpoint(url: string): boolean {
  if (DEFAULT_ENDPOINT === null) return true;
  try {
    const host = new URL(url).hostname;
    return host === "adswag.ai" || host.endsWith(".adswag.ai");
  } catch (e) {
    return false;
  }
}

// resolveEndpoint: per-bid params.endpoint, then global config
// (config.setConfig({ adswag: { endpoint } })), then DEFAULT_ENDPOINT —
// overrides subject to isPermittedEndpoint. Returns null when nothing is
// configured — callers treat that as a no-bid.
function resolveEndpoint(bid): string | null {
  const paramEndpoint = deepAccess(bid, "params.endpoint");
  if (isNonEmptyStr(paramEndpoint) && isPermittedEndpoint(paramEndpoint)) {
    return paramEndpoint;
  }
  const cfg = config.getConfig(BIDDER_CODE);
  if (cfg && isNonEmptyStr(cfg.endpoint) && isPermittedEndpoint(cfg.endpoint)) {
    return cfg.endpoint;
  }
  return DEFAULT_ENDPOINT;
}

// resolveFloor prefers the Prebid floors module (bid.getFloor), falling back
// to the static params.bidFloor. Any throw from getFloor is swallowed —
// floors never block a bid.
//
// Both floors are forwarded to the wire VERBATIM. The floors module already
// rounds its result up, to four decimals, on purpose; re-rounding to two
// here would push 1.3334 down to 1.33 — a lower floor than the publisher
// configured, admitting bids the floor was meant to reject. The same rule
// applies to the static params.bidFloor: a publisher's money input is never
// silently altered by the adapter.
function resolveFloor(bid, sizes, mediaType) {
  if (isFn(bid.getFloor)) {
    try {
      const res = bid.getFloor({
        currency: DEFAULT_CURRENCY,
        mediaType,
        size: sizes.length === 1 ? sizes[0] : "*",
      });
      if (
        res &&
        typeof res.floor === "number" &&
        isFinite(res.floor) &&
        res.floor > 0
      ) {
        return { floor: res.floor, currency: res.currency || DEFAULT_CURRENCY };
      }
    } catch (e) {
      logWarn("adswag: getFloor threw, ignoring floor", e);
    }
  }
  const param = deepAccess(bid, "params.bidFloor");
  if (typeof param === "number" && isFinite(param) && param > 0) {
    return { floor: param, currency: DEFAULT_CURRENCY };
  }
  return null;
}

// buildImp emits ONE imp per ad unit with every media-type object the bid
// validly carries (mixed banner+video+audio units are one imp with all
// applicable objects present — the server normalizes per-imp).
function buildImp(bid) {
  const sizes = getBannerSizes(bid);
  const video = getVideoParams(bid);
  const audio = getAudioParams(bid);
  // OpenRTB imp object; loosely typed like the request (see buildRequests).
  const imp: Record<string, any> = { id: bid.bidId };
  if (sizes.length) {
    imp.banner = {
      format: sizes.map(([w, h]) => ({ w, h })),
      w: sizes[0][0],
      h: sizes[0][1],
    };
  }
  if (isValidVideo(video)) {
    imp.video = buildVideo(video);
  }
  if (isValidAudio(audio)) {
    imp.audio = buildAudio(audio);
  }

  // Placement identity: GPID (preferred) + adUnitCode derivation key;
  // optional explicit placementId override. The server resolves the
  // canonical placement from these — the adapter never invents a
  // placement id.
  const ext: Record<string, any> = {};
  const gpid = deepAccess(bid, "ortb2Imp.ext.gpid");
  if (isNonEmptyStr(gpid)) ext.gpid = gpid;
  const tid = deepAccess(bid, "ortb2Imp.ext.tid");
  if (isNonEmptyStr(tid)) ext.tid = tid;
  const data: Record<string, any> = {};
  if (isNonEmptyStr(bid.adUnitCode)) data.adunitcode = bid.adUnitCode;
  const pbadslot = deepAccess(bid, "ortb2Imp.ext.data.pbadslot");
  if (isNonEmptyStr(pbadslot)) data.pbadslot = pbadslot;
  if (Object.keys(data).length) ext.data = data;
  const placementId = deepAccess(bid, "params.placementId");
  if (isNonEmptyStr(placementId)) ext.adswag = { placement_id: placementId };
  if (Object.keys(ext).length) imp.ext = ext;

  const types: string[] = [];
  if (imp.banner) types.push(BANNER);
  if (imp.video) types.push(VIDEO);
  if (imp.audio) types.push(AUDIO);
  const floorMediaType = types.length === 1 ? types[0] : "*";
  // Floor size follows the resolved media type so publishers' size-keyed
  // floor rules match: banner uses the requested banner sizes, video-only
  // uses the player size, audio (sizeless by nature) and mixed-format units
  // deliberately query the '*' size bucket.
  let floorSizes: number[][] = [];
  if (floorMediaType === BANNER) {
    floorSizes = sizes;
  } else if (floorMediaType === VIDEO) {
    const playerSize = videoPlayerSize(video);
    if (playerSize) floorSizes = [playerSize];
  }
  const floor = resolveFloor(bid, floorSizes, floorMediaType);
  if (floor) {
    imp.bidfloor = floor.floor;
    imp.bidfloorcur = floor.currency;
  }
  return imp;
}

// buildSite takes the publisher id of the group it is building for (see
// groupBids): site.publisher.id is a REQUEST-level field, so it must never
// be borrowed from another ad unit's publisher account.
function buildSite(ortb2, bidderRequest, publisherId) {
  const site = isPlainObject(ortb2.site) ? { ...ortb2.site } : {};
  const refererInfo = deepAccess(bidderRequest, "refererInfo") || {};
  if (!isNonEmptyStr(site.page) && isNonEmptyStr(refererInfo.page)) {
    site.page = refererInfo.page;
  }
  if (!isNonEmptyStr(site.domain) && isNonEmptyStr(refererInfo.domain)) {
    site.domain = refererInfo.domain;
  }
  const publisher = isPlainObject(site.publisher) ? { ...site.publisher } : {};
  publisher.id = publisherId;
  site.publisher = publisher;
  return site;
}

// Device is the core-enriched ortb2.device passed through verbatim: core's
// FPD enrichment always populates device.ua (plus sua/w/h/language), so the
// adapter reads nothing from navigator itself (vendor modules must not
// access navigator directly per review rules).
function buildDevice(ortb2) {
  const device = isPlainObject(ortb2.device) ? { ...ortb2.device } : {};
  return Object.keys(device).length ? device : undefined;
}

// applyConsent forwards TCF + GPP verbatim in the shape the server parses.
// The adapter interprets nothing (the server parses the TC string once, as
// TCF vendor 1417). US privacy (USP) is not consumed by the server and is
// not sent.
function applyConsent(request, bidderRequest, ortb2) {
  const regs = isPlainObject(ortb2.regs) ? { ...ortb2.regs } : {};

  const gdprConsent = deepAccess(bidderRequest, "gdprConsent");
  if (gdprConsent && gdprConsent.gdprApplies !== undefined) {
    const applies = gdprConsent.gdprApplies ? 1 : 0;
    regs.gdpr = applies; // OpenRTB 2.6 location
    deepSetValue(regs, "ext.gdpr", applies); // legacy location most paths use
  }

  const gpp = deepAccess(bidderRequest, "gppConsent");
  const gppString = gpp && (gpp.gppString || deepAccess(ortb2, "regs.gpp"));
  if (isNonEmptyStr(gppString)) {
    regs.gpp = gppString;
    const sids = (gpp && gpp.applicableSections) || deepAccess(ortb2, "regs.gpp_sid");
    if (isArray(sids)) regs.gpp_sid = sids;
  }

  if (Object.keys(regs).length) request.regs = regs;

  const consentString = deepAccess(bidderRequest, "gdprConsent.consentString");
  if (isNonEmptyStr(consentString)) {
    deepSetValue(request, "user.ext.consent", consentString);
  }
}

// --- identity (consent-gated waterfall, graduated from the POC 2026-07-13) --
//
// The ONE consent decision the adapter makes is the browser-leg gate below;
// the server remains the authoritative consent parser and re-gates
// everything on its own consent policy and publisher permissions.
// Defensive: gdprApplies without a well-formed
// vendor-1417 grant in vendorData ⇒ NOT permitted; nothing here ever throws.

// consentPermissions → { identity, storage }: identity = eids may attach +
// request may be credentialed; storage = identity AND TCF purpose 1 (the
// layer-2 StorageManager gate).
function consentPermissions(bidderRequest) {
  try {
    const gdprConsent = deepAccess(bidderRequest, "gdprConsent");
    if (!gdprConsent || !gdprConsent.gdprApplies) {
      // gdprApplies false/undefined: out of GDPR scope — permitted.
      return { identity: true, storage: true };
    }
    const vendorOk =
      deepAccess(gdprConsent, `vendorData.vendor.consents.${GVLID}`) === true;
    const purpose1Ok =
      deepAccess(gdprConsent, "vendorData.purpose.consents.1") === true;
    return { identity: vendorOk, storage: vendorOk && purpose1Ok };
  } catch (e) {
    return { identity: false, storage: false };
  }
}

// pushEid appends a structurally valid eid, deduped by (source, uids[0].id).
function pushEid(out, seen, eid) {
  if (!isPlainObject(eid) || !isNonEmptyStr(eid.source)) return;
  if (!isArray(eid.uids) || !isPlainObject(eid.uids[0])) return;
  const id = eid.uids[0].id;
  if (!isNonEmptyStr(id)) return;
  const key = `${eid.source}\u0000${id}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(eid);
}

// Layer 2: read the Adswag first-party UUID (localStorage first, first-party
// cookie fallback); mint + persist one when absent. Returns null whenever
// storage is unavailable or throws — the layer is skipped, never an error.
function getOrCreateAdswagUuid() {
  try {
    const lsEnabled = storage.localStorageIsEnabled();
    if (lsEnabled) {
      const v = storage.getDataFromLocalStorage(ADSWAG_UUID_KEY);
      if (isNonEmptyStr(v)) return v;
    }
    const cookiesEnabled = storage.cookiesAreEnabled();
    if (cookiesEnabled) {
      const v = storage.getCookie(ADSWAG_UUID_KEY);
      if (isNonEmptyStr(v)) return v;
    }
    if (!lsEnabled && !cookiesEnabled) return null;
    const id = generateUUID();
    if (lsEnabled) {
      storage.setDataInLocalStorage(ADSWAG_UUID_KEY, id);
    } else {
      storage.setCookie(
        ADSWAG_UUID_KEY,
        id,
        new Date(Date.now() + UUID_COOKIE_TTL_MS).toUTCString(),
        "Lax",
      );
    }
    return id;
  } catch (e) {
    logWarn("adswag: storage unavailable, skipping first-party UUID", e);
    return null;
  }
}

// applyIdentity attaches user.eids (the OpenRTB 2.6 location — the server
// reads user.eids, NOT the legacy 2.5 user.ext.eids) when identity is
// permitted:
// layer 1 — userId-module eids (userIdAsEids) + publisher-provided eids
// (ortb2 user.ext.eids / user.eids, both read for compatibility), deduped;
// layer 2 — the Adswag first-party UUID (purpose-1-gated). Layer 3 (the
// server-written aswg_uid own-domain cookie) rides the credentialed
// transport, not this function.
function applyIdentity(request, validBidRequests, ortb2, perms) {
  try {
    if (!perms.identity) return;
    const out = [];
    const seen = new Set();
    for (const list of [
      deepAccess(validBidRequests[0], "userIdAsEids"),
      deepAccess(ortb2, "user.ext.eids"),
      deepAccess(ortb2, "user.eids"),
    ]) {
      if (isArray(list)) for (const eid of list) pushEid(out, seen, eid);
    }
    if (perms.storage) {
      const uuid = getOrCreateAdswagUuid();
      if (uuid) {
        pushEid(out, seen, {
          source: ADSWAG_EID_SOURCE,
          uids: [{ id: uuid, atype: 1 }],
        });
      }
    }
    if (out.length) deepSetValue(request, "user.eids", out);
  } catch (e) {
    logWarn("adswag: identity attach failed, sending contextual-only", e);
  }
}

// buildImpIndex reads the per-bid metadata retained on the ServerRequest so
// interpretResponse can backfill width/height (the server omits w/h on bid
// responses) and resolve the media type of each returned bid.
function buildImpIndex(request) {
  const idx = {};
  const list = deepAccess(request, "bidRequests");
  if (isArray(list)) {
    for (const r of list) {
      if (r && r.bidId) idx[r.bidId] = r;
    }
  }
  return idx;
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

// extractBody normalizes the server response body; an empty/whitespace body
// is the server's no-bid contract (HTTP 200 empty). Returns null for no-bid.
function extractBody(serverResponse) {
  if (!serverResponse) return null;
  const body = serverResponse.body;
  if (body == null) return null;
  if (isStr(body) && body.trim() === "") return null;
  return body;
}

function looksLikeVast(adm) {
  return /<\s*VAST[\s/>]/i.test(adm);
}

function mapBid(b, cur, impIndex) {
  if (!isPlainObject(b)) return null;
  const price = Number(b.price);
  if (!isFinite(price) || price <= 0) return null;

  const adm = isNonEmptyStr(b.adm) ? b.adm : "";
  const serveUrl = deepAccess(b, "ext.adswag.serve_url");
  // The server delivers video/audio markup as a VAST wrapper in adm and
  // display markup in adm too (a loader script tag that renders in the
  // frame Prebid provides); ext.adswag.serve_url stays populated on display
  // bids as a legacy fallback, rendered as adUrl only when adm is absent.
  // Nothing renderable ⇒ skip this bid.
  if (!adm && !isNonEmptyStr(serveUrl)) return null;

  const req = impIndex[b.impid] || {};
  // Media-type resolution for mixed units: the server marks a VAST-channel
  // win (video OR audio) by putting the VAST wrapper in adm; a VAST-only imp
  // is its VAST type even if only the serve URL came back (it points at the
  // ad server's VAST composition). Audio is resolved BEFORE video, mirroring
  // the server's per-imp channel precedence (banner > audio > video).
  const isAudio =
    !!req.hasAudio && (looksLikeVast(adm) || !req.hasBanner);
  const isVideo =
    !isAudio && !!req.hasVideo && (looksLikeVast(adm) || !req.hasBanner);
  // Size: prefer the response's explicit dimensions (OpenRTB bid.w/h) — on
  // a multi-size impression they name the size the server actually chose.
  // The server currently omits them, so backfill from the requested primary
  // size when absent. Audio carries no fixed size.
  const respW = positiveInt(b.w);
  const respH = positiveInt(b.h);
  const size =
    (isAudio
      ? null
      : respW && respH
        ? [respW, respH]
        : isVideo
          ? req.videoSize
          : req.bannerSize) || [undefined, undefined];

  const base: OutgoingBidBase = {
    requestId: b.impid,
    cpm: price,
    currency: cur,
    creativeId: b.crid || b.id || "",
    netRevenue: true,
    ttl: DEFAULT_TTL,
    desirability: price,
    width: size[0],
    height: size[1],
  };
  // Explicit per-media-type construction so each branch narrows to its
  // member of core's discriminated BidResponse union. Instream video and
  // audio carry no renderer — the publisher's own player or ad server plays
  // that VAST; documented in adswagBidAdapter.md.
  let bid: OutgoingBid;
  if (isAudio) {
    bid = adm
      ? { ...base, mediaType: AUDIO, vastXml: adm }
      : { ...base, mediaType: AUDIO, vastUrl: serveUrl };
  } else if (isVideo) {
    bid = adm
      ? { ...base, mediaType: VIDEO, vastXml: adm }
      : { ...base, mediaType: VIDEO, vastUrl: serveUrl };
    if (req.outstream) {
      try {
        bid.renderer = createRenderer(req);
      } catch (e) {
        // A renderer we failed to install is not worth losing the bid over:
        // the page may still have its own, and core logs the missing one.
        logWarn("adswag: outstream renderer install failed", e);
      }
    }
  } else {
    bid = adm
      ? { ...base, mediaType: BANNER, ad: adm }
      : { ...base, mediaType: BANNER, adUrl: serveUrl };
  }

  const meta: NonNullable<OutgoingBidBase["meta"]> = {};
  if (isArray(b.adomain) && b.adomain.length) {
    meta.advertiserDomains = b.adomain; // DSA Art. 26 transparency
  }
  const dsa = deepAccess(b, "ext.dsa");
  if (isPlainObject(dsa)) {
    // DSA transparency object, accept-if-present (same posture as adomain).
    meta.dsa = dsa;
    if (isNonEmptyStr(dsa.behalf)) meta.advertiserName = dsa.behalf;
  }
  if (Object.keys(meta).length) bid.meta = meta;

  // Win-notice URL (the server mints it on display bids only).
  // Carried on the Prebid bid so onBidWon can fire it; VAST-channel wins
  // ride the adm fetch instead and arrive without a burl.
  if (isNonEmptyStr(b.burl)) bid.burl = b.burl;

  return bid;
}

// --- spec entry points (all total / fail-open) ---------------------------

// isBiddable: a bid participates when ANY supported media type on it is
// valid (mixed-format rule: a banner+video unit with broken video params is
// still a valid banner bid — never reject the whole unit).
function isBiddable(bid) {
  return (
    getBannerSizes(bid).length > 0 ||
    hasValidVideo(bid) ||
    hasValidAudio(bid)
  );
}

function isBidRequestValid(bid) {
  try {
    if (!isNonEmptyStr(deepAccess(bid, "params.publisherId"))) return false;
    return isBiddable(bid);
  } catch (e) {
    return false;
  }
}

// impMeta captures the client-side-only per-bid metadata retained on the
// ServerRequest (never sent) so interpretResponse can backfill sizes and
// resolve each returned bid's media type.
function impMeta(b): ImpMeta {
  const bannerSizes = getBannerSizes(b);
  const video = getVideoParams(b);
  const validVideo = isValidVideo(video);
  return {
    bidId: b.bidId,
    hasBanner: bannerSizes.length > 0,
    hasVideo: validVideo,
    hasAudio: hasValidAudio(b),
    bannerSize: bannerSizes[0],
    videoSize: validVideo ? videoPlayerSize(video) : null,
    outstream: validVideo && wantsAdswagRenderer(b),
    adUnitCode: b && b.adUnitCode,
  };
}

// wantsAdswagRenderer: outstream video the publisher has not brought its own
// renderer for. A publisher renderer wins by convention — except when it
// declared itself `backupOnly`, which means "use the bidder's, fall back to
// mine"; core resolves exactly that precedence in auction.js, so attaching
// ours there is the cooperative behavior, not an override.
function wantsAdswagRenderer(bid): boolean {
  if (deepAccess(bid, "mediaTypes.video.context") !== "outstream") return false;
  const publisherRenderers = [
    deepAccess(bid, "mediaTypes.video.renderer"),
    bid && bid.renderer,
  ];
  return !publisherRenderers.some(
    (r) => isPlainObject(r) && isFn(r.render) && r.backupOnly !== true,
  );
}

// The renderer core installs on outstream wins. The render function only
// hands the bid to the bootstrap the URL above serves; everything about
// playback, chrome and slot collapse lives there, where it can be fixed
// without an upstream release.
function createRenderer(req: ImpMeta): InstanceType<typeof Renderer> {
  const renderer = Renderer.install({
    id: req.bidId,
    url: RENDERER_URL,
    adUnitCode: req.adUnitCode,
    loaded: false,
  });
  renderer.setRender((bid, doc) => {
    bid.renderer.push(() => {
      const win = ((doc && doc.defaultView) || window) as unknown as {
        adswagOutstream?: { render(bid: unknown, doc?: Document): void };
      };
      const api = win.adswagOutstream;
      if (!api || !isFn(api.render)) {
        logWarn("adswag: outstream renderer loaded without its API, no render");
        return;
      }
      api.render(bid, doc || document);
    });
  });
  return renderer;
}

/** One outgoing request's worth of bids: same endpoint, same publisher. */
interface BidGroup {
  endpoint: string;
  publisherId: string | undefined;
  bids: any[];
}

// groupBids partitions the biddable bids by (resolved endpoint, publisherId),
// preserving the order the bids arrive in.
//
// Both keys are REQUEST-level: the endpoint is the POST url and the publisher
// id is site.publisher.id, one per OpenRTB request. A page may well carry
// several Adswag ad units belonging to different publisher accounts (a
// multi-publisher property, or a site handing sections to different sellers),
// and folding them into one request would attribute — and pay out — every
// impression under whichever account happened to come first.
//
// A bid whose endpoint does not resolve is dropped from the batch on its own;
// sibling groups still bid (publisher-side fail-open is per ad unit, never
// "one misconfigured unit silences the page").
function groupBids(bids): BidGroup[] {
  const groups: BidGroup[] = [];
  const byKey = new Map<string, BidGroup>();
  for (const bid of bids) {
    // No dev-default fallback (publisher-side fail-open: an unconfigured
    // adapter must no-bid, never silently phone home to a hard-coded host
    // the publisher never opted into).
    const endpoint = resolveEndpoint(bid);
    if (!isNonEmptyStr(endpoint)) {
      logWarn(
        "adswag: no endpoint configured (params.endpoint or adswag.endpoint), no-bid for",
        bid && bid.adUnitCode,
      );
      continue;
    }
    const publisherId = deepAccess(bid, "params.publisherId");
    const key = `${endpoint}\u0000${publisherId}`;
    let group = byKey.get(key);
    if (!group) {
      group = { endpoint, publisherId, bids: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.bids.push(bid);
  }
  return groups;
}

// buildGroupRequest emits the ServerRequest for one group. Everything except
// imp, site.publisher.id, the url and the request id is request-level and
// therefore identical across groups (device, consent, identity, schain, tid,
// tmax).
function buildGroupRequest(
  group: BidGroup,
  requestId: string,
  bidderRequest,
  ortb2,
  perms,
): AdswagServerRequest {
  // The outgoing OpenRTB 2.6 request. Loosely typed by design: the wire
  // contract is defined by the server's OpenRTB models, not a TS type.
  const request: Record<string, unknown> = {
    id: requestId,
    imp: group.bids.map(buildImp),
    cur: [DEFAULT_CURRENCY],
  };

  const site = buildSite(ortb2, bidderRequest, group.publisherId);
  if (Object.keys(site).length) request.site = site;

  const device = buildDevice(ortb2);
  if (device) request.device = device;

  applyConsent(request, bidderRequest, ortb2);
  applyIdentity(request, group.bids, ortb2, perms);

  // Supply chain: read ONLY the conventional ortb2 location (Prebid
  // review checklist: "adapters cannot accept an schain parameter" — the
  // legacy bid.schain read was dropped for upstream conformance).
  const schain = deepAccess(ortb2, "source.ext.schain");
  if (isPlainObject(schain)) deepSetValue(request, "source.ext.schain", schain);

  // Auction transaction id: ortb2.source.tid is the non-deprecated carrier
  // (auctionId/transactionId are default-disabled since Prebid v10). It is
  // the same on every group — the shared correlator across an auction's
  // requests, which is why the per-request ids below may differ freely.
  const sourceTid = deepAccess(ortb2, "source.tid");
  if (isNonEmptyStr(sourceTid)) deepSetValue(request, "source.tid", sourceTid);

  const tmax = (bidderRequest && bidderRequest.timeout) || deepAccess(ortb2, "tmax");
  if (typeof tmax === "number" && isFinite(tmax) && tmax > 0) {
    request.tmax = tmax;
  }

  return {
    method: "POST",
    url: group.endpoint,
    data: JSON.stringify(request),
    // Consent-conditional credentials: cookies ride along only when
    // identity consent is present (graduated from the contextual-only
    // POC 2026-07-13). When identity is permitted (GDPR off, or
    // vendor-1417 consent) the request is credentialed so the
    // server-written aswg_uid own-domain cookie — opportunistic, never
    // a dependency — and any aswg_dbg debug cookie ride along; the
    // server serves credentialed reflected-origin CORS (ACAO: <origin>
    // + Access-Control-Allow-Credentials: true) so the response stays
    // readable. When GDPR applies WITHOUT vendor consent the request
    // stays non-credentialed: no cookie leaves the browser on consentless
    // traffic, and the fetch remains readable regardless of CORS mode.
    options: { withCredentials: perms.identity },
    // Client-side only (not sent): THIS group's bids only, so
    // interpretResponse resolves media types and backfills sizes from the
    // right ad units.
    bidRequests: group.bids.map(impMeta),
  };
}

function buildRequests(validBidRequests, bidderRequest): AdswagServerRequest[] {
  try {
    const bids = (validBidRequests || []).filter(isBiddable);
    if (bids.length === 0) return [];

    const groups = groupBids(bids);
    if (groups.length === 0) return [];

    const ortb2 = deepAccess(bidderRequest, "ortb2") || {};
    const perms = consentPermissions(bidderRequest);

    // Request-id rule: Prebid hands us a single bidderRequestId, so the
    // first group keeps it (the overwhelmingly common single-group case is
    // byte-identical to before) and every further group gets a fresh UUID —
    // two concurrent requests must never claim the same OpenRTB request id.
    // source.tid still ties the groups back to one auction.
    const firstId = (bidderRequest && bidderRequest.bidderRequestId) || generateUUID();

    return groups.map((group, i) =>
      buildGroupRequest(
        group,
        i === 0 ? firstId : generateUUID(),
        bidderRequest,
        ortb2,
        perms,
      ),
    );
  } catch (e) {
    logError("adswag: buildRequests failed, no-bid", e);
    return [];
  }
}

function interpretResponse(serverResponse, request) {
  try {
    const body = extractBody(serverResponse);
    if (!body) return []; // empty 200 = no-bid (handled first)
    const parsed = isStr(body) ? safeParse(body) : body;
    if (!parsed || !isArray(parsed.seatbid)) return [];
    const cur = isNonEmptyStr(parsed.cur) ? parsed.cur : DEFAULT_CURRENCY;
    const impIndex = buildImpIndex(request);
    const bids: OutgoingBid[] = [];
    for (const seat of parsed.seatbid) {
      if (!seat || !isArray(seat.bid)) continue;
      for (const b of seat.bid) {
        const mapped = mapBid(b, cur, impIndex);
        if (mapped) bids.push(mapped);
      }
    }
    return bids;
  } catch (e) {
    logError("adswag: interpretResponse failed, no-bid", e);
    return [];
  }
}

// buildSyncQuery assembles the consent query string every sync URL carries
// (the adapter must append consent params itself — Prebid core does not).
// Delegates to the shared userSyncUtils library (review convention: no
// duplication of common code); the server is the authoritative validator.
function buildSyncQuery(gdprConsent, uspConsent, gppConsent): string {
  const qs = formatQS(getUserSyncParams(gdprConsent, uspConsent, gppConsent));
  return qs ? `?${qs}` : "";
}

// User syncs (owner decision 2026-08-06): register the ONE stable
// iframe/pixel URL pair on ev.adswag.ai. The endpoints launch as
// consent-validating no-ops server-side; every future behavior change is
// server-side. Gating, per Prebid rules + Adswag's consent posture:
//   - publisher syncOptions decide the type (iframe preferred when both
//     are enabled — core calls this once with the publisher's config);
//   - under GDPR the sync is registered only with a TC string AND a
//     vendor-1417 grant (consentless traffic gets no identifier surface at
//     all — the server re-validates regardless, belt-and-braces);
//   - Prebid core additionally applies its own gvlid-1417 activity controls
//     before dropping anything on the page.
// Fail-open: any error returns [].
function getUserSyncs(
  syncOptions,
  serverResponses,
  gdprConsent,
  uspConsent,
  gppConsent,
): Array<{ type: "iframe" | "image"; url: string }> {
  try {
    if (!syncOptions) return [];
    if (gdprConsent && gdprConsent.gdprApplies) {
      if (!isNonEmptyStr(gdprConsent.consentString)) return [];
      const vendorOk =
        deepAccess(gdprConsent, `vendorData.vendor.consents.${GVLID}`) === true;
      if (!vendorOk) return [];
    }
    const query = buildSyncQuery(gdprConsent, uspConsent, gppConsent);
    if (syncOptions.iframeEnabled) {
      return [{ type: "iframe", url: `${SYNC_IFRAME_URL}${query}` }];
    }
    if (syncOptions.pixelEnabled) {
      return [{ type: "image", url: `${SYNC_PIXEL_URL}${query}` }];
    }
    return [];
  } catch (e) {
    logWarn("adswag: getUserSyncs failed, registering no syncs", e);
    return [];
  }
}

// The billable / measurement signal remains the signed beacon embedded in
// the served markup (only signature-validated beacons count toward money) —
// onBidWon fires the NON-billable win notice (bid.burl, minted by the
// server on display bids; used for price discovery). ${AUCTION_PRICE} is
// substituted with the winning CPM per OpenRTB §4.4; the ad server
// validates the signed context before publishing and falls back to the
// signed bid price if the macro ever rides through raw. Without this fire,
// display wins are structurally unobservable (a "0% win rate next to
// thousands of impressions" reporting symptom).
// Fail-open: never throws, absent burl is a no-op (VAST-channel wins ride
// the adm fetch instead).
function onBidWon(bid) {
  try {
    if (!bid || !isNonEmptyStr(bid.burl)) return;
    const cpm = typeof bid.cpm === "number" && isFinite(bid.cpm) ? String(bid.cpm) : "";
    // Global regex — expand EVERY macro occurrence, not just the first.
    // Regex literal rather than a plain string: upstream eslint's
    // no-template-curly-in-string flags "${...}" inside string literals.
    const url = bid.burl.replace(/\$\{AUCTION_PRICE\}/g, cpm);
    // keepalive GET rather than an Image pixel: the notice must survive
    // page teardown/navigation, since it is the only observation of a
    // display win.
    dep.ajax(url, undefined, undefined, { method: "GET", keepalive: true });
  } catch (e) {
    logWarn("adswag: win notice fire failed", e);
  }
}

function onTimeout(_timeoutData) {}

export const spec: BidderSpec<typeof BIDDER_CODE> = {
  code: BIDDER_CODE,
  gvlid: GVLID,
  // TCF device-storage disclosure (adswag_uuid localStorage + cookie,
  // aswg_uid sync cookie) — the same JSON the GVL vendor-1417 entry declares
  // as its Device Storage Disclosure URL; consumed by Prebid's metadata
  // pipeline.
  disclosureURL: "https://content.adswag.ai/iab/vendorjson.json",
  // AUDIO is declared only when the build ships it: FEATURES.AUDIO is a
  // compile-time constant in real Prebid builds, so an audio-less build
  // advertises exactly what it can bid on (matches the audioEnabled()
  // gating in validation and imp building).
  supportedMediaTypes: audioEnabled()
    ? [BANNER, VIDEO, AUDIO]
    : [BANNER, VIDEO],
  isBidRequestValid,
  buildRequests,
  interpretResponse,
  getUserSyncs,
  onBidWon,
  onTimeout,
};

registerBidder(spec);
