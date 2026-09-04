import { submodule } from '../src/hook.js';
import { fetcherFactory } from '../src/ajax.js';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';

const REAL_TIME_MODULE = 'realTimeData';
export const MODULE_NAME = 'encypher';
const SIGNAL_ORIGIN = 'https://signals.encypher.com';
export const TRUSTED_ISSUER = 'https://api.encypher.com';
export const TRUSTED_JWKS_URL = TRUSTED_ISSUER + '/api/v1/public/provenance/jwks.json';
const TRUSTED_ATTESTATION_BASE = TRUSTED_ISSUER + '/api/v1/public/provenance/attestations/';
const MODULE_VERSION = '1.1.0';
const SCHEMA_VERSION = 1;
const DEFAULT_TIMEOUT_MS = 300;
const MAX_EXTENSION_BYTES = 1024;
const CLOCK_SKEW_SECONDS = 60;
const JWKS_CACHE_TTL_MS = 60_000;
const RECORD_STATUS_CACHE_TTL_MS = 30_000;
const LOOKUP_MAX_BYTES = 4 * 1024;
const JWKS_MAX_BYTES = 64 * 1024;

export interface EncypherRtdParams {
  timeout?: number;
  telemetry?: boolean;
  adoptionReporting?: boolean;
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

type DecisionStatus = 'ready' | 'miss' | 'revoked';

interface DecisionState {
  datasetVersion: number;
  status: DecisionStatus;
  record?: C2paSignalV1;
  recordRevision?: number;
  recordFingerprint?: string;
  statusExpiresAt?: number;
}

interface RequestCallbacks {
  success: (text: string, status: number) => void;
  error: (timedOut: boolean) => void;
}

const decisions = new Map<string, DecisionState>();
let trustedJwkCache: { jwks: unknown; expiresAt: number } | null = null;
let maxDatasetVersionSeen = 0;
let globalStaleBarrier = 0;

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

function exactKeys(value: unknown, expected: readonly string[]): value is JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return actual.length === expected.length && expected.every(key => actual.includes(key));
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

function validClaims(claims: unknown, record: C2paSignalV1, publisherDomain: string, urlHash: string, now: number): number | null {
  if (!exactKeys(claims, [
    'iss', 'sub', 'iat', 'exp', 'publisher_domain', 'url_hash', 'content_hash', 'manifest_digest',
    'validation_results', 'declaration', 'trust_policy_version', 'record_revision',
  ])) return null;
  const digestPattern = /^[A-Za-z0-9_-]{43}$/;
  const expectedRef = TRUSTED_ATTESTATION_BASE + encodeURIComponent(record.id);
  if (record.ref !== expectedRef) return null;
  if (claims.iss !== TRUSTED_ISSUER || claims.sub !== record.id || claims.publisher_domain !== publisherDomain) return null;
  if (typeof claims.iat !== 'number' || !Number.isInteger(claims.iat) || claims.iat < 0) return null;
  if (typeof claims.exp !== 'number' || !Number.isInteger(claims.exp) || claims.exp < 1) return null;
  if (claims.iat > now + CLOCK_SKEW_SECONDS || claims.exp <= now) return null;
  if (
    claims.url_hash !== urlHash ||
    typeof claims.content_hash !== 'string' || !digestPattern.test(claims.content_hash) ||
    typeof claims.manifest_digest !== 'string' || !digestPattern.test(claims.manifest_digest)
  ) return null;
  if (typeof claims.trust_policy_version !== 'string' || claims.trust_policy_version.length === 0) return null;
  if (typeof claims.record_revision !== 'number' || !Number.isInteger(claims.record_revision) || claims.record_revision < 1) return null;
  const results = claims.validation_results;
  if (!exactKeys(results, ['status', 'codes']) || results.status !== 'valid' || !Array.isArray(results.codes)) return null;
  if (results.codes.length > 32 || !results.codes.every(code => typeof code === 'string')) return null;
  const declaration = claims.declaration;
  if (!exactKeys(declaration, ['label', 'source_assertion'])) return null;
  if (typeof declaration.label !== 'string' || !['human_declared', 'ai_assisted', 'unknown'].includes(declaration.label)) return null;
  if (typeof declaration.source_assertion !== 'string' || declaration.source_assertion.length === 0) return null;
  return claims.record_revision;
}

async function verifyRecord(record: C2paSignalV1, jwks: unknown, publisherDomain: string, urlHash: string): Promise<number | null> {
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
  const recordRevision = validClaims(claims, record, publisherDomain, urlHash, Math.floor(Date.now() / 1000));
  if (!jwk || recordRevision === null) return null;
  let signature: Uint8Array;
  try {
    signature = decodeBase64url(segments[2]);
  } catch {
    return null;
  }
  if (signature.length !== 64) return null;
  try {
    const key = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );
    const valid = await window.crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      signature,
      new TextEncoder().encode(segments[0] + '.' + segments[1])
    );
    return valid
      ? validClaims(claims, record, publisherDomain, urlHash, Math.floor(Date.now() / 1000))
      : null;
  } catch {
    return null;
  }
}

function injectPerImpression(auction: StartAuctionOptions, record: C2paSignalV1): number {
  const sourceAdUnits = Array.isArray(auction.adUnits) ? auction.adUnits : [];
  auction.adUnits = sourceAdUnits.map(adUnit => {
    const sourceImp = adUnit.ortb2Imp || {};
    const extension = { ...(sourceImp.ext || {}) } as Record<string, unknown>;
    extension.c2pa = { v: record.v, id: record.id, ref: record.ref, att: record.att };
    return {
      ...adUnit,
      ortb2Imp: {
        ...sourceImp,
        ext: extension,
      },
    };
  });
  return sourceAdUnits.length;
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
  completeVerification: (recordRevision: number | null, timedOut: boolean) => void
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
        verifyRecord(record, jwks, publisherDomain, urlHash).then(recordRevision => {
          if (recordRevision !== null) trustedJwkCache = { jwks, expiresAt: Date.now() + JWKS_CACHE_TTL_MS };
          completeVerification(recordRevision, false);
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
  verifyRecord(record, cached, publisherDomain, urlHash).then(recordRevision => {
    if (recordRevision !== null) {
      completeVerification(recordRevision, false);
      return;
    }
    trustedJwkCache = null;
    fetchAndVerify();
  }, () => {
    trustedJwkCache = null;
    fetchAndVerify();
  });
}

function commitReadyDecision(urlHash: string, record: C2paSignalV1, datasetVersion: number, recordRevision: number, statusExpiresAt: number): boolean {
  if (
    statusExpiresAt <= Date.now() ||
    datasetVersion < maxDatasetVersionSeen ||
    datasetVersion <= globalStaleBarrier
  ) return false;
  const current = decisions.get(urlHash);
  const recordFingerprint = JSON.stringify(record);
  if (current) {
    if (datasetVersion < current.datasetVersion) return false;
    if (current.status !== 'ready' && datasetVersion <= current.datasetVersion) return false;
    if (current.recordRevision !== undefined && recordRevision < current.recordRevision) return false;
    if (
      current.status === 'ready' &&
      datasetVersion === current.datasetVersion &&
      recordRevision === current.recordRevision &&
      recordFingerprint !== current.recordFingerprint
    ) return false;
  }
  decisions.set(urlHash, {
    datasetVersion,
    status: 'ready',
    record,
    recordRevision,
    recordFingerprint,
    statusExpiresAt,
  });
  maxDatasetVersionSeen = datasetVersion;
  return true;
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

const init = (_config: RTDProviderConfig<'encypher'>, _userConsent: AllConsentData): boolean => true;

const getBidRequestData = (
  auction: StartAuctionOptions,
  callback: () => void,
  moduleConfig: RTDProviderConfig<'encypher'>,
  _userConsent?: AllConsentData,
  rtdTimeout?: number
): void => {
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
  let completed = false;
  let deadlineTimer: number | undefined;
  const finish = (event: DiagnosticEvent, datasetVersion?: number, record?: C2paSignalV1): void => {
    if (completed) return;
    completed = true;
    window.clearTimeout(deadlineTimer);
    const injectedCount = event === 'injected' && record ? injectPerImpression(auction, record) : 0;
    callback();
    emitDiagnostic(params, event, injectedCount, datasetVersion, startedAt);
  };
  deadlineTimer = window.setTimeout(() => finish('timeout'), timeout);
  const remainingTime = (): number => deadlineAt - Date.now();
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
      cachedDecision?: DecisionState
    ): void {
      verifyWithTrustedJwks(record, publisherDomain, urlHash, remainingTime, (recordRevision, timedOut) => {
        if (completed) return;
        if (timedOut) {
          finish('timeout', datasetVersion);
          return;
        }
        if (
          recordRevision === null ||
          !commitReadyDecision(urlHash, record, datasetVersion, recordRevision, statusExpiresAt)
        ) {
          if (cachedDecision && remainingTime() > 0) {
            if (decisions.get(urlHash) === cachedDecision) cachedDecision.statusExpiresAt = 0;
            requestLookup();
            return;
          }
          finish('invalid', datasetVersion);
          return;
        }
        finish('injected', datasetVersion, record);
      });
    }

    function requestLookup(): void {
      if (remainingTime() <= 0) {
        finish('timeout');
        return;
      }
      const reportingQuery = params.adoptionReporting === false ? '&adoption_reporting=0' : '';
      requestText(
        SIGNAL_ORIGIN + '/v1/attestations/' + urlHash +
        '?publisher_domain=' + encodeURIComponent(publisherDomain) +
        '&module_version=' + encodeURIComponent(MODULE_VERSION) +
        reportingQuery,
        Math.max(1, remainingTime()),
        LOOKUP_MAX_BYTES,
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
              !exactKeys(envelope, ['v', 'status', 'dataset_version', 'record']) ||
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
            acceptVerified(record, datasetVersion, Date.now() + RECORD_STATUS_CACHE_TTL_MS);
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
      acceptVerified(cached.record, cached.datasetVersion, cached.statusExpiresAt, cached);
      return;
    }
    requestLookup();
  }, () => {
    if (!completed) finish(remainingTime() <= 0 ? 'timeout' : 'invalid');
  });
};

/** Clear page-lifecycle memory between isolated module tests. */
export function resetProviderState(): void {
  decisions.clear();
  trustedJwkCache = null;
  maxDatasetVersionSeen = 0;
  globalStaleBarrier = 0;
}

export const encypherSubmodule: RtdProviderSpec<'encypher'> = {
  name: MODULE_NAME as 'encypher',
  init,
  getBidRequestData,
};

submodule(REAL_TIME_MODULE, encypherSubmodule);
