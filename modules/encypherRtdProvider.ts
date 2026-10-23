import { getHook, submodule } from '../src/hook.js';
import { fetcherFactory } from '../src/ajax.js';
import { gdprDataHandler, gppDataHandler, type AllConsentData } from '../src/consentHandler.ts';
import { logWarn } from '../src/utils.js';
import { getGptSlotForAdUnitCode } from '../libraries/gptUtils/gptUtils.js';
import { clearCache as clearBoundingClientRectCache, getBoundingClientRect } from '../libraries/boundingClientRect/boundingClientRect.js';
import { getWinDimensions } from '../src/utils/winDimensions.js';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { AdUnitCode, ByAdUnit } from '../src/types/common.d.ts';
import type { TargetingMap } from '../src/targeting.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';

const REAL_TIME_MODULE = 'realTimeData';
export const MODULE_NAME = 'encypher';
const SIGNAL_ORIGIN = 'https://signals.encypher.com';
export const TRUSTED_ISSUER = 'https://api.encypher.com';
export const TRUSTED_JWKS_URL = TRUSTED_ISSUER + '/api/v1/public/provenance/jwks.json';
const PROOF_COLLECTION = TRUSTED_ISSUER + '/api/v1/proof';
const ACCEPTED_TRUST_POLICY_VERSION = 'adtech-v1-2026-07';
const MODULE_VERSION = '1.1.0';
const SCHEMA_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 300;
const MAX_EXTENSION_BYTES = 1024;
const MAX_REF_BYTES = 96;
const CLOCK_SKEW_SECONDS = 30;
const MAX_ATTESTATION_LIFETIME_SECONDS = 3600;
const RECORD_STATUS_CACHE_TTL_MS = 30_000;
const JWKS_CACHE_TTL_MS = 30_000;
const LOOKUP_MAX_BYTES = 4 * 1024;
/** A 64-entry signed index is about 9 KiB; the adjacency profile admits it next to the record. */
const ADJACENCY_LOOKUP_MAX_BYTES = 16 * 1024;
const JWKS_MAX_BYTES = 64 * 1024;
const MAX_TARGETING_BYTES = 256;
const TARGETING_VALUE_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const TARGETING_DROP_ORDER = ['encypher_pkg', 'encypher_att', 'encypher_near', 'encypher_verified'] as const;
const GAM_TARGETING_PARAM_KEYS = ['includeAttestationId', 'packages'];
const LOOKUP_ENVELOPE_KEYS = ['v', 'status', 'dataset_version', 'record'];
const ADJACENCY_ENVELOPE_KEYS = ['index', 'gateway_jwk'];
const ASSET_INDEX_TYPE = 'epai+jws';
const ADJACENCY_HKDF_INFO = 'encypher-adj-v1';
const ADJACENCY_METHOD = 'vp1';
const MAX_INDEX_ENTRIES = 64;
const MAX_ON_SCREEN_ENTRIES = 6;
const MAX_PAGE_CANDIDATES = 512;
const MAX_DOM_ELEMENTS = 4096;
const MAX_ANCESTOR_DEPTH = 64;
const MAX_OBSERVATION_BYTES = 400;
const MAX_ADJACENCY_ENVELOPE_BYTES = 700;
const ASSET_DIGEST_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ASSET_DIGEST_LENGTH = 11;
const INDEX_METHOD_PATTERN = /^[a-z0-9][a-z0-9.-]{0,31}$/;
const OBSERVATION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const AUCTION_TARGETING_TTL_MS = 5 * 60 * 1000;
const MAX_AUCTION_TARGETING_STATES = 128;
const GATEWAY_KID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const MEDIA_SELECTOR = 'img, video, audio';
const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1200;

/** GAM key-value emission, Targeting Contract V1. Omit or set `false` to emit nothing. */
export interface EncypherGamTargetingParams {
  includeAttestationId?: boolean;
  packages?: string[];
}

export interface EncypherRtdParams {
  timeout?: number;
  telemetry?: boolean;
  adoptionReporting?: boolean;
  gamTargeting?: false | EncypherGamTargetingParams;
  /** Encrypted on-screen observation in `imp.ext.encypher` plus the `encypher_near` key. Default `false`. */
  adjacency?: boolean;
}

declare module './rtdModule/spec.ts' {
  interface ProviderConfig {
    encypher: {
      params?: EncypherRtdParams;
    };
  }
}

export interface C2paSignalV1 {
  v: 1;
  id: string;
  ref: string;
  att: string;
}

type JsonObject = Record<string, unknown>;
type DiagnosticEvent = 'injected' | 'miss' | 'stale' | 'revoked' | 'invalid' | 'timeout';

/** `imp.ext.encypher`: the ECIES-sealed observation, readable only by the gateway key holder. */
export interface EncypherAdjacencyEnvelopeV1 {
  v: 1;
  kid: string;
  epk: string;
  ct: string;
}

type IndexState = 'verified' | 'unrecognized_signer' | 'broken';
type IndexClass = 'content' | 'teaser' | 'chrome';
type ViewportClass = 'm' | 't' | 'd';
type TravelClass = 's' | 'k' | 'f';
type AreaClass = 0 | 1 | 2 | 3;
type NearValue = 'v' | 'a' | 'va' | '0';

interface AssetIndexEntry {
  d: string;
  k: 'text' | 'image' | 'video' | 'audio';
  s: IndexState;
  ai: boolean;
  c: IndexClass;
  o: boolean;
}

interface VerifiedAssetIndex {
  entries: Map<string, AssetIndexEntry>;
  expiresAt: number;
  observedAt: number;
}

/** Unverified adjacency inputs from the lookup; the index is verified before each use. */
interface AdjacencyMaterial {
  index: string;
  gatewayKid: string;
  gatewayJwk: JsonWebKey;
}

interface OnScreenEntry {
  d: string;
  a: AreaClass;
}

interface AdjacencyAttachment {
  envelope: EncypherAdjacencyEnvelopeV1;
  near: NearValue;
}

/** Sealed observations by auction-local ad unit object. */
type AdjacencyAttachments = Map<object, AdjacencyAttachment>;

interface AdjacencyBuild {
  attachments: AdjacencyAttachments;
  validUntil: number;
}

/** A rendered element's page band: document-coordinate top and bottom, and width. */
interface MeasuredBox {
  top: number;
  bottom: number;
  width: number;
}

/** A visible media element and the browser-serialized URL it shows. */
interface PageCandidate {
  box: MeasuredBox;
  asset: string;
  kind: 'image' | 'video' | 'audio';
}

/** The page band a slot shares the reader's screen with, and how the slot travels. */
interface SlotScreen {
  travel: TravelClass;
  top: number;
  bottom: number;
}

interface SlotRequest {
  adUnit: { code?: unknown };
  code: AdUnitCode;
  slot: Element | null;
}

type DecisionStatus = 'ready' | 'miss' | 'revoked';

interface DecisionState {
  datasetVersion: number;
  status: DecisionStatus;
  record?: C2paSignalV1;
  recordRevision?: number;
  recordFingerprint?: string;
  recordExpiresAt?: number;
  statusExpiresAt?: number;
  adjacency?: AdjacencyMaterial;
}

interface VerifiedRecordClaims {
  recordRevision: number;
  expiresAt: number;
}

interface AcceptedDecision {
  urlHash: string;
  record: C2paSignalV1;
  datasetVersion: number;
  recordRevision: number;
  recordFingerprint: string;
  recordExpiresAt: number;
}

interface RequestCallbacks {
  success: (text: string, status: number) => void;
  error: (timedOut: boolean) => void;
}

interface GamTargetingSettings {
  includeAttestationId: boolean;
  packages: string[];
}

/** Targeting Contract V1 key-value payload for one ad unit. */
type TargetingValues = {
  encypher_verified?: '1';
  encypher_near?: NearValue;
  encypher_att?: string;
  encypher_pkg?: string[];
};

interface AuctionTargetingEvidence {
  attestationId: string;
  near?: NearValue;
}

interface AuctionTargetingState {
  byCode: Map<AdUnitCode, AuctionTargetingEvidence>;
  cleanupTimer: number;
}

const decisions = new Map<string, DecisionState>();
/** V1 and adjacency targeting evidence isolated by the core-assigned auction ID. */
const targetingByAuctionId = new Map<string, AuctionTargetingState>();
/** Accepted decision retained until ownership closes so a later blocker can remove it. */
let acceptedByAdUnits = new WeakMap<object, AcceptedDecision>();
let trustedJwkCache: { jwks: unknown; expiresAt: number } | null = null;
let maxDatasetVersionSeen = 0;
let globalStaleBarrier = 0;
let isolatedAdUnitArrays = new WeakSet<object>();
let auctionHooksInstalled = false;

/** SHA-256 bytes for the canonical URL lookup key. */
export function sha256(value: string): Promise<Uint8Array> {
  const subtle = window.crypto && window.crypto.subtle;
  if (!subtle || typeof subtle.digest !== 'function') return Promise.reject(new Error('WebCrypto SHA-256 unavailable'));
  return subtle.digest('SHA-256', new TextEncoder().encode(value))
    .then(digest => new Uint8Array(digest));
}

function normalizePercentEncoding(value: string): string {
  return value.replace(/%([0-9a-f]{2})/gi, (encoded, digits) => {
    const character = String.fromCharCode(parseInt(digits, 16));
    return /^[A-Za-z0-9._~-]$/.test(character) ? character : '%' + digits.toUpperCase();
  });
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeBase64url(value: unknown): Uint8Array {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('invalid base64url');
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  const decoded = Uint8Array.from(binary, character => character.charCodeAt(0));
  if (base64url(decoded) !== value) throw new Error('non-canonical base64url');
  return decoded;
}

function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('invalid JSON number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (!value || typeof value !== 'object') throw new Error('invalid JSON value');
  return '{' + Object.keys(value)
    .sort(compareText)
    .map(key => JSON.stringify(key) + ':' + canonicalJson((value as JsonObject)[key]))
    .join(',') + '}';
}

function decodeJsonBytes(segment: string): { bytes: Uint8Array; value: unknown } {
  const bytes = decodeBase64url(segment);
  return {
    bytes,
    value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  };
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function canonicalJsonPayload(segment: string): unknown {
  const decoded = decodeJsonBytes(segment);
  const canonical = new TextEncoder().encode(canonicalJson(decoded.value));
  if (!equalBytes(decoded.bytes, canonical)) throw new Error('non-canonical JSON payload');
  return decoded.value;
}

function decodeJson(segment: string): unknown {
  return decodeJsonBytes(segment).value;
}

/** Canonical page URL under the generated v1 URL profile. */
export function getCanonicalUrl(): string {
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const raw = (link && link.href) ? link.href : window.location.href;
  const parsed = new URL(raw, window.location.href);
  parsed.hash = '';
  parsed.pathname = normalizePercentEncoding(parsed.pathname);
  const query: Array<[string, string]> = [];
  parsed.searchParams.forEach((value, name) => query.push([name, value]));
  query.sort((left, right) => compareText(left[0], right[0]) || compareText(left[1], right[1]));
  parsed.search = '';
  query.forEach(([name, value]) => parsed.searchParams.append(name, value));
  if (parsed.search) parsed.search = normalizePercentEncoding(parsed.search);
  return parsed.href;
}

function exactKeys(value: unknown, expected: readonly string[]): value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every(key => actual.includes(key));
}

const GPP_SECTION_NAMES: Record<number, string> = {
  7: 'usnat',
  8: 'usca',
  9: 'usva',
  10: 'usco',
  11: 'usut',
  12: 'usct'
};

const GPP_OPT_OUT_FIELDS = ['SaleOptOut', 'SharingOptOut', 'TargetedAdvertisingOptOut'] as const;

function gppSectionAllowsData(section: unknown): boolean {
  const segments = Array.isArray(section) ? section : [section];
  if (segments.length === 0) return false;
  let hasSaleOptOut = false;
  for (const segment of segments) {
    if (!segment || typeof segment !== 'object' || Array.isArray(segment)) return false;
    for (const field of GPP_OPT_OUT_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(segment, field)) continue;
      const value = (segment as JsonObject)[field];
      if (value !== 0 && value !== 1 && value !== 2) return false;
      if (field === 'SaleOptOut') hasSaleOptOut = true;
      if (value === 1) return false;
    }
    if (Object.prototype.hasOwnProperty.call(segment, 'Gpc')) {
      const gpc = (segment as JsonObject).Gpc;
      if (gpc !== false && gpc !== true && gpc !== 0 && gpc !== 1) return false;
      if (gpc === true || gpc === 1) return false;
    }
  }
  return hasSaleOptOut;
}

function hasGppConsentForDataTransmission(gpp: unknown): boolean {
  if (!gpp || typeof gpp !== 'object' || Array.isArray(gpp)) return false;
  const consent = gpp as JsonObject;
  const applicableSections = consent.applicableSections;
  if (!Array.isArray(applicableSections)) return false;
  if (applicableSections.length === 1 && applicableSections[0] === -1) return true;
  const parsedSections = consent.parsedSections;
  if (
    typeof consent.gppString !== 'string' ||
    consent.gppString.length === 0 ||
    applicableSections.length === 0 ||
    !parsedSections ||
    typeof parsedSections !== 'object' ||
    Array.isArray(parsedSections)
  ) {
    return false;
  }
  for (const sid of applicableSections) {
    if (!Number.isInteger(sid)) return false;
    const sectionName = GPP_SECTION_NAMES[sid];
    if (!sectionName || !gppSectionAllowsData((parsedSections as JsonObject)[sectionName])) return false;
  }
  return true;
}

function hasConsentForDataTransmission(userConsent: AllConsentData | null | undefined): boolean {
  if (gdprDataHandler.enabled && userConsent?.gdpr == null) return false;
  if (gppDataHandler.enabled && userConsent?.gpp == null) return false;
  if (!userConsent) return true;
  if (userConsent.coppa === true) return false;
  if (typeof userConsent.usp === 'string' && userConsent.usp[2] === 'Y') return false;
  if (userConsent.gdpr && userConsent.gdpr.gdprApplies !== false) return false;
  if (userConsent.gpp != null && !hasGppConsentForDataTransmission(userConsent.gpp)) return false;
  return true;
}
function canonicalDigest(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)) return false;
  try {
    return decodeBase64url(value).length === 32;
  } catch {
    return false;
  }
}

function canonicalProofRef(value: string): boolean {
  if (new TextEncoder().encode(value).length > MAX_REF_BYTES) return false;
  try {
    const parsed = new URL(value);
    if (
      parsed.origin !== TRUSTED_ISSUER ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.search !== '' ||
      parsed.hash !== ''
    ) return false;
    const prefix = new URL(PROOF_COLLECTION).pathname + '/';
    const manifestDigest = parsed.pathname.startsWith(prefix)
      ? parsed.pathname.slice(prefix.length)
      : '';
    return canonicalDigest(manifestDigest) &&
      parsed.pathname === prefix + manifestDigest &&
      value === PROOF_COLLECTION + '/' + manifestDigest;
  } catch {
    return false;
  }
}

function compactRecord(record: unknown): C2paSignalV1 | null {
  if (!exactKeys(record, ['v', 'id', 'ref', 'att'])) return null;
  if (
    record.v !== 1 ||
    typeof record.id !== 'string' ||
    !record.id ||
    record.id.length > 32 ||
    typeof record.att !== 'string' ||
    typeof record.ref !== 'string' ||
    !canonicalProofRef(record.ref)
  ) return null;
  if (new TextEncoder().encode(JSON.stringify(record)).length > MAX_EXTENSION_BYTES) return null;
  return { v: 1, id: record.id, ref: record.ref, att: record.att };
}

function selectJwk(jwks: unknown, kid: unknown): JsonWebKey | null {
  if (!exactKeys(jwks, ['keys']) || !Array.isArray(jwks.keys)) return null;
  let match: JsonWebKey | null = null;
  for (const key of jwks.keys) {
    if (
      exactKeys(key, ['alg', 'crv', 'kid', 'kty', 'use', 'x', 'y']) &&
      key.kid === kid &&
      key.kty === 'EC' &&
      key.crv === 'P-256' &&
      key.alg === 'ES256' &&
      key.use === 'sig' &&
      typeof key.x === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key.x) &&
      typeof key.y === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key.y)
    ) {
      if (match !== null) return null;
      match = key;
    }
  }
  return match;
}

function validClaims(
  claims: unknown,
  record: C2paSignalV1,
  publisherDomain: string,
  urlHash: string,
  now: number
): VerifiedRecordClaims | null {
  if (!exactKeys(claims, [
    'iss', 'sub', 'iat', 'exp', 'publisher_domain', 'url_hash', 'content_hash', 'manifest_digest',
    'validation_results', 'declaration', 'trust_policy_version', 'record_revision',
  ])) return null;
  if (claims.iss !== TRUSTED_ISSUER || claims.sub !== record.id || claims.publisher_domain !== publisherDomain) return null;
  if (typeof claims.iat !== 'number' || !Number.isInteger(claims.iat) || claims.iat < 0) return null;
  if (typeof claims.exp !== 'number' || !Number.isInteger(claims.exp) || claims.exp < 1) return null;
  if (
    claims.iat > now + CLOCK_SKEW_SECONDS ||
    claims.exp <= now ||
    claims.exp <= claims.iat ||
    claims.exp - claims.iat > MAX_ATTESTATION_LIFETIME_SECONDS
  ) return null;
  if (
    claims.url_hash !== urlHash || !canonicalDigest(claims.url_hash) ||
    !canonicalDigest(claims.content_hash) ||
    !canonicalDigest(claims.manifest_digest) ||
    record.ref !== PROOF_COLLECTION + '/' + claims.manifest_digest
  ) return null;
  if (claims.trust_policy_version !== ACCEPTED_TRUST_POLICY_VERSION) return null;
  if (typeof claims.record_revision !== 'number' || !Number.isInteger(claims.record_revision) || claims.record_revision < 1) return null;
  const results = claims.validation_results;
  if (!exactKeys(results, ['status', 'codes']) || results.status !== 'valid' || !Array.isArray(results.codes)) return null;
  if (results.codes.length > 32 || !results.codes.every(code => typeof code === 'string')) return null;
  const declaration = claims.declaration;
  if (!exactKeys(declaration, ['label', 'source_assertion'])) return null;
  if (typeof declaration.label !== 'string' || !['human_declared', 'ai_assisted', 'unknown'].includes(declaration.label)) return null;
  if (typeof declaration.source_assertion !== 'string' || declaration.source_assertion.length === 0) return null;
  return { recordRevision: claims.record_revision, expiresAt: claims.exp };
}

async function verifyRecord(
  record: C2paSignalV1,
  jwks: unknown,
  publisherDomain: string,
  urlHash: string
): Promise<VerifiedRecordClaims | null> {
  const segments = record.att.split('.');
  if (segments.length !== 3) return null;
  let protectedHeader: unknown;
  let claims: unknown;
  try {
    protectedHeader = decodeJson(segments[0]);
    claims = decodeJson(segments[1]);
  } catch {
    return null;
  }
  if (!exactKeys(protectedHeader, ['alg', 'kid', 'typ']) || protectedHeader.alg !== 'ES256' || protectedHeader.typ !== 'epat+jws') return null;
  const jwk = selectJwk(jwks, protectedHeader.kid);
  const verifiedClaims = validClaims(claims, record, publisherDomain, urlHash, Math.floor(Date.now() / 1000));
  if (!jwk || verifiedClaims === null) return null;
  return await verifyCompactSignature(jwk, segments)
    ? validClaims(claims, record, publisherDomain, urlHash, Math.floor(Date.now() / 1000))
    : null;
}

/** ES256 signature check of a split compact JWS against one JWK; any failure is `false`. */
async function verifyCompactSignature(jwk: JsonWebKey, segments: string[]): Promise<boolean> {
  let signature: Uint8Array;
  try {
    signature = decodeBase64url(segments[2]);
  } catch {
    return false;
  }
  if (signature.length !== 64) return false;
  try {
    const key = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    return await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      new TextEncoder().encode(segments[0] + '.' + segments[1])
    );
  } catch {
    return false;
  }
}

/** Lookup keys accepted for the profile: the four v1 keys plus the optional adjacency keys. */
function lookupEnvelope(envelope: unknown, adjacency: boolean): envelope is JsonObject {
  if (!adjacency) return exactKeys(envelope, LOOKUP_ENVELOPE_KEYS);
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) return false;
  const actual = Object.keys(envelope);
  return LOOKUP_ENVELOPE_KEYS.every(key => actual.includes(key)) &&
    actual.every(key => LOOKUP_ENVELOPE_KEYS.includes(key) || ADJACENCY_ENVELOPE_KEYS.includes(key));
}

/** Gateway P-256 public key from the lookup, or `null` when absent or not an exact public JWK. */
function gatewayKey(value: unknown): { kid: string; jwk: JsonWebKey } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const key = value as JsonObject;
  const keys = Object.keys(key);
  if (!keys.every(name => ['kty', 'crv', 'kid', 'x', 'y', 'use', 'alg'].includes(name))) return null;
  if (
    key.kty !== 'EC' ||
    key.crv !== 'P-256' ||
    typeof key.kid !== 'string' || !GATEWAY_KID_PATTERN.test(key.kid) ||
    typeof key.x !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(key.x) ||
    typeof key.y !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(key.y) ||
    (key.use !== undefined && key.use !== 'enc') ||
    (key.alg !== undefined && key.alg !== 'ECDH-ES')
  ) return null;
  return { kid: key.kid, jwk: { kty: 'EC', crv: 'P-256', x: key.x, y: key.y } };
}

/** Adjacency inputs from a ready lookup, or `undefined` when either is absent or malformed. */
function adjacencyMaterial(envelope: JsonObject): AdjacencyMaterial | undefined {
  const gateway = gatewayKey(envelope.gateway_jwk);
  if (!gateway || typeof envelope.index !== 'string' || envelope.index.split('.').length !== 3) return undefined;
  return { index: envelope.index, gatewayKid: gateway.kid, gatewayJwk: gateway.jwk };
}

function indexEntry(value: unknown): AssetIndexEntry | null {
  if (!exactKeys(value, ['d', 'k', 's', 'ai', 'c', 'o'])) return null;
  const { d, k, s, ai, c, o } = value;
  if (typeof d !== 'string' || (d !== 'text' && !ASSET_DIGEST_PATTERN.test(d))) return null;
  if (typeof k !== 'string' || !['text', 'image', 'video', 'audio'].includes(k) || (k === 'text') !== (d === 'text')) return null;
  if (typeof s !== 'string' || !['verified', 'unrecognized_signer', 'broken'].includes(s)) return null;
  if (typeof c !== 'string' || !['content', 'teaser', 'chrome'].includes(c)) return null;
  if (typeof ai !== 'boolean' || typeof o !== 'boolean') return null;
  return { d, k: k as AssetIndexEntry['k'], s: s as IndexState, ai, c: c as IndexClass, o };
}

function indexIsCurrent(index: VerifiedAssetIndex, now = Math.floor(Date.now() / 1000)): boolean {
  return index.expiresAt > now && index.observedAt + OBSERVATION_MAX_AGE_SECONDS > now;
}

/** Index claims bound exactly to this attestation and a current observation, else `null`. */
function validIndexClaims(
  claims: unknown,
  record: C2paSignalV1,
  recordRevision: number,
  recordExpiresAt: number,
  publisherDomain: string,
  urlHash: string,
  now: number
): VerifiedAssetIndex | null {
  if (!exactKeys(claims, [
    'iss', 'sub', 'iat', 'exp', 'publisher_domain', 'url_hash', 'trust_policy_version', 'record_revision',
    'method', 'observed_at', 'entries',
  ])) return null;
  if (
    claims.iss !== TRUSTED_ISSUER ||
    claims.sub !== record.id ||
    claims.publisher_domain !== publisherDomain ||
    claims.url_hash !== urlHash ||
    claims.trust_policy_version !== ACCEPTED_TRUST_POLICY_VERSION ||
    claims.record_revision !== recordRevision
  ) return null;
  if (typeof claims.iat !== 'number' || !Number.isSafeInteger(claims.iat) || claims.iat < 0) return null;
  if (typeof claims.exp !== 'number' || !Number.isSafeInteger(claims.exp)) return null;
  if (
    claims.iat > now + CLOCK_SKEW_SECONDS ||
    claims.exp !== recordExpiresAt ||
    claims.exp <= now ||
    claims.exp <= claims.iat
  ) return null;
  if (
    typeof claims.observed_at !== 'number' ||
    !Number.isSafeInteger(claims.observed_at) ||
    claims.observed_at < 0 ||
    claims.observed_at > claims.iat ||
    claims.observed_at > now + CLOCK_SKEW_SECONDS ||
    claims.observed_at + OBSERVATION_MAX_AGE_SECONDS <= now
  ) return null;
  if (typeof claims.record_revision !== 'number' || !Number.isSafeInteger(claims.record_revision) || claims.record_revision < 1) return null;
  if (typeof claims.method !== 'string' || !INDEX_METHOD_PATTERN.test(claims.method)) return null;
  if (!Array.isArray(claims.entries) || claims.entries.length > MAX_INDEX_ENTRIES) return null;
  const entries = new Map<string, AssetIndexEntry>();
  let previous = '';
  for (const value of claims.entries) {
    const entry = indexEntry(value);
    if (!entry || (previous !== '' && previous >= entry.d)) return null;
    previous = entry.d;
    entries.set(entry.d, entry);
  }
  return { entries, expiresAt: claims.exp, observedAt: claims.observed_at };
}

/**
 * The signed asset index bound to a verified attestation, or `null` on any mismatch.
 * Its `kid` selects any current trusted attestation-purpose key; rotation does not bind it
 * to the key that signed the older attestation.
 */
async function verifyAssetIndex(
  compact: string,
  jwks: unknown,
  record: C2paSignalV1,
  recordRevision: number,
  recordExpiresAt: number,
  publisherDomain: string,
  urlHash: string
): Promise<VerifiedAssetIndex | null> {
  const segments = compact.split('.');
  if (segments.length !== 3) return null;
  let protectedHeader: unknown;
  let claims: unknown;
  try {
    protectedHeader = decodeJson(segments[0]);
    claims = canonicalJsonPayload(segments[1]);
  } catch {
    return null;
  }
  if (!exactKeys(protectedHeader, ['alg', 'kid', 'typ']) || protectedHeader.alg !== 'ES256' || protectedHeader.typ !== ASSET_INDEX_TYPE) return null;
  const jwk = selectJwk(jwks, protectedHeader.kid);
  if (!jwk || !validIndexClaims(claims, record, recordRevision, recordExpiresAt, publisherDomain, urlHash, Math.floor(Date.now() / 1000))) return null;
  return await verifyCompactSignature(jwk, segments)
    ? validIndexClaims(claims, record, recordRevision, recordExpiresAt, publisherDomain, urlHash, Math.floor(Date.now() / 1000))
    : null;
}

function viewportClass(): ViewportClass {
  const width = getWinDimensions().innerWidth;
  if (width < MOBILE_MAX_WIDTH) return 'm';
  if (width < TABLET_MAX_WIDTH) return 't';
  return 'd';
}

/** The slot element's page band, or `null` when it is not rendered. */
function measureSlot(element: Element): MeasuredBox | null {
  if (element.getClientRects().length === 0) return null;
  const rect = getBoundingClientRect(element);
  return { top: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY, width: rect.width };
}

/**
 * The page band the slot shares the screen with: the viewport height centred on the slot, the
 * whole document when the slot or an ancestor is fixed, or the sticky element's containing block
 * plus half a screen each side.
 */
function slotScreen(
  slot: Element,
  box: MeasuredBox,
  screenHeight: number,
  pageBottom: number,
  isCurrent: () => boolean
): SlotScreen | null {
  let depth = 0;
  for (let node: Element | null = slot; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    depth += 1;
    if (depth > MAX_ANCESTOR_DEPTH || !isCurrent()) return null;
    const position = window.getComputedStyle(node).position;
    if (position === 'fixed') return { travel: 'f', top: 0, bottom: pageBottom };
    if (position === 'sticky' && node.parentElement) {
      if (!isCurrent()) return null;
      const block = getBoundingClientRect(node.parentElement);
      if (!isCurrent()) return null;
      return {
        travel: 'k',
        top: block.top + window.scrollY - screenHeight / 2,
        bottom: block.bottom + window.scrollY + screenHeight / 2,
      };
    }
  }
  if (!isCurrent()) return null;
  const centre = (box.top + box.bottom) / 2;
  return {
    travel: 's',
    top: Math.min(box.top, centre - screenHeight / 2),
    bottom: Math.max(box.bottom, centre + screenHeight / 2),
  };
}

/**
 * The http(s) URL bytes used by the shared asset digest: browser URL serialization after
 * resolution (`new URL(resolved).href`), with the fragment removed.
 */
function mediaUrl(element: Element): string | null {
  let resolved = '';
  if (element instanceof HTMLImageElement) resolved = element.currentSrc || element.src;
  if (element instanceof HTMLMediaElement) {
    resolved = element.currentSrc || element.src || (element instanceof HTMLVideoElement ? element.poster : '');
  }
  try {
    const url = new URL(resolved, document.baseURI);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

/**
 * Visible media geometry in document coordinates. The horizontal viewport and clipping
 * ancestors trim the measured width. Hidden, transparent, travelling, transformed, deeply
 * nested, or wholly clipped media is ambiguous and excluded.
 */
function measureCandidate(element: Element): MeasuredBox | null {
  if (element.getClientRects().length === 0) return null;
  const rect = getBoundingClientRect(element);
  if (rect.width <= 0 || rect.height <= 0) return null;
  let left = Math.max(0, rect.left);
  let right = Math.min(getWinDimensions().innerWidth, rect.right);
  let top = rect.top;
  let bottom = rect.bottom;
  let depth = 0;
  for (let node: Element | null = element; node; node = node.parentElement) {
    depth += 1;
    if (depth > MAX_ANCESTOR_DEPTH) return null;
    const style = window.getComputedStyle(node);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      style.contentVisibility === 'hidden' ||
      style.opacity === '0' ||
      (style.transform !== '' && style.transform !== 'none') ||
      style.position === 'fixed' ||
      style.position === 'sticky'
    ) return null;
    if (node !== element) {
      const clip = getBoundingClientRect(node);
      if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX)) {
        left = Math.max(left, clip.left);
        right = Math.min(right, clip.right);
      }
      if (['hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY)) {
        top = Math.max(top, clip.top);
        bottom = Math.min(bottom, clip.bottom);
      }
    }
  }
  if (right <= left || bottom <= top) return null;
  return { top: top + window.scrollY, bottom: bottom + window.scrollY, width: right - left };
}

/**
 * One fresh, bounded layout snapshot: visible media outside the auction's slots and each
 * resolved slot's vertical screen band. `null` means the deadline or candidate cap was hit.
 */
function measurePage(
  adUnits: Array<{ code?: unknown }>,
  isCurrent: () => boolean
): { candidates: PageCandidate[]; screens: Map<object, SlotScreen> } | null {
  if (!isCurrent()) return null;
  clearBoundingClientRectCache();
  const screenHeight = getWinDimensions().innerHeight;
  const pageBottom = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const requests: SlotRequest[] = [];
  const unresolvedByAttribute = new Map<AdUnitCode, SlotRequest[]>();
  for (const adUnit of adUnits) {
    if (!isCurrent()) return null;
    if (typeof adUnit.code !== 'string') continue;
    const request: SlotRequest = {
      adUnit,
      code: adUnit.code,
      slot: document.getElementById(adUnit.code),
    };
    requests.push(request);
    if (!request.slot) {
      const matching = unresolvedByAttribute.get(request.code) || [];
      matching.push(request);
      unresolvedByAttribute.set(request.code, matching);
    }
  }

  const media: Element[] = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_ELEMENT);
  let visitedElements = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    visitedElements += 1;
    if (visitedElements > MAX_DOM_ELEMENTS || !isCurrent()) return null;
    if (!(node instanceof Element)) continue;
    const attributeCode = node.getAttribute('data-ad-slot');
    const matching = attributeCode && unresolvedByAttribute.get(attributeCode);
    if (matching) {
      matching.forEach(request => { request.slot = node; });
      unresolvedByAttribute.delete(attributeCode);
    }
    if (!node.matches(MEDIA_SELECTOR)) continue;
    if (media.length >= MAX_PAGE_CANDIDATES) return null;
    media.push(node);
  }

  const gptSlots = new Map<AdUnitCode, Element | null>();
  for (const request of requests) {
    if (request.slot) continue;
    if (!isCurrent()) return null;
    if (!gptSlots.has(request.code)) {
      const gptSlot = getGptSlotForAdUnitCode(request.code);
      const divId = gptSlot && gptSlot.getSlotElementId();
      gptSlots.set(request.code, divId ? document.getElementById(divId) : null);
    }
    request.slot = gptSlots.get(request.code) || null;
  }

  const slots: Element[] = [];
  const screens = new Map<object, SlotScreen>();
  for (const request of requests) {
    if (!isCurrent()) return null;
    const slot = request.slot;
    const box = slot && measureSlot(slot);
    if (!slot || !box) continue;
    if (!slots.includes(slot)) slots.push(slot);
    const screen = slotScreen(slot, box, screenHeight, pageBottom, isCurrent);
    if (screen) screens.set(request.adUnit, screen);
  }

  const candidates: PageCandidate[] = [];
  if (screens.size === 0) return { candidates, screens };
  for (const element of media) {
    if (!isCurrent()) return null;
    if (slots.some(slot => slot.contains(element))) continue;
    const box = measureCandidate(element);
    const asset = mediaUrl(element);
    if (!isCurrent()) return null;
    if (!box || !asset) continue;
    let kind: PageCandidate['kind'] = 'audio';
    if (element instanceof HTMLImageElement) kind = 'image';
    if (element instanceof HTMLVideoElement) kind = 'video';
    candidates.push({ box, asset, kind });
  }
  return { candidates, screens };
}

function areaWithin(box: MeasuredBox, screen: SlotScreen): number {
  const overlap = Math.min(box.bottom, screen.bottom) - Math.max(box.top, screen.top);
  return overlap > 0 ? box.width * overlap : 0;
}

/** 0 below 5%, 1 to 25%, 2 to 60%, 3 above 60% of the measured content area on the slot's screen. */
function areaClass(share: number): AreaClass {
  if (share < 0.05) return 0;
  if (share < 0.25) return 1;
  if (share <= 0.6) return 2;
  return 3;
}

/** Index entries on the slot's screen with their area class, largest first, at most six. */
function onScreen(
  candidates: PageCandidate[],
  screen: SlotScreen,
  digests: Map<string, string>,
  index: Map<string, AssetIndexEntry>
): OnScreenEntry[] {
  let total = 0;
  const areas = new Map<string, number>();
  for (const candidate of candidates) {
    const area = areaWithin(candidate.box, screen);
    if (area <= 0) continue;
    const d = digests.get(candidate.asset);
    const entry = d && index.get(d);
    if (entry?.c === 'chrome') continue;
    total += area;
    if (d && entry && entry.k === candidate.kind) {
      areas.set(d, (areas.get(d) || 0) + area);
    }
  }
  if (total === 0) return [];
  return Array.from(areas, ([d, area]) => ({ d, a: areaClass(area / total) }))
    .sort((left, right) => right.a - left.a || compareText(left.d, right.d))
    .slice(0, MAX_ON_SCREEN_ENTRIES);
}

/** `v` verified content on screen, `a` intact AI-declared label on screen, `va` both, `0` neither. */
function nearValue(entries: OnScreenEntry[], index: Map<string, AssetIndexEntry>): NearValue {
  let verified = false;
  let aiDeclared = false;
  entries.forEach(({ d }) => {
    const entry = index.get(d);
    if (!entry) return;
    if (entry.s === 'verified' && entry.c === 'content') verified = true;
    if (entry.ai && entry.s !== 'broken' && entry.c !== 'chrome') aiDeclared = true;
  });
  if (verified && aiDeclared) return 'va';
  if (verified) return 'v';
  return aiDeclared ? 'a' : '0';
}

/** 11-character b64url SHA-256 prefix for each distinct media URL sharing any slot's band. */
async function assetDigests(
  candidates: PageCandidate[],
  screens: Map<object, SlotScreen>,
  isCurrent: () => boolean
): Promise<Map<string, string> | null> {
  const urls = new Set<string>();
  for (const candidate of candidates) {
    if (!isCurrent()) return null;
    for (const screen of screens.values()) {
      if (areaWithin(candidate.box, screen) > 0) {
        urls.add(candidate.asset);
        break;
      }
    }
  }
  const digests = new Map<string, string>();
  for (const url of urls) {
    if (!isCurrent()) return null;
    const digest = await sha256(url);
    if (!isCurrent()) return null;
    digests.set(url, base64url(digest).slice(0, ASSET_DIGEST_LENGTH));
  }
  return digests;
}

/** ECIES to the gateway key: ephemeral ECDH P-256, HKDF-SHA256, AES-256-GCM with a 12-byte IV. */
async function sealObservation(plaintext: string, kid: string, recipient: CryptoKey): Promise<EncypherAdjacencyEnvelopeV1> {
  const subtle = window.crypto.subtle;
  const ephemeral = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const shared = await subtle.deriveBits({ name: 'ECDH', public: recipient }, ephemeral.privateKey, 256);
  const secret = await subtle.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  const key = await subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: new TextEncoder().encode(ADJACENCY_HKDF_INFO) },
    secret,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(await subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    new TextEncoder().encode(plaintext)
  ));
  const sealed = new Uint8Array(iv.length + ciphertext.length);
  sealed.set(iv);
  sealed.set(ciphertext, iv.length);
  const epk = new Uint8Array(await subtle.exportKey('raw', ephemeral.publicKey));
  return { v: 1, kid, epk: base64url(epk), ct: base64url(sealed) };
}

/**
 * Seal one observation per resolvable ad unit of the auction. `isCurrent` turns false once the
 * budget fires; work stops at the next step and the caller attaches nothing.
 */
async function observeAdjacency(
  adUnits: Array<{ code?: unknown }>,
  material: AdjacencyMaterial,
  jwks: unknown,
  record: C2paSignalV1,
  recordRevision: number,
  recordExpiresAt: number,
  publisherDomain: string,
  urlHash: string,
  isCurrent: () => boolean
): Promise<AdjacencyBuild> {
  const attachments: AdjacencyAttachments = new Map();
  const index = await verifyAssetIndex(
    material.index,
    jwks,
    record,
    recordRevision,
    recordExpiresAt,
    publisherDomain,
    urlHash
  );
  if (!index || !indexIsCurrent(index) || !isCurrent()) return { attachments, validUntil: 0 };
  const indexDigest = base64url(await sha256(material.index));
  if (!indexIsCurrent(index) || !isCurrent()) return { attachments, validUntil: 0 };
  const validUntil = Math.min(index.expiresAt, index.observedAt + OBSERVATION_MAX_AGE_SECONDS);
  const viewport = viewportClass();
  const measured = measurePage(adUnits, isCurrent);
  if (!measured) return { attachments, validUntil: 0 };
  if (measured.screens.size === 0) return { attachments, validUntil };
  const { candidates, screens } = measured;
  const digests = await assetDigests(candidates, screens, isCurrent);
  if (!digests || !indexIsCurrent(index) || !isCurrent()) return { attachments, validUntil: 0 };
  const recipient = await window.crypto.subtle.importKey(
    'jwk',
    material.gatewayJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  if (!indexIsCurrent(index) || !isCurrent()) return { attachments, validUntil: 0 };
  for (const [adUnit, screen] of screens) {
    if (!indexIsCurrent(index) || !isCurrent()) return { attachments: new Map(), validUntil: 0 };
    const entries = onScreen(candidates, screen, digests, index.entries);
    const plaintext = JSON.stringify({
      v: 1,
      id: record.id,
      m: ADJACENCY_METHOD,
      ix: indexDigest,
      vp: viewport,
      tr: screen.travel,
      on: entries,
    });
    if (new TextEncoder().encode(plaintext).byteLength > MAX_OBSERVATION_BYTES) continue;
    const envelope = await sealObservation(plaintext, material.gatewayKid, recipient);
    if (!indexIsCurrent(index) || !isCurrent()) return { attachments: new Map(), validUntil: 0 };
    if (new TextEncoder().encode(JSON.stringify(envelope)).byteLength > MAX_ADJACENCY_ENVELOPE_BYTES) continue;
    attachments.set(adUnit, { envelope, near: nearValue(entries, index.entries) });
  }
  return indexIsCurrent(index) && isCurrent()
    ? { attachments, validUntil }
    : { attachments: new Map(), validUntil: 0 };
}

function auctionId(auction: { auctionId?: unknown }): string | undefined {
  return typeof auction.auctionId === 'string' && auction.auctionId.length > 0
    ? auction.auctionId
    : undefined;
}

function clearAuctionTargeting(auction: { auctionId?: unknown }): void {
  const id = auctionId(auction);
  if (!id) return;
  const state = targetingByAuctionId.get(id);
  if (state) window.clearTimeout(state.cleanupTimer);
  targetingByAuctionId.delete(id);
}

function storeAuctionTargeting(
  auction: { auctionId?: unknown },
  byCode: Map<AdUnitCode, AuctionTargetingEvidence>
): void {
  const id = auctionId(auction);
  if (!id) return;
  clearAuctionTargeting(auction);
  while (targetingByAuctionId.size >= MAX_AUCTION_TARGETING_STATES) {
    const oldest = targetingByAuctionId.keys().next().value as string | undefined;
    if (!oldest) break;
    clearAuctionTargeting({ auctionId: oldest });
  }
  const cleanupTimer = window.setTimeout(() => {
    const current = targetingByAuctionId.get(id);
    if (current && current.cleanupTimer === cleanupTimer) targetingByAuctionId.delete(id);
  }, AUCTION_TARGETING_TTL_MS);
  targetingByAuctionId.set(id, { byCode, cleanupTimer });
}

/** Consume targeting when this exact auction reaches ad-server targeting. */
function takeAuctionTargeting(auction: { auctionId?: unknown }): Map<AdUnitCode, AuctionTargetingEvidence> | undefined {
  const id = auctionId(auction);
  if (!id) return undefined;
  const state = targetingByAuctionId.get(id);
  if (!state) return undefined;
  window.clearTimeout(state.cleanupTimer);
  targetingByAuctionId.delete(id);
  return state.byCode;
}

function isolateAuctionAdUnits(auction: StartAuctionOptions): void {
  if (Array.isArray(auction.adUnits) && isolatedAdUnitArrays.has(auction.adUnits)) return;
  const sourceAdUnits = Array.isArray(auction.adUnits) ? auction.adUnits : [];
  auction.adUnits = sourceAdUnits.map(adUnit => {
    const isolatedAdUnit = { ...adUnit };
    if (adUnit.ortb2Imp) {
      isolatedAdUnit.ortb2Imp = { ...adUnit.ortb2Imp };
      if (adUnit.ortb2Imp.ext) {
        isolatedAdUnit.ortb2Imp.ext = { ...adUnit.ortb2Imp.ext };
      }
    }
    return isolatedAdUnit;
  });
  isolatedAdUnitArrays.add(auction.adUnits);
}

function isolateBeforeRtd(next: (auction?: StartAuctionOptions) => void, auction?: StartAuctionOptions): void {
  if (auction) isolateAuctionAdUnits(auction);
  next(auction);
}

function closeAuctionOwnership(next: (auction?: StartAuctionOptions) => void, auction?: StartAuctionOptions): void {
  if (auction && Array.isArray(auction.adUnits)) {
    const accepted = acceptedByAdUnits.get(auction.adUnits);
    if (accepted && !decisionIsCurrent(accepted)) removeInjectedRecord(auction, accepted);
    acceptedByAdUnits.delete(auction.adUnits);
    isolatedAdUnitArrays.delete(auction.adUnits);
  }
  next(auction);
}

/** `null` when the publisher value does not match Targeting Contract V1. */
function parseGamTargeting(value: unknown): GamTargetingSettings | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const candidate = value as JsonObject;
  if (Object.keys(candidate).some(key => !GAM_TARGETING_PARAM_KEYS.includes(key))) return null;
  const { includeAttestationId, packages } = candidate;
  if (includeAttestationId !== undefined && typeof includeAttestationId !== 'boolean') return null;
  if (packages !== undefined && (
    !Array.isArray(packages) ||
    packages.some(code => typeof code !== 'string' || !TARGETING_VALUE_PATTERN.test(code))
  )) return null;
  return {
    includeAttestationId: includeAttestationId === true,
    packages: packages === undefined ? [] : (packages as string[]).slice(),
  };
}

/** Publisher-configured GAM targeting, or `null` when unset, disabled, or malformed. */
function gamTargetingSettings(moduleConfig: RTDProviderConfig<'encypher'>): GamTargetingSettings | null {
  const params: EncypherRtdParams = (moduleConfig && moduleConfig.params) || {};
  if (params.gamTargeting === undefined || params.gamTargeting === false) return null;
  return parseGamTargeting(params.gamTargeting);
}

/**
 * Drop optional keys until the serialized payload fits the per-ad-unit cap.
 * Only the `encypher_pkg` step is reachable in practice: without it the payload is at most
 * 96 bytes, since `record.id` is limited to 32 characters and `encypher_near` to 2. The later
 * steps stay as a guard in case the contract admits a longer value.
 */
function fitTargetingCap(values: TargetingValues): TargetingValues | null {
  let dropIndex = 0;
  while (
    new TextEncoder().encode(JSON.stringify(values)).byteLength > MAX_TARGETING_BYTES &&
    dropIndex < TARGETING_DROP_ORDER.length
  ) {
    delete values[TARGETING_DROP_ORDER[dropIndex]];
    dropIndex += 1;
  }
  return values.encypher_verified === undefined ? null : values;
}

/** Remove only this module's adjacency field before processing an owned auction. */
function clearStaleAdjacency(auction: StartAuctionOptions): void {
  if (!Array.isArray(auction.adUnits) || !isolatedAdUnitArrays.has(auction.adUnits)) return;
  auction.adUnits.forEach(adUnit => {
    if (adUnit.ortb2Imp?.ext) delete adUnit.ortb2Imp.ext.encypher;
  });
  clearAuctionTargeting(auction);
}

function decisionIsCurrent(accepted: AcceptedDecision): boolean {
  const current = decisions.get(accepted.urlHash);
  const now = Date.now();
  return Boolean(
    current &&
    current.status === 'ready' &&
    current.record &&
    current.recordFingerprint === accepted.recordFingerprint &&
    current.recordRevision === accepted.recordRevision &&
    current.datasetVersion === accepted.datasetVersion &&
    current.statusExpiresAt !== undefined &&
    current.statusExpiresAt > now &&
    current.recordExpiresAt === accepted.recordExpiresAt &&
    accepted.recordExpiresAt > Math.floor(now / 1000) &&
    accepted.datasetVersion >= maxDatasetVersionSeen &&
    accepted.datasetVersion > globalStaleBarrier
  );
}

/** Remove a previously injected accepted record after it becomes non-current while owned. */
function removeInjectedRecord(auction: StartAuctionOptions, accepted: AcceptedDecision): void {
  if (!Array.isArray(auction.adUnits) || !isolatedAdUnitArrays.has(auction.adUnits)) return;
  const { record } = accepted;
  clearAuctionTargeting(auction);
  auction.adUnits.forEach(adUnit => {
    const extension = adUnit.ortb2Imp?.ext;
    const c2pa = extension?.c2pa;
    if (
      exactKeys(c2pa, ['v', 'id', 'ref', 'att']) &&
      c2pa.v === record.v &&
      c2pa.id === record.id &&
      c2pa.ref === record.ref &&
      c2pa.att === record.att
    ) {
      delete extension.c2pa;
    }
    if (extension) delete extension.encypher;
  });
}

/** Write the v1 carrier and replace every owned adjacency field with this auction's fresh result. */
function injectPerImpression(auction: StartAuctionOptions, record: C2paSignalV1, attachments?: AdjacencyAttachments): number | null {
  if (!Array.isArray(auction.adUnits) || !isolatedAdUnitArrays.has(auction.adUnits)) return null;
  const adUnits = auction.adUnits;
  const byCode = new Map<AdUnitCode, AuctionTargetingEvidence>();
  adUnits.forEach(adUnit => {
    const impression = adUnit.ortb2Imp || (adUnit.ortb2Imp = {});
    const extension = impression.ext || (impression.ext = {});
    extension.c2pa = { v: record.v, id: record.id, ref: record.ref, att: record.att };
    if (typeof adUnit.code === 'string') byCode.set(adUnit.code, { attestationId: record.id });
    const attachment = attachments && attachments.get(adUnit);
    if (!attachment) {
      delete extension.encypher;
      return;
    }
    extension.encypher = { v: 1, kid: attachment.envelope.kid, epk: attachment.envelope.epk, ct: attachment.envelope.ct };
    if (typeof adUnit.code === 'string') byCode.set(adUnit.code, { attestationId: record.id, near: attachment.near });
  });
  if (byCode.size > 0) storeAuctionTargeting(auction, byCode);
  else clearAuctionTargeting(auction);
  return adUnits.length;
}

function emitDiagnostic(params: EncypherRtdParams, event: DiagnosticEvent, count: number, datasetVersion: number | undefined, startedAt: number): void {
  if (params.telemetry !== true) return;
  const payload: {
    v: 1;
    schema_version: number;
    module_version: string;
    event: DiagnosticEvent;
    impression_count: number;
    duration_ms: number;
    dataset_version?: number;
  } = {
    v: 1,
    schema_version: SCHEMA_VERSION,
    module_version: MODULE_VERSION,
    event,
    impression_count: count,
    duration_ms: Math.max(0, Date.now() - startedAt),
  };
  if (datasetVersion !== undefined) payload.dataset_version = datasetVersion;
  try {
    fetcherFactory()(SIGNAL_ORIGIN + '/v1/telemetry/rtd', {
      method: 'POST',
      body: JSON.stringify(payload),
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
      redirect: 'error',
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'text/plain' },
    }).catch(() => {});
  } catch {
    // Diagnostics never affect an auction.
  }
}

function requestText(url: string, timeout: number, maxBytes: number, callbacks: RequestCallbacks): void {
  const controller = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let settled = false;
  const cancelReader = (): void => {
    if (!reader) return;
    try {
      reader.cancel().catch(() => {});
    } catch {
      // Cancellation is best-effort after a failed response.
    }
  };
  const fail = (timedOut: boolean, cancel: boolean): void => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    if (cancel) cancelReader();
    controller.abort();
    callbacks.error(timedOut);
  };
  const timer = setTimeout(() => fail(true, true), timeout);
  try {
    fetcherFactory(timeout)(url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      headers: { Accept: 'application/json' },
      referrerPolicy: 'no-referrer',
      signal: controller.signal,
    }).then(response => {
      if (settled) return;
      if (response.status !== 200) {
        settled = true;
        clearTimeout(timer);
        controller.abort();
        callbacks.success('', response.status);
        return;
      }
      if (!response.body || typeof response.body.getReader !== 'function') {
        fail(false, false);
        return;
      }
      try {
        reader = response.body.getReader();
      } catch {
        fail(false, false);
        return;
      }
      if (!reader || typeof reader.read !== 'function' || typeof reader.cancel !== 'function') {
        fail(false, false);
        return;
      }
      const contentLength = response.headers && response.headers.get('Content-Length');
      if (contentLength !== null) {
        const declaredBytes = Number(contentLength);
        if (Number.isInteger(declaredBytes) && declaredBytes >= 0 && declaredBytes > maxBytes) {
          fail(false, true);
          return;
        }
      }
      const chunks: Uint8Array[] = [];
      let decodedBytes = 0;
      const readNext = (): void => {
        if (settled || !reader) return;
        reader.read().then(result => {
          if (settled) return;
          if (result.done) {
            const joined = new Uint8Array(decodedBytes);
            let offset = 0;
            for (const chunk of chunks) {
              joined.set(chunk, offset);
              offset += chunk.byteLength;
            }
            let text: string;
            try {
              text = new TextDecoder('utf-8', { fatal: true }).decode(joined);
            } catch {
              fail(false, false);
              return;
            }
            settled = true;
            clearTimeout(timer);
            callbacks.success(text, response.status);
            return;
          }
          if (!(result.value instanceof Uint8Array)) {
            fail(false, true);
            return;
          }
          decodedBytes += result.value.byteLength;
          if (decodedBytes > maxBytes) {
            fail(false, true);
            return;
          }
          chunks.push(result.value);
          readNext();
        }, () => fail(false, true));
      };
      readNext();
    }, () => fail(false, false));
  } catch {
    fail(false, false);
  }
}

function cachedTrustedJwks(): unknown | null {
  if (!trustedJwkCache || trustedJwkCache.expiresAt <= Date.now()) {
    trustedJwkCache = null;
    return null;
  }
  return trustedJwkCache.jwks;
}

function verifyWithTrustedJwks(
  record: C2paSignalV1,
  publisherDomain: string,
  urlHash: string,
  remainingTime: () => number,
  completeVerification: (verifiedClaims: VerifiedRecordClaims | null, timedOut: boolean, jwks?: unknown) => void
): void {
  const fetchAndVerify = (): void => {
    const remaining = remainingTime();
    if (remaining <= 0) {
      completeVerification(null, true);
      return;
    }
    requestText(TRUSTED_JWKS_URL, remaining, JWKS_MAX_BYTES, {
      success(jwksText, status) {
        if (status !== 200) {
          completeVerification(null, false);
          return;
        }
        let jwks: unknown;
        try {
          jwks = JSON.parse(jwksText);
        } catch {
          completeVerification(null, false);
          return;
        }
        verifyRecord(record, jwks, publisherDomain, urlHash).then(verifiedClaims => {
          if (verifiedClaims !== null) trustedJwkCache = { jwks, expiresAt: Date.now() + JWKS_CACHE_TTL_MS };
          completeVerification(verifiedClaims, false, jwks);
        }, () => completeVerification(null, false));
      },
      error(timedOut) {
        completeVerification(null, timedOut);
      },
    });
  };

  const cached = cachedTrustedJwks();
  if (!cached) {
    fetchAndVerify();
    return;
  }
  verifyRecord(record, cached, publisherDomain, urlHash).then(verifiedClaims => {
    if (verifiedClaims !== null) {
      completeVerification(verifiedClaims, false, cached);
      return;
    }
    trustedJwkCache = null;
    fetchAndVerify();
  }, () => {
    trustedJwkCache = null;
    fetchAndVerify();
  });
}

function commitReadyDecision(
  urlHash: string,
  record: C2paSignalV1,
  datasetVersion: number,
  recordRevision: number,
  recordExpiresAt: number,
  statusExpiresAt: number,
  adjacency?: AdjacencyMaterial
): AcceptedDecision | null {
  if (
    statusExpiresAt <= Date.now() ||
    recordExpiresAt <= Math.floor(Date.now() / 1000) ||
    datasetVersion < maxDatasetVersionSeen ||
    datasetVersion <= globalStaleBarrier
  ) return null;
  const current = decisions.get(urlHash);
  const recordFingerprint = JSON.stringify(record);
  if (current) {
    if (datasetVersion < current.datasetVersion) return null;
    if (current.status !== 'ready' && datasetVersion <= current.datasetVersion) return null;
    if (current.recordRevision !== undefined && recordRevision < current.recordRevision) return null;
    if (
      current.status === 'ready' &&
      datasetVersion === current.datasetVersion &&
      recordRevision === current.recordRevision &&
      recordFingerprint !== current.recordFingerprint
    ) return null;
  }
  decisions.set(urlHash, {
    datasetVersion,
    status: 'ready',
    record,
    recordRevision,
    recordFingerprint,
    recordExpiresAt,
    statusExpiresAt,
    adjacency,
  });
  maxDatasetVersionSeen = datasetVersion;
  return { urlHash, record, datasetVersion, recordRevision, recordFingerprint, recordExpiresAt };
}

function commitNonReadyDecision(urlHash: string, status: 'miss' | 'revoked' | 'stale', datasetVersion: number): void {
  if (datasetVersion < maxDatasetVersionSeen) return;
  maxDatasetVersionSeen = datasetVersion;
  if (status === 'stale') {
    globalStaleBarrier = datasetVersion;
    return;
  }
  const current = decisions.get(urlHash);
  if (
    current &&
    (
      datasetVersion < current.datasetVersion ||
      (datasetVersion === current.datasetVersion && current.status === 'revoked' && status === 'miss')
    )
  ) return;
  decisions.set(urlHash, { datasetVersion, status, recordRevision: current?.recordRevision });
}

const init = (config: RTDProviderConfig<'encypher'>, _userConsent: AllConsentData): boolean => {
  const params: EncypherRtdParams = (config && config.params) || {};
  if (
    params.gamTargeting !== undefined &&
    params.gamTargeting !== false &&
    parseGamTargeting(params.gamTargeting) === null
  ) {
    logWarn(MODULE_NAME + ': ignoring malformed params.gamTargeting; GAM targeting stays off');
  }
  if (params.adjacency !== undefined && typeof params.adjacency !== 'boolean') {
    logWarn(MODULE_NAME + ': ignoring malformed params.adjacency; adjacency stays off');
  }
  if (!auctionHooksInstalled) {
    const startAuction = getHook('startAuction');
    startAuction.before(isolateBeforeRtd, 21);
    startAuction.before(closeAuctionOwnership, 19);
    auctionHooksInstalled = true;
  }
  return true;
};

const getBidRequestData = (
  auction: StartAuctionOptions,
  callback: () => void,
  moduleConfig: RTDProviderConfig<'encypher'>,
  userConsent?: AllConsentData,
  rtdTimeout?: number
): void => {
  clearAuctionTargeting(auction);
  if (!Array.isArray(auction.adUnits) || !isolatedAdUnitArrays.has(auction.adUnits)) {
    callback();
    return;
  }
  clearStaleAdjacency(auction);
  if (!hasConsentForDataTransmission(userConsent)) {
    callback();
    return;
  }
  const params = (moduleConfig && moduleConfig.params) || {};
  const startedAt = Date.now();
  const configuredTimeout = typeof params.timeout === 'number' && Number.isFinite(params.timeout)
    ? Math.max(1, params.timeout)
    : DEFAULT_TIMEOUT_MS;
  const timeout = typeof rtdTimeout === 'number' && Number.isFinite(rtdTimeout)
    ? Math.max(0, Math.min(configuredTimeout, rtdTimeout))
    : configuredTimeout;
  if (timeout === 0) {
    callback();
    return;
  }
  const deadlineAt = startedAt + timeout;
  const adjacencyEnabled = params.adjacency === true;
  let completed = false;
  let deadlineTimer: number | undefined;
  let acceptedPending: AcceptedDecision | null = null;
  let injectedCount = 0;
  const finish = (event: DiagnosticEvent, datasetVersion?: number, count = 0): void => {
    if (completed) return;
    completed = true;
    window.clearTimeout(deadlineTimer);
    callback();
    emitDiagnostic(params, event, count, datasetVersion, startedAt);
  };
  if (auction.adUnits.length === 0) {
    callback();
    return;
  }
  const auctionAdUnits = auction.adUnits;
  const remainingTime = (): number => deadlineAt - Date.now();
  deadlineTimer = window.setTimeout(() => {
    const accepted = acceptedPending;
    if (!accepted) {
      finish('timeout');
      return;
    }
    if (!decisionIsCurrent(accepted)) {
      removeInjectedRecord(auction, accepted);
      finish('invalid', accepted.datasetVersion);
      return;
    }
    finish('injected', accepted.datasetVersion, injectedCount);
  }, timeout);
  if (!window.crypto || !window.crypto.subtle || typeof window.crypto.subtle.digest !== 'function') {
    finish('invalid');
    return;
  }

  let canonicalUrl: string;
  let publisherDomain: string;
  try {
    canonicalUrl = getCanonicalUrl();
    publisherDomain = new URL(canonicalUrl).hostname.toLowerCase();
  } catch {
    finish('invalid');
    return;
  }

  sha256(canonicalUrl).then(digest => {
    if (completed) return;
    if (remainingTime() <= 0) {
      finish('timeout');
      return;
    }
    const urlHash = base64url(digest);
    function acceptVerified(
      record: C2paSignalV1,
      datasetVersion: number,
      statusExpiresAt: number,
      material: AdjacencyMaterial | undefined,
      cachedDecision?: DecisionState
    ): void {
      verifyWithTrustedJwks(record, publisherDomain, urlHash, remainingTime, (verifiedClaims, timedOut, jwks) => {
        if (completed) return;
        if (timedOut) {
          finish('timeout', datasetVersion);
          return;
        }
        const accepted = verifiedClaims && commitReadyDecision(
          urlHash,
          record,
          datasetVersion,
          verifiedClaims.recordRevision,
          verifiedClaims.expiresAt,
          statusExpiresAt,
          material
        );
        if (!accepted || !decisionIsCurrent(accepted)) {
          if (cachedDecision && remainingTime() > 0) {
            if (decisions.get(urlHash) === cachedDecision) cachedDecision.statusExpiresAt = 0;
            requestLookup();
            return;
          }
          finish('invalid', datasetVersion);
          return;
        }

        // The mandatory v1 carrier is committed immediately. Optional observation work can no
        // longer lose it to the RTD core's earlier deadline timer.
        const count = injectPerImpression(auction, record);
        if (count === null) {
          finish('invalid', datasetVersion);
          return;
        }
        injectedCount = count;
        acceptedPending = accepted;
        acceptedByAdUnits.set(auctionAdUnits, accepted);
        if (!adjacencyEnabled || !material || !jwks || remainingTime() <= 0) {
          finish('injected', datasetVersion, count);
          return;
        }

        observeAdjacency(
          auctionAdUnits,
          material,
          jwks,
          record,
          verifiedClaims.recordRevision,
          verifiedClaims.expiresAt,
          publisherDomain,
          urlHash,
          () => (
            !completed &&
            remainingTime() > 0 &&
            isolatedAdUnitArrays.has(auctionAdUnits) &&
            decisionIsCurrent(accepted)
          )
        ).then(build => {
          if (completed) return;
          if (!decisionIsCurrent(accepted)) {
            removeInjectedRecord(auction, accepted);
            finish('invalid', datasetVersion);
            return;
          }
          if (build.attachments.size > 0 && build.validUntil > Math.floor(Date.now() / 1000)) {
            const refreshedCount = injectPerImpression(auction, record, build.attachments);
            if (refreshedCount === null) {
              finish('invalid', datasetVersion);
              return;
            }
            injectedCount = refreshedCount;
          }
          finish('injected', datasetVersion, injectedCount);
        }, () => {
          if (completed) return;
          if (!decisionIsCurrent(accepted)) {
            removeInjectedRecord(auction, accepted);
            finish('invalid', datasetVersion);
            return;
          }
          finish('injected', datasetVersion, injectedCount);
        });
      });
    }

    function requestLookup(): void {
      if (remainingTime() <= 0) {
        finish('timeout');
        return;
      }
      const reportingQuery = params.adoptionReporting === false ? '&adoption_reporting=0' : '';
      const adjacencyQuery = adjacencyEnabled ? '&adjacency=1' : '';
      requestText(
        SIGNAL_ORIGIN + '/v1/attestations/' + urlHash +
        '?publisher_domain=' + encodeURIComponent(publisherDomain) +
        '&module_version=' + encodeURIComponent(MODULE_VERSION) +
        reportingQuery +
        adjacencyQuery,
        Math.max(1, remainingTime()),
        adjacencyEnabled ? ADJACENCY_LOOKUP_MAX_BYTES : LOOKUP_MAX_BYTES,
        {
          success(responseText, status) {
            if (completed) return;
            if (status !== 200) {
              finish('invalid');
              return;
            }
            let envelope: unknown;
            try {
              envelope = JSON.parse(responseText);
            } catch {
              finish('invalid');
              return;
            }
            if (
              !lookupEnvelope(envelope, adjacencyEnabled) ||
              envelope.v !== 1 ||
              !['ready', 'miss', 'revoked', 'stale'].includes(String(envelope.status)) ||
              typeof envelope.dataset_version !== 'number' ||
              !Number.isInteger(envelope.dataset_version) ||
              envelope.dataset_version < 1
            ) {
              finish('invalid');
              return;
            }
            const datasetVersion = envelope.dataset_version;
            if (envelope.status !== 'ready') {
              if (envelope.record !== null) {
                finish('invalid');
                return;
              }
              const status = envelope.status as 'miss' | 'revoked' | 'stale';
              commitNonReadyDecision(urlHash, status, datasetVersion);
              finish(status, datasetVersion);
              return;
            }
            if (datasetVersion < maxDatasetVersionSeen) {
              finish('invalid', datasetVersion);
              return;
            }
            const record = compactRecord(envelope.record);
            if (!record) {
              finish('invalid');
              return;
            }
            acceptVerified(
              record,
              datasetVersion,
              Date.now() + RECORD_STATUS_CACHE_TTL_MS,
              adjacencyEnabled ? adjacencyMaterial(envelope) : undefined
            );
          },
          error(timedOut) {
            finish(timedOut ? 'timeout' : 'invalid');
          },
        }
      );
    }

    const cached = decisions.get(urlHash);
    if (
      cached &&
      cached.status === 'ready' &&
      cached.record &&
      cached.statusExpiresAt !== undefined &&
      cached.statusExpiresAt > Date.now() &&
      cached.datasetVersion >= maxDatasetVersionSeen &&
      cached.datasetVersion > globalStaleBarrier
    ) {
      acceptVerified(cached.record, cached.datasetVersion, cached.statusExpiresAt, cached.adjacency, cached);
      return;
    }
    requestLookup();
  }, () => {
    if (!completed) finish(remainingTime() <= 0 ? 'timeout' : 'invalid');
  });
};

/**
 * Targeting Contract V1 GPT key-values, emitted only for ad units that reached the
 * `injected` state in the auction being closed.
 */
const getTargetingData = (
  adUnitCodes: AdUnitCode[],
  moduleConfig: RTDProviderConfig<'encypher'>,
  userConsent?: AllConsentData,
  auction?: { auctionId?: unknown; adUnits?: unknown }
): ByAdUnit<TargetingMap<string | string[]>> => {
  const targeting: ByAdUnit<TargetingValues> = {};
  const evidenceByCode = auction ? takeAuctionTargeting(auction) : undefined;
  const settings = gamTargetingSettings(moduleConfig);
  if (settings === null || !hasConsentForDataTransmission(userConsent)) return targeting;
  adUnitCodes.forEach(adUnitCode => {
    const evidence = evidenceByCode?.get(adUnitCode);
    if (evidence === undefined) return;
    const values: TargetingValues = { encypher_verified: '1' };
    if (evidence.near !== undefined) values.encypher_near = evidence.near;
    if (settings.includeAttestationId && TARGETING_VALUE_PATTERN.test(evidence.attestationId)) {
      values.encypher_att = evidence.attestationId;
    }
    if (settings.packages.length > 0) values.encypher_pkg = settings.packages.slice();
    const fitted = fitTargetingCap(values);
    if (fitted !== null) targeting[adUnitCode] = fitted;
  });
  return targeting;
};

/** Clear page-lifecycle memory between isolated module tests. */
export function resetProviderState(): void {
  decisions.clear();
  targetingByAuctionId.forEach(state => window.clearTimeout(state.cleanupTimer));
  targetingByAuctionId.clear();
  acceptedByAdUnits = new WeakMap<object, AcceptedDecision>();
  trustedJwkCache = null;
  maxDatasetVersionSeen = 0;
  globalStaleBarrier = 0;
  isolatedAdUnitArrays = new WeakSet<object>();
  if (auctionHooksInstalled) {
    const startAuction = getHook('startAuction');
    startAuction.getHooks({ hook: isolateBeforeRtd }).remove();
    startAuction.getHooks({ hook: closeAuctionOwnership }).remove();
    auctionHooksInstalled = false;
  }
}

export const encypherSubmodule: RtdProviderSpec<'encypher'> = {
  name: MODULE_NAME as 'encypher',
  init,
  getBidRequestData,
  getTargetingData,
};

submodule(REAL_TIME_MODULE, encypherSubmodule);
