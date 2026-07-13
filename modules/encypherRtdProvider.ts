import { submodule } from '../src/hook.js';
import { fetcherFactory, sendBeacon } from '../src/ajax.js';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';

const REAL_TIME_MODULE = 'realTimeData';
export const MODULE_NAME = 'encypher';
const DEFAULT_SIGNAL_BASE = 'https://signals.encypher.com';
export const TRUSTED_ISSUER = 'https://api.encypher.com';
export const TRUSTED_JWKS_URL = TRUSTED_ISSUER + '/api/v1/public/provenance/jwks.json';
const TRUSTED_ATTESTATION_BASE = TRUSTED_ISSUER + '/api/v1/public/provenance/attestations/';
const MODULE_VERSION = '1.0.0';
const SCHEMA_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 300;
const MAX_EXTENSION_BYTES = 1024;
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_TTL_MS = 60_000;
const RECORD_STATUS_CACHE_TTL_MS = 30_000;
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

export interface EncypherRtdParams {
  signalBase?: string;
  timeout?: number;
  telemetry?: boolean;
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

interface RecordCacheEntry {
  record: C2paSignalV1;
  datasetVersion: number;
  statusExpiresAt: number;
}

interface JwkCacheEntry {
  jwks: unknown;
  expiresAt: number;
}

interface RequestCallbacks {
  success: (text: string, status: number) => void;
  error: (timedOut: boolean) => void;
}

type VerificationCallback = (valid: boolean, timedOut: boolean) => void;

const recordCache = new Map<string, RecordCacheEntry>();
const jwkCache = new Map<string, JwkCacheEntry>();

function rotateRight(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

/** Synchronous SHA-256 for the canonical URL lookup key. */
export function sha256(value: string): Uint8Array {
  const input = new TextEncoder().encode(value);
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  bytes.set(input);
  bytes[input.length] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const state = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index++) words[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index++) {
      const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = state;
    for (let index = 0; index < 64; index++) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + SHA256_K[index] + words[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }
  const digest = new Uint8Array(32);
  const output = new DataView(digest.buffer);
  state.forEach((word, index) => output.setUint32(index * 4, word));
  return digest;
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
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
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

function decodeJson(segment: string): unknown {
  return JSON.parse(new TextDecoder().decode(decodeBase64url(segment)));
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

function exactKeys(value: unknown, expected: string[]): value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && expected.slice().sort().every((key, index) => key === actual[index]);
}

function compactRecord(record: unknown): C2paSignalV1 | null {
  if (!exactKeys(record, ['v', 'id', 'ref', 'att'])) return null;
  if (record.v !== 1 || typeof record.id !== 'string' || !record.id || typeof record.att !== 'string') return null;
  if (typeof record.ref !== 'string' || !record.ref.startsWith('https://')) return null;
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

function validClaims(claims: unknown, record: C2paSignalV1, publisherDomain: string, urlHash: string, now: number): boolean {
  if (!exactKeys(claims, [
    'iss', 'sub', 'iat', 'exp', 'publisher_domain', 'url_hash', 'content_hash', 'manifest_digest',
    'validation_results', 'declaration', 'trust_policy_version', 'record_revision',
  ])) return false;
  const digestPattern = /^[A-Za-z0-9_-]{43}$/;
  const expectedRef = TRUSTED_ATTESTATION_BASE + encodeURIComponent(record.id);
  if (record.ref !== expectedRef) return false;
  if (claims.iss !== TRUSTED_ISSUER || claims.sub !== record.id || claims.publisher_domain !== publisherDomain) return false;
  if (typeof claims.iat !== 'number' || !Number.isInteger(claims.iat) || claims.iat < 0) return false;
  if (typeof claims.exp !== 'number' || !Number.isInteger(claims.exp) || claims.exp < 1) return false;
  if (claims.iat > now + CLOCK_SKEW_SECONDS || claims.exp <= now) return false;
  if (claims.url_hash !== urlHash) return false;
  if (
    typeof claims.url_hash !== 'string' || !digestPattern.test(claims.url_hash) ||
    typeof claims.content_hash !== 'string' || !digestPattern.test(claims.content_hash) ||
    typeof claims.manifest_digest !== 'string' || !digestPattern.test(claims.manifest_digest)
  ) return false;
  if (typeof claims.trust_policy_version !== 'string' || claims.trust_policy_version.length === 0) return false;
  if (typeof claims.record_revision !== 'number' || !Number.isInteger(claims.record_revision) || claims.record_revision < 1) return false;
  const results = claims.validation_results;
  if (!exactKeys(results, ['status', 'codes']) || results.status !== 'valid' || !Array.isArray(results.codes)) return false;
  if (results.codes.length > 32 || !results.codes.every(code => typeof code === 'string')) return false;
  const declaration = claims.declaration;
  if (!exactKeys(declaration, ['label', 'source_assertion'])) return false;
  if (typeof declaration.label !== 'string' || !['human_declared', 'ai_assisted', 'unknown'].includes(declaration.label)) return false;
  return typeof declaration.source_assertion === 'string' && declaration.source_assertion.length > 0;
}

function recordExpiresAt(record: C2paSignalV1): number | null {
  try {
    const segments = record.att.split('.');
    if (segments.length !== 3) return null;
    const claims = decodeJson(segments[1]);
    if (!claims || typeof claims !== 'object' || Array.isArray(claims)) return null;
    const exp = (claims as JsonObject).exp;
    return typeof exp === 'number' && Number.isInteger(exp) && exp >= 1 ? exp : null;
  } catch {
    return null;
  }
}

async function verifyRecord(record: C2paSignalV1, jwks: unknown, publisherDomain: string, urlHash: string): Promise<boolean> {
  const segments = record.att.split('.');
  if (segments.length !== 3) return false;
  let protectedHeader: unknown;
  let claims: unknown;
  try {
    protectedHeader = decodeJson(segments[0]);
    claims = decodeJson(segments[1]);
  } catch {
    return false;
  }
  if (!exactKeys(protectedHeader, ['alg', 'kid', 'typ']) || protectedHeader.alg !== 'ES256' || protectedHeader.typ !== 'epat+jws') return false;
  const jwk = selectJwk(jwks, protectedHeader.kid);
  if (!jwk || !validClaims(claims, record, publisherDomain, urlHash, Math.floor(Date.now() / 1000))) return false;
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

function impressionCount(auction: StartAuctionOptions): number {
  return Array.isArray(auction && auction.adUnits) ? auction.adUnits.length : 0;
}

function injectPerImpression(auction: StartAuctionOptions, record: C2paSignalV1): number {
  let count = 0;
  auction.adUnits.forEach(adUnit => {
    if (!adUnit.ortb2Imp) adUnit.ortb2Imp = {};
    if (!adUnit.ortb2Imp.ext) adUnit.ortb2Imp.ext = {};
    const extension = adUnit.ortb2Imp.ext as Record<string, unknown>;
    extension.c2pa = { v: record.v, id: record.id, ref: record.ref, att: record.att };
    count += 1;
  });
  return count;
}

function emitDiagnostic(signalBase: string, params: EncypherRtdParams, event: DiagnosticEvent, count: number, datasetVersion: number | undefined, startedAt: number): void {
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
    sendBeacon(signalBase + '/v1/telemetry/rtd', JSON.stringify(payload));
  } catch {
    // Diagnostics never affect an auction.
  }
}

function normalizedSignalBase(params: EncypherRtdParams): string | null {
  const value = String(params.signalBase || DEFAULT_SIGNAL_BASE).replace(/\/+$/, '');
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== 'https:' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) return null;
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.href.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function requestText(url: string, timeout: number, callbacks: RequestCallbacks, requestHeaders: Record<string, string> = {}): void {
  const controller = new AbortController();
  let timedOut = false;
  let responseStatus = 0;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);
  try {
    fetcherFactory(timeout)(url, {
      method: 'GET',
      credentials: 'omit',
      headers: Object.assign({ Accept: 'application/json' }, requestHeaders),
      signal: controller.signal,
    }).then(response => {
      responseStatus = response.status;
      return response.text();
    }).then(text => {
      clearTimeout(timer);
      callbacks.success(text, responseStatus);
    }, () => {
      clearTimeout(timer);
      callbacks.error(timedOut);
    });
  } catch {
    clearTimeout(timer);
    callbacks.error(false);
  }
}

function cachedTrustedJwks(): unknown | null {
  const entry = jwkCache.get(TRUSTED_JWKS_URL);
  if (!entry || entry.expiresAt <= Date.now()) {
    jwkCache.delete(TRUSTED_JWKS_URL);
    return null;
  }
  return entry.jwks;
}

function verifyWithTrustedJwks(record: C2paSignalV1, publisherDomain: string, urlHash: string, remainingTime: () => number, completeVerification: VerificationCallback): void {
  const fetchAndVerify = (): void => {
    const remaining = remainingTime();
    if (remaining <= 0) {
      completeVerification(false, true);
      return;
    }
    requestText(TRUSTED_JWKS_URL, remaining, {
      success(jwksText, status) {
        if (status !== 200) {
          completeVerification(false, false);
          return;
        }
        let jwks: unknown;
        try {
          jwks = JSON.parse(jwksText);
        } catch {
          completeVerification(false, false);
          return;
        }
        verifyRecord(record, jwks, publisherDomain, urlHash).then(valid => {
          if (valid) jwkCache.set(TRUSTED_JWKS_URL, { jwks, expiresAt: Date.now() + JWKS_CACHE_TTL_MS });
          completeVerification(valid, false);
        }, () => completeVerification(false, false));
      },
      error(timedOut) {
        completeVerification(false, timedOut);
      },
    });
  };

  const cached = cachedTrustedJwks();
  if (!cached) {
    fetchAndVerify();
    return;
  }
  verifyRecord(record, cached, publisherDomain, urlHash).then(valid => {
    if (valid) {
      completeVerification(true, false);
      return;
    }
    jwkCache.delete(TRUSTED_JWKS_URL);
    fetchAndVerify();
  }, () => {
    jwkCache.delete(TRUSTED_JWKS_URL);
    fetchAndVerify();
  });
}

const init = (_config: RTDProviderConfig<'encypher'>, _userConsent: AllConsentData): boolean => true;

const getBidRequestData = (
  auction: StartAuctionOptions,
  callback: () => void,
  moduleConfig: RTDProviderConfig<'encypher'>
): void => {
  const params = (moduleConfig && moduleConfig.params) || {};
  const signalBase = normalizedSignalBase(params);
  const startedAt = Date.now();
  const totalImpressions = impressionCount(auction);
  const timeout = typeof params.timeout === 'number' && Number.isFinite(params.timeout)
    ? Math.max(1, params.timeout)
    : DEFAULT_TIMEOUT_MS;
  const deadlineAt = startedAt + timeout;
  let completed = false;
  let deadlineTimer: number | undefined;
  const finish = (event: DiagnosticEvent, datasetVersion?: number, record?: C2paSignalV1): void => {
    if (completed) return;
    completed = true;
    window.clearTimeout(deadlineTimer);
    const injectedCount = record ? injectPerImpression(auction, record) : totalImpressions;
    callback();
    emitDiagnostic(signalBase || DEFAULT_SIGNAL_BASE, params, event, injectedCount, datasetVersion, startedAt);
  };
  if (!signalBase) {
    finish('invalid');
    return;
  }
  deadlineTimer = window.setTimeout(() => finish('timeout'), timeout);
  const remainingTime = (): number => deadlineAt - Date.now();

  const canonicalUrl = getCanonicalUrl();
  const urlHash = base64url(sha256(canonicalUrl));
  const publisherDomain = new URL(canonicalUrl).hostname.toLowerCase();
  const cacheKey = signalBase + '|' + urlHash;
  const acceptVerified = (record: C2paSignalV1, datasetVersion: number, statusExpiresAt: number): void => {
    verifyWithTrustedJwks(record, publisherDomain, urlHash, remainingTime, (valid, timedOut) => {
      if (completed) return;
      if (!valid) {
        recordCache.delete(cacheKey);
        finish(timedOut ? 'timeout' : 'invalid', datasetVersion);
        return;
      }
      recordCache.set(cacheKey, { record, datasetVersion, statusExpiresAt });
      finish('injected', datasetVersion, record);
    });
  };

  const cached = recordCache.get(cacheKey);
  if (cached) {
    const expiresAt = recordExpiresAt(cached.record);
    if (
      expiresAt !== null &&
      expiresAt > Math.floor(Date.now() / 1000) &&
      cached.statusExpiresAt > Date.now()
    ) {
      acceptVerified(cached.record, cached.datasetVersion, cached.statusExpiresAt);
      return;
    }
    recordCache.delete(cacheKey);
  }

  requestText(signalBase + '/v1/attestations/' + urlHash + '?publisher_domain=' + encodeURIComponent(publisherDomain), Math.max(1, remainingTime()), {
    success(responseText, status) {
      if (completed) return;
      if (status === 204) {
        finish('miss');
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
        !exactKeys(envelope, ['v', 'status', 'dataset_version', 'record']) ||
        envelope.v !== 1 ||
        typeof envelope.dataset_version !== 'number' ||
        !Number.isInteger(envelope.dataset_version) ||
        envelope.dataset_version < 1
      ) {
        finish('invalid');
        return;
      }
      if (envelope.status === 'stale' || envelope.status === 'revoked') {
        if (envelope.record !== null) {
          finish('invalid');
          return;
        }
        finish(envelope.status, envelope.dataset_version);
        return;
      }
      const record = envelope.status === 'ready' ? compactRecord(envelope.record) : null;
      if (!record) {
        finish('invalid');
        return;
      }
      acceptVerified(record, envelope.dataset_version, Date.now() + RECORD_STATUS_CACHE_TTL_MS);
    },
    error(timedOut) {
      finish(timedOut ? 'timeout' : 'invalid');
    },
  });
};

/** Clear page-lifecycle memory between isolated module tests. */
export function resetBeaconState(): void {
  recordCache.clear();
  jwkCache.clear();
}

export const encypherSubmodule: RtdProviderSpec<'encypher'> = {
  name: MODULE_NAME as 'encypher',
  init,
  getBidRequestData,
};

submodule(REAL_TIME_MODULE, encypherSubmodule);
