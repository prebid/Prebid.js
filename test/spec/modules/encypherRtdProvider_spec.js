import assert from 'assert';
import {
  encypherSubmodule,
  MODULE_NAME,
  getCanonicalUrl,
  hashUrl,
  readCache,
  writeCache,
  extractContent,
  storage,
} from 'modules/encypherRtdProvider.ts';
import { server } from 'test/mocks/xhr.js';

describe('encypherRtdProvider', () => {
  const fakeHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  const fakeManifest = {
    status: 'ok',
    signerTier: 'connected',
    actions: [{ action: 'c2pa.created' }],
    signedAt: '2026-04-01T10:00:00Z',
  };

  const fakeSignResponse = {
    success: true,
    manifest_url: 'https://api.encypher.com/api/v1/public/prebid/manifest/abc123',
    signer_tier: 'encypher_free',
    signed_at: '2026-04-01T10:00:00Z',
    content_hash: 'a1b2c3d4e5f6',
  };

  const manifestUrl = 'https://publisher.com/wp-json/c2pa-provenance/v1/images/manifest/42';

  function makeReqBidsConfigObj() {
    return { ortb2Fragments: { global: {} } };
  }

  // -- DOM helpers ----------------------------------------------------------

  let cleanups = [];

  function addMeta(url) {
    const m = document.createElement('meta');
    m.name = 'c2pa-manifest-url';
    m.content = url;
    document.head.appendChild(m);
    cleanups.push(() => m.parentNode && m.parentNode.removeChild(m));
    return m;
  }

  function addArticle(text) {
    const el = document.createElement('article');
    el.textContent = text;
    document.body.appendChild(el);
    cleanups.push(() => el.parentNode && el.parentNode.removeChild(el));
    return el;
  }

  function addJsonLd(data) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
    cleanups.push(() => script.parentNode && script.parentNode.removeChild(script));
    return script;
  }

  function addMain(text) {
    const el = document.createElement('div');
    el.setAttribute('role', 'main');
    el.textContent = text;
    document.body.appendChild(el);
    cleanups.push(() => el.parentNode && el.parentNode.removeChild(el));
    return el;
  }

  function clearStorageKey() {
    try { localStorage.removeItem('encypher_provenance_v1'); } catch (_) {}
  }

  afterEach(() => {
    cleanups.forEach(fn => fn());
    cleanups = [];
    clearStorageKey();
  });

  // =========================================================================
  // init
  // =========================================================================

  describe('init', () => {
    it('returns true', () => {
      assert.strictEqual(encypherSubmodule.init({}), true);
    });

    it('has the correct module name', () => {
      assert.strictEqual(encypherSubmodule.name, 'encypher');
      assert.strictEqual(MODULE_NAME, 'encypher');
    });

    it('exposes getBidRequestData', () => {
      assert.strictEqual(typeof encypherSubmodule.getBidRequestData, 'function');
    });
  });

  // =========================================================================
  // Path A -- CMS meta tag
  // =========================================================================

  describe('Path A -- CMS meta tag', () => {
    it('fetches manifest from meta tag and injects site.ext.data.c2pa', (done) => {
      addMeta(manifestUrl);
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.manifest_url, manifestUrl);
        assert.strictEqual(c2pa.verified, true);
        assert.strictEqual(c2pa.signer_tier, 'connected');
        assert.strictEqual(c2pa.action, 'c2pa.created');
        assert.strictEqual(c2pa.signed_at, '2026-04-01T10:00:00Z');
        assert.strictEqual(c2pa.source, 'cms');
        done();
      }, { params: {} });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify(fakeManifest)
      );
    });

    it('uses params.manifestUrl when meta tag is absent', (done) => {
      const configUrl = 'https://example.com/manifest/99';
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.manifest_url, configUrl);
        assert.strictEqual(c2pa.verified, true);
        assert.strictEqual(c2pa.source, 'cms');
        done();
      }, { params: { manifestUrl: configUrl } });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify(fakeManifest)
      );
    });

    it('calls callback on HTTP 500 without injecting (fail-open)', (done) => {
      addMeta(manifestUrl);
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        done();
      }, { params: {} });

      server.requests[server.requests.length - 1].respond(
        500, fakeHeaders, 'Internal Server Error'
      );
    });

    it('calls callback on malformed JSON without throwing', (done) => {
      addMeta(manifestUrl);
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        done();
      }, { params: {} });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, 'not-json'
      );
    });

    it('rejects non-HTTPS manifest URLs', (done) => {
      addMeta('http://publisher.com/manifest/42');
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: {} });
    });

    it('sets verified to false when manifest status is not ok', (done) => {
      addMeta(manifestUrl);
      const badManifest = Object.assign({}, fakeManifest, { status: 'error' });
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.verified, false);
        done();
      }, { params: {} });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify(badManifest)
      );
    });
  });

  // =========================================================================
  // Path B -- cache hit
  // =========================================================================

  describe('Path B -- cache hit', () => {
    it('injects from cache with source "cache" and makes no XHR', (done) => {
      const cachedPayload = {
        manifest_url: 'https://api.encypher.com/manifest/cached',
        verified: true,
        signer_tier: 'encypher_free',
        signed_at: '2026-03-31T00:00:00Z',
        content_hash: 'deadbeef',
      };
      const urlHash = hashUrl(getCanonicalUrl());
      writeCache(urlHash, cachedPayload);

      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.manifest_url, 'https://api.encypher.com/manifest/cached');
        assert.strictEqual(c2pa.source, 'cache');
        assert.strictEqual(c2pa.signer_tier, 'encypher_free');
        // No new XHR requests
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: {} });
    });

    it('falls through to Path C when cache entry is expired', (done) => {
      // Write an expired cache entry
      const urlHash = hashUrl(getCanonicalUrl());
      const raw = {};
      raw[urlHash] = {
        payload: { manifest_url: 'https://old.com/manifest' },
        expires_at: Date.now() - 1000, // expired
      };
      localStorage.setItem('encypher_provenance_v1', JSON.stringify(raw));

      // Add article content so Path C has something to sign
      addArticle('A'.repeat(100));

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.source, 'auto');
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      // Path C fires a POST request
      const lastReq = server.requests[server.requests.length - 1];
      assert.strictEqual(lastReq.method, 'POST');
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });
  });

  // =========================================================================
  // Path C -- auto-sign
  // =========================================================================

  describe('Path C -- auto-sign', () => {
    it('extracts <article> text and signs via API', (done) => {
      const articleText = 'This is a real article with enough content to pass the minimum length threshold for extraction.';
      addArticle(articleText);

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.manifest_url, fakeSignResponse.manifest_url);
        assert.strictEqual(c2pa.verified, true);
        assert.strictEqual(c2pa.signer_tier, 'encypher_free');
        assert.strictEqual(c2pa.content_hash, 'a1b2c3d4e5f6');
        assert.strictEqual(c2pa.source, 'auto');
        assert.strictEqual(c2pa.extraction_method, 'article-element');
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      const lastReq = server.requests[server.requests.length - 1];
      assert.strictEqual(lastReq.method, 'POST');
      assert.ok(lastReq.url.includes('/api/v1/public/prebid/sign'));

      const body = JSON.parse(lastReq.requestBody);
      assert.ok(body.text.length >= 50);
      assert.ok(body.page_url);

      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('does not set Content-Type: application/json or custom Accept header (CORS preflight avoidance)', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      const lastReq = server.requests[server.requests.length - 1];
      const headers = lastReq.requestHeaders;
      assert.notStrictEqual(headers['Content-Type'], 'application/json');
      assert.strictEqual(headers['Accept'], undefined);
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('prefers JSON-LD articleBody over <article> element', (done) => {
      addJsonLd({
        '@type': 'NewsArticle',
        articleBody: 'This is the JSON-LD article body which should take priority over the article element text content.',
      });
      addArticle('This is the fallback article element text that should not be used when JSON-LD is available.');

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.extraction_method, 'json-ld');
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      const lastReq = server.requests[server.requests.length - 1];
      const body = JSON.parse(lastReq.requestBody);
      assert.ok(body.text.includes('JSON-LD article body'));
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('sends JSON-LD metadata in the sign request body', (done) => {
      addJsonLd({
        '@type': 'NewsArticle',
        articleBody: 'This article body is long enough to pass the minimum content length threshold for extraction.',
        author: { '@type': 'Person', name: 'Jane Reporter' },
        datePublished: '2026-04-25T09:00:00Z',
        articleSection: 'Technology',
        wordCount: 1200,
        keywords: ['AI', 'provenance', 'publishing'],
        publisher: { '@type': 'Organization', name: 'Example News' },
        inLanguage: 'en',
      });

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      const lastReq = server.requests[server.requests.length - 1];
      const body = JSON.parse(lastReq.requestBody);
      assert.ok(body.metadata);
      assert.strictEqual(body.metadata.author, 'Jane Reporter');
      assert.strictEqual(body.metadata.datePublished, '2026-04-25T09:00:00Z');
      assert.strictEqual(body.metadata.section, 'Technology');
      assert.strictEqual(body.metadata.wordCount, 1200);
      assert.strictEqual(body.metadata.keywords, 'AI,provenance,publishing');
      assert.strictEqual(body.metadata.publisher, 'Example News');
      assert.strictEqual(body.metadata.language, 'en');
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('does not send metadata field when extraction is from <article> element', (done) => {
      addArticle('This is plain article element text with enough content to pass the minimum length threshold.');

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      const lastReq = server.requests[server.requests.length - 1];
      const body = JSON.parse(lastReq.requestBody);
      assert.strictEqual(body.metadata, undefined);
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('uses [role="main"] when no <article> element', (done) => {
      addMain('This is the main content area that serves as a fallback when no article element is present on the page.');

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.strictEqual(c2pa.extraction_method, 'role-main');
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      const lastReq = server.requests[server.requests.length - 1];
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('calls callback on API error without injecting (fail-open)', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      server.requests[server.requests.length - 1].respond(
        500, fakeHeaders, 'Internal Server Error'
      );
    });

    it('calls callback on API success with success=false (fail-open)', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify({ success: false, error: 'quota_exceeded' })
      );
    });

    it('calls callback without signing when no extractable content', (done) => {
      // No article, no JSON-LD, no [role="main"]
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: {} });
    });

    it('writes to cache after successful signing', (done) => {
      addArticle('A'.repeat(100));
      const urlHash = hashUrl(getCanonicalUrl());

      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const cached = readCache(urlHash);
        assert.ok(cached);
        assert.strictEqual(cached.manifest_url, fakeSignResponse.manifest_url);
        assert.strictEqual(cached.signer_tier, 'encypher_free');
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify(fakeSignResponse)
      );
    });
  });

  // =========================================================================
  // Security guards
  // =========================================================================

  describe('security guards', () => {
    it('skips Path C when GDPR applies but no consent string', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: {} }, { gdpr: { gdprApplies: true, consentString: '' } });
    });

    it('allows Path C when GDPR applies and consent string is present', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: {} }, { gdpr: { gdprApplies: true, consentString: 'BOEFEAyOEFEAyAHABDENAI4AAAB9vABAASA' } });

      const lastReq = server.requests[server.requests.length - 1];
      assert.strictEqual(lastReq.method, 'POST');
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('allows Path C when no GDPR object present', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: {} }, null);

      const lastReq = server.requests[server.requests.length - 1];
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('skips Path C when USP string indicates opt-out (position 2 = Y)', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: {} }, { usp: '1YYN' });
    });

    it('allows Path C when USP notice given but no opt-out', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } }, { usp: '1YNN' });

      const lastReq = server.requests[server.requests.length - 1];
      assert.strictEqual(lastReq.method, 'POST');
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('skips Path C when COPPA applies', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: {} }, { coppa: true });
    });

    it('allows Path C when COPPA is false', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } }, { coppa: false });

      const lastReq = server.requests[server.requests.length - 1];
      assert.strictEqual(lastReq.method, 'POST');
      lastReq.respond(200, fakeHeaders, JSON.stringify(fakeSignResponse));
    });

    it('skips Path C when apiBase is not in allowed hosts', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: { apiBase: 'https://evil.example.com' } });
    });

    it('skips Path C when apiBase uses HTTP instead of HTTPS', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();
      const requestCountBefore = server.requests.length;

      encypherSubmodule.getBidRequestData(req, () => {
        assert.strictEqual(req.ortb2Fragments.global.site, undefined);
        assert.strictEqual(server.requests.length, requestCountBefore);
        done();
      }, { params: { apiBase: 'http://api.encypher.com' } });
    });
  });

  // =========================================================================
  // Payload shape
  // =========================================================================

  describe('payload shape', () => {
    it('Path A payload has expected fields', (done) => {
      addMeta(manifestUrl);
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        const keys = Object.keys(c2pa).sort();
        assert.ok(keys.includes('manifest_url'));
        assert.ok(keys.includes('verified'));
        assert.ok(keys.includes('signer_tier'));
        assert.ok(keys.includes('source'));
        assert.strictEqual(c2pa.source, 'cms');
        done();
      }, { params: {} });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify(fakeManifest)
      );
    });

    it('Path C payload has expected fields including extraction_method', (done) => {
      addArticle('A'.repeat(100));
      const req = makeReqBidsConfigObj();

      encypherSubmodule.getBidRequestData(req, () => {
        const c2pa = req.ortb2Fragments.global.site.ext.data.c2pa;
        assert.ok(c2pa.manifest_url);
        assert.strictEqual(c2pa.verified, true);
        assert.ok(c2pa.signer_tier);
        assert.ok(c2pa.signed_at);
        assert.ok(c2pa.content_hash);
        assert.ok(c2pa.extraction_method);
        assert.strictEqual(c2pa.source, 'auto');
        done();
      }, { params: { apiBase: 'https://api.encypher.com' } });

      server.requests[server.requests.length - 1].respond(
        200, fakeHeaders, JSON.stringify(fakeSignResponse)
      );
    });
  });

  // =========================================================================
  // Utility functions
  // =========================================================================

  describe('utilities', () => {
    it('hashUrl returns consistent hex string', () => {
      const h1 = hashUrl('https://example.com/article/1');
      const h2 = hashUrl('https://example.com/article/1');
      assert.strictEqual(h1, h2);
      assert.ok(/^[0-9a-f]+$/.test(h1));
    });

    it('hashUrl produces different hashes for different URLs', () => {
      const h1 = hashUrl('https://example.com/article/1');
      const h2 = hashUrl('https://example.com/article/2');
      assert.notStrictEqual(h1, h2);
    });

    it('extractContent returns null when no content elements exist', () => {
      assert.strictEqual(extractContent(), null);
    });

    it('extractContent skips short content (<50 chars)', () => {
      addArticle('Short text');
      assert.strictEqual(extractContent(), null);
    });

    it('extractContent returns metadata from JSON-LD', () => {
      addJsonLd({
        '@type': 'Article',
        articleBody: 'A'.repeat(100),
        author: 'John Smith',
        datePublished: '2026-04-20',
        articleSection: 'Science',
      });
      const result = extractContent();
      assert.ok(result);
      assert.strictEqual(result.source, 'json-ld');
      assert.ok(result.metadata);
      assert.strictEqual(result.metadata.author, 'John Smith');
      assert.strictEqual(result.metadata.datePublished, '2026-04-20');
      assert.strictEqual(result.metadata.section, 'Science');
    });

    it('extractContent returns null metadata for <article> element', () => {
      addArticle('A'.repeat(100));
      const result = extractContent();
      assert.ok(result);
      assert.strictEqual(result.source, 'article-element');
      assert.strictEqual(result.metadata, null);
    });

    it('extractContent handles author as array of Person objects', () => {
      addJsonLd({
        '@type': 'NewsArticle',
        articleBody: 'A'.repeat(100),
        author: [{ '@type': 'Person', name: 'First Author' }, { '@type': 'Person', name: 'Second Author' }],
      });
      const result = extractContent();
      assert.ok(result.metadata);
      assert.strictEqual(result.metadata.author, 'First Author');
    });
  });
});
