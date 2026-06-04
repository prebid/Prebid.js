# Overview

Module Name: Encypher RTD Provider
Module Type: Rtd Provider
Maintainer: engineering@encypher.com

# Description

This module injects C2PA content provenance signals into OpenRTB bid requests at `site.ext.data.c2pa`. It enables DSPs to factor verified publisher identity and content integrity into bidding decisions.

The module runs once per page load through three paths in strict priority:

1. **Manifest Shortcut (Path A):** If a `<meta name="c2pa-manifest-url">` tag or `params.manifestUrl` is present, fetches the manifest directly without calling the signing API. This is an optional optimization for publishers who already expose manifest URLs.

2. **Cache (Path B):** Serves previously obtained provenance from localStorage (30-day TTL, keyed by canonical URL hash). No network call.

3. **API Signing and Verification (Path C):** Extracts article text from the DOM and sends it to the Encypher API. The API detects whether the content already contains embedded C2PA provenance markers. If markers are present, it verifies them and returns the existing provenance data (including the original signer tier). If no markers are found, it signs the content fresh and returns a new manifest. The result is cached and injected into the bid request.

**Key behavior:** Content signed at the CMS or CDN layer carries invisible provenance markers that survive DOM rendering. When the module sends this text to the API, the markers are detected and verified server-side. Publishers who sign at publish time receive their authenticated `signer_tier` (e.g., `connected` or `byok`) in the bid request, which is a stronger signal than the `encypher_free` tier assigned to auto-signed content.

No external JavaScript is loaded. The module uses only Prebid.js core imports. Every code path, including all error branches, calls `callback()`. A 2-second safety timeout ensures the module never blocks an auction. Path C requires GDPR consent before transmitting page content and validates the API endpoint against an allowlist of permitted hosts.

Free tier: 1,000 unique content signatures per publisher domain per month. Re-requests for the same content (deduped by content hash) do not count against quota. Verification of already-signed content does not count against quota. Quota exceeded returns gracefully with no provenance data (fail-open).

# Integration

```bash
gulp build -modules=rtdModule,encypherRtdProvider
```

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 300,
    dataProviders: [{
      name: 'encypher',
      waitForIt: true,
      params: {
        // All optional. Free tier works with zero config.
        apiBase: 'https://api.encypher.com',  // override for staging/dev
        manifestUrl: 'https://...'            // manual manifest URL (skips API call)
      }
    }]
  }
});
```

No configuration is required. The module extracts article text from the page and sends it to the Encypher API, which handles both verification of existing provenance and fresh signing.

For publishers who prefer to skip the API call entirely, output a meta tag pointing to the manifest URL:

```html
<meta name="c2pa-manifest-url" content="https://api.encypher.com/api/v1/public/prebid/manifest/abc123">
```

# Data Injected

The following object is placed at `ortb2Fragments.global.site.ext.data.c2pa`:

```json
{
  "manifest_url": "https://api.encypher.com/api/v1/public/prebid/manifest/abc123",
  "verified": true,
  "signer_tier": "connected",
  "signed_at": "2026-04-01T10:00:00Z",
  "content_hash": "a1b2c3d4e5f6",
  "source": "auto",
  "extraction_method": "json-ld"
}
```

| Field | Type | Description |
|-|-|-|
| `manifest_url` | string | URL to retrieve the C2PA manifest |
| `verified` | boolean | `true` if the content's provenance was successfully verified or signed |
| `signer_tier` | string | Signing identity tier: `local`, `encypher_free`, `connected`, `byok`. Content signed at CMS/CDN level returns the publisher's authenticated tier. |
| `signed_at` | string | ISO 8601 timestamp of signing |
| `content_hash` | string | SHA-256 hash of article text |
| `source` | string | How provenance was obtained: `cms` (Path A), `cache` (Path B), or `auto` (Path C) |
| `extraction_method` | string | DOM extraction method used (Path C): `json-ld`, `article-element`, or `role-main` |
| `action` | string | First C2PA action from manifest (Path A only, e.g., `c2pa.created`) |

# Signer Tiers

The `signer_tier` field tells DSPs how the content was authenticated:

| Tier | Meaning |
|-|-|
| `byok` | Publisher signed with their own key (strongest identity) |
| `connected` | Publisher authenticated with Encypher and signed at publish time |
| `encypher_free` | Content was auto-signed by Encypher at first pageview (no publisher authentication) |
| `local` | Manifest fetched from a local/self-hosted endpoint (Path A) |

DSPs can use this field for differential bidding: content signed by authenticated publishers carries stronger brand-safety guarantees than content attested by a third party at pageview time.

# Content Extraction

The module extracts article text from the DOM in this priority order:

1. **JSON-LD structured data:** Looks for `application/ld+json` scripts containing schema.org types `Article`, `NewsArticle`, `BlogPosting`, or `Report`. Uses `articleBody` or `text` field. Handles `@graph` arrays.
2. **`<article>` element:** Uses `textContent` of the first `<article>` element.
3. **`[role="main"]` element:** Uses `textContent` of the first element with `role="main"`.

Content shorter than 50 characters is skipped. Content longer than 50,000 characters is truncated. If no usable content is found, the module calls callback without injecting provenance data.

When extracting from JSON-LD, the module also collects article metadata (author, datePublished, dateModified, section, wordCount, keywords, publisher, language) and includes it in the signing request. This metadata is used for analytics only and is not injected into the bid request.
