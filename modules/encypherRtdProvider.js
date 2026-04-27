import { MODULE_TYPE_RTD } from '../src/activities/modules.js';
import { submodule } from '../src/hook.js';
import { ajax } from '../src/ajax.js';
import { deepSetValue, logError, logInfo, logWarn } from '../src/utils.js';
import { getStorageManager } from '../src/storageManager.js';

const REAL_TIME_MODULE = 'realTimeData';
export const MODULE_NAME = 'encypher';
const LOG_PREFIX = '[EncypherRTD]: ';
const STORAGE_KEY = 'encypher_provenance_v1';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEFAULT_API_BASE = 'https://api.encypher.com';
const ALLOWED_API_HOSTS = ['api.encypher.com', 'staging-api.encypher.com'];
const MAX_CONTENT_LENGTH = 50000; // ~50KB ceiling for POST body
const MIN_CONTENT_LENGTH = 50; // minimum chars to consider as article content
const AJAX_TIMEOUT_MS = 2000; // max wait for API calls before calling callback

export const storage = getStorageManager({
  moduleType: MODULE_TYPE_RTD,
  moduleName: MODULE_NAME,
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Resolve the canonical URL for the current page.
 * Prefers <link rel="canonical">, falls back to location.href stripped of hash/query.
 */
export function getCanonicalUrl() {
  const link = document.querySelector('link[rel="canonical"]');
  if (link && link.href) return link.href;
  return window.location.href.split('#')[0].split('?')[0];
}

/**
 * djb2 hash (same algorithm as provenance-utils.js hashText).
 * Returns a hex string suitable for use as a cache key.
 */
export function hashUrl(url) {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = ((h << 5) - h + url.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}

// ---------------------------------------------------------------------------
// Cache (localStorage via Prebid storageManager for GDPR consent enforcement)
// ---------------------------------------------------------------------------

/**
 * Read a cached provenance payload for the given URL hash.
 * Returns the payload object or null if missing/expired/unavailable.
 */
export function readCache(urlHash) {
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

/**
 * Write a provenance payload to cache, keyed by URL hash.
 */
export function writeCache(urlHash, payload) {
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

/**
 * Extract structured metadata from a JSON-LD item.
 * Returns a flat object with only non-empty string/number values.
 */
function extractMetadata(item) {
  const meta = {};

  // Author (string or Person/Organization object)
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

  // Keywords (string or array)
  if (item.keywords) {
    meta.keywords = Array.isArray(item.keywords)
      ? item.keywords.join(',')
      : String(item.keywords);
  }

  // Publisher name
  const pub = item.publisher;
  if (pub && pub.name) meta.publisher = pub.name;

  // Language
  if (item.inLanguage) meta.language = item.inLanguage;

  return Object.keys(meta).length > 0 ? meta : null;
}

/**
 * Extract article text from the DOM in priority order:
 *   1. JSON-LD schema.org Article/NewsArticle/BlogPosting articleBody
 *   2. <article> element innerText
 *   3. [role="main"] element innerText
 *
 * Returns { text: string, source: string, metadata: object|null }
 * or null if no usable content found.
 */
export function extractContent() {
  // 1. JSON-LD structured data
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    try {
      let data = JSON.parse(scripts[i].textContent);
      // Handle @graph arrays
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
    const text = article.textContent.trim();
    if (text.length >= MIN_CONTENT_LENGTH) {
      return { text: text.slice(0, MAX_CONTENT_LENGTH), source: 'article-element', metadata: null };
    }
  }

  // 3. [role="main"]
  const main = document.querySelector('[role="main"]');
  if (main) {
    const text = main.textContent.trim();
    if (text.length >= MIN_CONTENT_LENGTH) {
      return { text: text.slice(0, MAX_CONTENT_LENGTH), source: 'role-main', metadata: null };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Path A helpers
// ---------------------------------------------------------------------------

/**
 * Build the OpenRTB payload from a fetched manifest (Path A).
 */
function buildManifestPayload(manifest, manifestUrl) {
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

/**
 * POST article content to the Encypher signing API.
 * Calls cb(err, response) on completion.
 */
function signContent(text, apiBase, pageUrl, metadata, cb) {
  const payload = {
    text: text,
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
      success(responseText) {
        try {
          cb(null, JSON.parse(responseText));
        } catch (e) {
          cb(e, null);
        }
      },
      error(error) {
        cb(error, null);
      },
    },
    body,
    {
      method: 'POST',
      contentType: 'application/json',
      customHeaders: {
        Accept: 'application/json',
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Submodule interface
// ---------------------------------------------------------------------------

/**
 * Validate that a URL uses HTTPS and belongs to an allowed host.
 */
function isAllowedApiUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_API_HOSTS.indexOf(parsed.hostname) !== -1;
  } catch (_) {
    return false;
  }
}

/**
 * Check if GDPR consent allows data transmission.
 * Returns true if consent is granted or if no GDPR applies.
 */
function hasConsentForDataTransmission(userConsent) {
  if (!userConsent || !userConsent.gdpr) return true;
  const gdpr = userConsent.gdpr;
  if (!gdpr.gdprApplies) return true;
  // If GDPR applies, require consent string to be present
  return !!(gdpr.consentString);
}

/**
 * @param {Object} config - Provider config ({ name, waitForIt, params })
 * @param {Object} userConsent
 * @returns {boolean} - false disables the module
 */
const init = (config, userConsent) => {
  return true;
};

/**
 * Three execution paths in strict priority:
 *
 *   Path A (CMS): <meta name="c2pa-manifest-url"> or params.manifestUrl
 *     -> Fetch manifest JSON, inject site.ext.data.c2pa
 *
 *   Path B (Cache): localStorage hit for canonical URL hash
 *     -> Inject from cache, no network call
 *
 *   Path C (Auto-sign): Extract article text from DOM, POST to Encypher API
 *     -> Cache result, inject site.ext.data.c2pa
 *
 * Every path and every error branch calls callback(). The module never blocks
 * an auction.
 *
 * @param {Object} reqBidsConfigObj - Proxied StartAuctionOptions
 * @param {Function} callback - MUST always be called
 * @param {Object} moduleConfig - Provider config with .params
 * @param {Object} userConsent
 */
const getBidRequestData = (reqBidsConfigObj, callback, moduleConfig, userConsent) => {
  const params = (moduleConfig && moduleConfig.params) || {};
  const apiBase = params.apiBase || DEFAULT_API_BASE;
  const canonicalUrl = getCanonicalUrl();
  const urlHash = hashUrl(canonicalUrl);

  // Callback-once guard: ensure callback is never invoked twice
  let callbackFired = false;
  function done() {
    if (callbackFired) return;
    callbackFired = true;
    callback();
  }

  // Safety timeout: never block the auction longer than AJAX_TIMEOUT_MS
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
  const metaTag = document.querySelector('meta[name="c2pa-manifest-url"]');
  const manifestUrl = (metaTag && metaTag.content) || params.manifestUrl || null;

  if (manifestUrl) {
    logInfo(LOG_PREFIX, 'Path A: fetching manifest from', manifestUrl);
    ajax(
      manifestUrl,
      {
        success(responseText) {
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
        error(e) {
          logError(LOG_PREFIX, 'Path A: manifest fetch error', e);
          finish();
        },
      },
      null,
      { method: 'GET', customHeaders: { Accept: 'application/json' } }
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

  // Consent gate: do not transmit page content without consent
  if (!hasConsentForDataTransmission(userConsent)) {
    logInfo(LOG_PREFIX, 'Path C: skipping, no consent for data transmission');
    finish();
    return;
  }

  // Validate API base URL against allowlist
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

    const payload = {
      manifest_url: resp.manifest_url,
      verified: true,
      signer_tier: resp.signer_tier || 'encypher_free',
      signed_at: resp.signed_at,
      content_hash: resp.content_hash,
      extraction_method: content.source,
    };

    writeCache(urlHash, payload);
    deepSetValue(
      reqBidsConfigObj.ortb2Fragments.global,
      'site.ext.data.c2pa',
      Object.assign({}, payload, { source: 'auto' })
    );
    logInfo(LOG_PREFIX, 'Path C: provenance signed and injected');
    finish();
  });
};

/** @type {import('../src/hook.js').SubmoduleConfig} */
export const encypherSubmodule = {
  name: MODULE_NAME,
  init,
  getBidRequestData,
};

submodule(REAL_TIME_MODULE, encypherSubmodule);
