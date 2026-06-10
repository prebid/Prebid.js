import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { deepSetValue, logError, logInfo, logWarn } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';
import { getCanonicalUrl, hashUrl } from '../libraries/encypherUtils/encypherUtils.ts';
import type { AllConsentData } from '../src/consentHandler.ts';
import type { RTDProviderConfig, RtdProviderSpec } from './rtdModule/spec.ts';
import type { StartAuctionOptions } from '../src/prebid.ts';

const REAL_TIME_MODULE = 'realTimeData';
export const MODULE_NAME = 'encypher';
const LOG_PREFIX = '[EncypherRTD]: ';
const STORAGE_KEY = 'encypher_provenance_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_API_BASE = 'https://api.encypher.com';
const ALLOWED_API_HOSTS = ['api.encypher.com', 'staging-api.encypher.com'];
const MAX_CONTENT_LENGTH = 50000;
const MIN_CONTENT_LENGTH = 50;
const AJAX_TIMEOUT_MS = 2000;

// ---------------------------------------------------------------------------
// Public interface types
// ---------------------------------------------------------------------------

export interface EncypherRtdParams {
  /** Override API base URL (default: https://api.encypher.com). */
  apiBase?: string;
  /** Manual manifest URL; skips the signing API call (Path A). */
  manifestUrl?: string;
}

declare module './rtdModule/spec.ts' {
  interface ProviderConfig {
    encypher: {
      params?: EncypherRtdParams;
    };
  }
}

export interface C2paPayload {
  manifest_url: string;
  verified: boolean;
  signer_tier: string;
  signed_at?: string;
  content_hash?: string;
  source: 'cms' | 'cache' | 'auto';
  extraction_method?: 'json-ld' | 'article-element' | 'role-main';
  action?: string;
}

interface ContentExtraction {
  text: string;
  source: 'json-ld' | 'article-element' | 'role-main';
  metadata: Record<string, any> | null;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

// ---------------------------------------------------------------------------
// Cache (localStorage via Prebid storageManager for consent enforcement)
// ---------------------------------------------------------------------------

export function readCache(urlHash: string): Record<string, any> | null {
  if (!storage.localStorageIsEnabled()) return null;
  try {
    const raw = storage.getDataFromLocalStorage(STORAGE_KEY);
    if (!raw) return null;
    const store = JSON.parse(raw);
    const entry = store[urlHash];
    if (!entry) return null;
    if (Date.now() > entry.expires_at) {
      delete store[urlHash];
      storage.setDataInLocalStorage(STORAGE_KEY, JSON.stringify(store));
      return null;
    }
    return entry.payload;
  } catch (e) {
    logWarn(LOG_PREFIX, 'Cache read error', e);
    return null;
  }
}

export function writeCache(urlHash: string, payload: Record<string, any>): void {
  if (!storage.localStorageIsEnabled()) return;
  try {
    const raw = storage.getDataFromLocalStorage(STORAGE_KEY);
    const store = raw ? JSON.parse(raw) : {};
    store[urlHash] = { payload, expires_at: Date.now() + CACHE_TTL_MS };
    storage.setDataInLocalStorage(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    logWarn(LOG_PREFIX, 'Cache write error', e);
  }
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

function extractMetadata(item: Record<string, any>): Record<string, any> | null {
  const meta: Record<string, any> = {};

  const author = item.author;
  if (author) {
    if (typeof author === 'string') {
      meta.author = author;
    } else if (author.name) {
      meta.author = author.name;
    } else if (Array.isArray(author) && author[0]) {
      meta.author = author[0].name || (typeof author[0] === 'string' ? author[0] : undefined);
    }
  }

  if (item.datePublished) meta.datePublished = item.datePublished;
  if (item.dateModified) meta.dateModified = item.dateModified;
  if (item.articleSection) meta.section = item.articleSection;
  if (item.wordCount) meta.wordCount = Number(item.wordCount) || undefined;

  if (item.keywords) {
    meta.keywords = Array.isArray(item.keywords)
      ? item.keywords.join(',')
      : String(item.keywords);
  }

  const pub = item.publisher;
  if (pub && pub.name) meta.publisher = pub.name;

  if (item.inLanguage) meta.language = item.inLanguage;

  return Object.keys(meta).length > 0 ? meta : null;
}

export function extractContent(): ContentExtraction | null {
  // 1. JSON-LD structured data
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      let data = JSON.parse(scripts[i].textContent || '');
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        data = data['@graph'];
      }
      const items = Array.isArray(data) ? data : [data];
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const type = item['@type'] || '';
        if (/Article|NewsArticle|BlogPosting|Report/i.test(type)) {
          const body = item.articleBody || item.text || '';
          if (body.length >= MIN_CONTENT_LENGTH) {
            return {
              text: body.slice(0, MAX_CONTENT_LENGTH),
              source: 'json-ld',
              metadata: extractMetadata(item),
            };
          }
        }
      }
    } catch (_) { /* malformed JSON-LD, skip */ }
  }

  // 2. <article> element
  const article = document.querySelector('article');
  if (article) {
    const text = (article.textContent || '').trim();
    if (text.length >= MIN_CONTENT_LENGTH) {
      return { text: text.slice(0, MAX_CONTENT_LENGTH), source: 'article-element', metadata: null };
    }
  }

  // 3. [role="main"]
  const main = document.querySelector('[role="main"]');
  if (main) {
    const text = (main.textContent || '').trim();
    if (text.length >= MIN_CONTENT_LENGTH) {
      return { text: text.slice(0, MAX_CONTENT_LENGTH), source: 'role-main', metadata: null };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Path A helpers
// ---------------------------------------------------------------------------

function buildManifestPayload(manifest: Record<string, any>, manifestUrl: string): Partial<C2paPayload> {
  return {
    manifest_url: manifestUrl,
    verified: manifest.status === 'ok',
    signer_tier: manifest.signerTier || 'local',
    action: (manifest.actions && manifest.actions[0] && manifest.actions[0].action) || undefined,
    signed_at: manifest.signedAt || undefined,
    source: 'cms',
  };
}

// ---------------------------------------------------------------------------
// Path C helpers
// ---------------------------------------------------------------------------

function signContent(
  text: string,
  apiBase: string,
  pageUrl: string,
  metadata: Record<string, any> | null,
  cb: (err: any, resp: any) => void
): void {
  const payload: Record<string, any> = {
    text,
    page_url: pageUrl,
    document_title: document.title || undefined,
  };
  if (metadata) {
    payload.metadata = metadata;
  }
  const body = JSON.stringify(payload);

  ajax(
    apiBase + '/api/v1/public/prebid/sign',
    {
      success(responseText: string) {
        try {
          cb(null, JSON.parse(responseText));
        } catch (e) {
          cb(e, null);
        }
      },
      error(error: any) {
        cb(error, null);
      },
    },
    body,
    {
      method: 'POST',
    }
  );
}

// ---------------------------------------------------------------------------
// Submodule interface
// ---------------------------------------------------------------------------

function isAllowedApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_API_HOSTS.indexOf(parsed.hostname) !== -1;
  } catch (_) {
    return false;
  }
}

/**
 * Check if privacy signals allow data transmission.
 * Returns false when any applicable regulation indicates opt-out or restriction.
 */
function hasConsentForDataTransmission(userConsent: AllConsentData | null | undefined): boolean {
  if (!userConsent) return true;

  // COPPA: children's data must never be transmitted
  if (userConsent.coppa === true) return false;

  // USP/CCPA: position 2 is the opt-out-sale flag; 'Y' means user opted out
  if (userConsent.usp && typeof userConsent.usp === 'string') {
    if (userConsent.usp[2] === 'Y') return false;
  }

  // GDPR: require a consent string when GDPR applies
  if (userConsent.gdpr) {
    if (userConsent.gdpr.gdprApplies && !userConsent.gdpr.consentString) return false;
  }

  return true;
}

const init = (
  _config: RTDProviderConfig<'encypher'>,
  _userConsent: AllConsentData
): boolean => {
  return true;
};

/**
 * Three execution paths in strict priority:
 *
 *   Path A (CMS): <meta name="c2pa-manifest-url"> or params.manifestUrl
 *   Path B (Cache): localStorage hit for canonical URL hash
 *   Path C (Auto-sign): Extract article text from DOM, POST to Encypher API
 *
 * Every path and every error branch calls callback().
 */
const getBidRequestData = (
  reqBidsConfigObj: StartAuctionOptions,
  callback: () => void,
  moduleConfig: RTDProviderConfig<'encypher'>,
  userConsent: AllConsentData
): void => {
  const params = (moduleConfig && moduleConfig.params) || {};
  const apiBase = params.apiBase || DEFAULT_API_BASE;
  const canonicalUrl = getCanonicalUrl();
  const urlHash = hashUrl(canonicalUrl);

  let callbackFired = false;
  function done() {
    if (callbackFired) return;
    callbackFired = true;
    callback();
  }

  const timer = setTimeout(() => {
    if (!callbackFired) {
      logWarn(LOG_PREFIX, 'Timeout reached, continuing without provenance');
      done();
    }
  }, AJAX_TIMEOUT_MS);

  function finish() {
    clearTimeout(timer);
    done();
  }

  // -- Path A: CMS meta tag or manual manifestUrl override -----------------
  const metaTag = document.querySelector('meta[name="c2pa-manifest-url"]') as HTMLMetaElement | null;
  const manifestUrl = (metaTag && metaTag.content) || params.manifestUrl || null;

  if (manifestUrl) {
    try {
      if (new URL(manifestUrl).protocol !== 'https:') {
        logWarn(LOG_PREFIX, 'Path A: manifestUrl must use HTTPS, skipping');
        finish();
        return;
      }
    } catch (_) {
      logWarn(LOG_PREFIX, 'Path A: invalid manifestUrl, skipping');
      finish();
      return;
    }
    logInfo(LOG_PREFIX, 'Path A: fetching manifest from', manifestUrl);
    ajax(
      manifestUrl,
      {
        success(responseText: string) {
          try {
            const manifest = JSON.parse(responseText);
            const payload = buildManifestPayload(manifest, manifestUrl);
            deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.ext.data.c2pa', payload);
            logInfo(LOG_PREFIX, 'Path A: provenance injected');
          } catch (e) {
            logError(LOG_PREFIX, 'Path A: manifest parse error', e);
          }
          finish();
        },
        error(e: any) {
          logError(LOG_PREFIX, 'Path A: manifest fetch error', e);
          finish();
        },
      },
      null,
      { method: 'GET' }
    );
    return;
  }

  // -- Path B: localStorage cache hit --------------------------------------
  const cached = readCache(urlHash);
  if (cached) {
    logInfo(LOG_PREFIX, 'Path B: cache hit for', canonicalUrl);
    const payload = Object.assign({}, cached, { source: 'cache' });
    deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.ext.data.c2pa', payload);
    finish();
    return;
  }

  // -- Path C: auto-sign via Encypher API ----------------------------------

  if (!hasConsentForDataTransmission(userConsent)) {
    logInfo(LOG_PREFIX, 'Path C: skipping, no consent for data transmission');
    finish();
    return;
  }

  if (!isAllowedApiUrl(apiBase + '/api/v1/public/prebid/sign')) {
    logWarn(LOG_PREFIX, 'Path C: apiBase not in allowed hosts, skipping');
    finish();
    return;
  }

  const content = extractContent();
  if (!content) {
    logInfo(LOG_PREFIX, 'Path C: no extractable content, skipping');
    finish();
    return;
  }

  logInfo(LOG_PREFIX, 'Path C: signing content via', content.source);
  signContent(content.text, apiBase, canonicalUrl, content.metadata, (err, resp) => {
    if (err || !resp || !resp.success) {
      logWarn(LOG_PREFIX, 'Path C: sign API error, continuing without provenance', err);
      finish();
      return;
    }

    const payload: C2paPayload = {
      manifest_url: resp.manifest_url,
      verified: true,
      signer_tier: resp.signer_tier || 'encypher_free',
      signed_at: resp.signed_at,
      content_hash: resp.content_hash,
      extraction_method: content.source,
      source: 'auto',
    };

    writeCache(urlHash, payload);
    deepSetValue(reqBidsConfigObj.ortb2Fragments.global, 'site.ext.data.c2pa', payload);
    logInfo(LOG_PREFIX, 'Path C: provenance signed and injected');
    finish();
  });
};

export const encypherSubmodule: RtdProviderSpec<'encypher'> = {
  name: MODULE_NAME as 'encypher',
  init,
  getBidRequestData,
};

submodule(REAL_TIME_MODULE, encypherSubmodule);

export { getCanonicalUrl, hashUrl };
