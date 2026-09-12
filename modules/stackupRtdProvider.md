# Stack Up RTD Provider

## Overview

Module Name: Stack Up Rtd Provider  
Module Type: Rtd Provider  
Maintainers: anton@stackup-ai.com, chen@stackup-ai.com, nicolas@stackup-ai.com

## Description

The Stack Up RTD module enriches Prebid.js bid requests with contextual and audience segments derived from the content of the current page. Before the auction fires, the module calls the Stack Up enrichment API (or reads from a `sessionStorage` cache on revisit) and merges the response into the global `ortb2` fragments:

- **`site.content.data`** — IAB Content Taxonomy 2.2 (`segtax: 6`) and 3.1 (`segtax: 9`) segments, untagged Stack Up proprietary segments, and optional publisher profile data (`segtax: 600`).
- **`site.cattax` / `site.pagecat`** — the matching Content Taxonomy 2.2 page category when one is available.
- **`user.data`** — IAB Audience Taxonomy segments (`segtax: 4`) and untagged Stack Up proprietary audience segments inferred from contextual signals.

During migration the module also accepts the legacy Stack Up content and audience values (`segtax: 502` and `segtax: 501`) from cached or not-yet-rebuilt enrichment responses.

Every bidder that participates in the auction receives these segments in its `ortb2` object. No cookies, fingerprints, or user identifiers are transmitted to the Stack Up API — only a URL path and publisher domain.

Become a member of Stack Up in order to receive your `pubId`. Contact [support@stackup-ai.com](mailto:support@stackup-ai.com) for more details.

## Build

Include the Stack Up RTD module and the core RTD module when building Prebid.js:

```bash
gulp build --modules=rtdModule,stackupRtdProvider
```

Add any bid adapters you use to the same build:

```bash
gulp build --modules=rtdModule,stackupRtdProvider,appnexusBidAdapter
```

## Configuration

Configure the module inside `realTimeData.dataProviders` via `pbjs.setConfig`.

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 1000, // ms to wait for RTD modules before starting auction
    dataProviders: [
      {
        name: "stackupRtd",
        waitForIt: true, // keep in sync with auctionDelay
        params: {
          pubId: "YOUR-PUB-ID", // required — issued by Stack Up
          timeout: 300, // optional — enrichment budget in ms (default: 300)
          articleIdMode: "path", // optional — 'path' (default) or 'explicit'
          articleId: "", // required when articleIdMode is 'explicit'
          apiUrl: "https://api.stackup-ai.com/v1/enrich-ortb-rtd", // optional — override API endpoint
          cache: {
            enabled: true, // optional — disable all cache read/write when false (default: true)
            ttlSeconds: 3600, // optional — cache TTL in seconds (default: 3600)
            storage: "session", // optional — 'session' (default) or 'memory'
          },
        },
      },
    ],
  },
});
```

### Parameters

| Name                      |    Scope    |  Type   | Description                                                                                                                 |                      Default                      |
| :------------------------ | :---------: | :-----: | :-------------------------------------------------------------------------------------------------------------------------- | :-----------------------------------------------: |
| `name`                    |  required   | String  | Must be `'stackupRtd'`                                                                                                      |                         —                         |
| `waitForIt`               | recommended | Boolean | Set `true` when an `auctionDelay` is defined                                                                                |                      `false`                      |
| `params`                  |  required   | Object  | Module configuration                                                                                                        |                         —                         |
| `params.pubId`            |  required   | String  | Publisher ID issued by Stack Up                                                                                             |                         —                         |
| `params.timeout`          |  optional   | Integer | Max ms to wait for the enrichment API before releasing the auction                                                          |                       `300`                       |
| `params.articleIdMode`    |  optional   | String  | How the article ID is determined. `'path'` derives it from the page URL path; `'explicit'` uses `params.articleId` directly |                     `'path'`                      |
| `params.articleId`        | optional\*  | String  | Article identifier — required when `articleIdMode` is `'explicit'`. Max 512 characters                                      |                         —                         |
| `params.apiUrl`           |  optional   | String  | Override the Stack Up enrichment endpoint                                                                                   | `'https://api.stackup-ai.com/v1/enrich-ortb-rtd'` |
| `params.cache.enabled`    |  optional   | Boolean | Enable/disable cache usage entirely                                                                                         |                      `true`                       |
| `params.cache.ttlSeconds` |  optional   | Integer | How long a cached result is considered fresh (sessionStorage TTL)                                                           |                      `3600`                       |
| `params.cache.storage`    |  optional   | String  | Cache backend: `'session'` for browser sessionStorage or `'memory'` for in-process cache                                    |                    `'session'`                    |
| `params.debug`            |  optional   | Boolean | Enable verbose `[stackupRtd]` console logging                                                                               |                      `false`                      |
| `params.debugDomain`      |  optional   | String  | Override the domain sent to the API when `debug: true`                                                                      |                    page domain                    |

## Consent

The module respects user consent before making any network requests:

- **COPPA**: if `coppa: true` is set, the module is inert.
- **GDPR**: when GDPR applies, the module requires consent (or legitimate interest) for **Purpose 1** (Store/access information on a device) and **Purpose 4** (Select personalised content). If either purpose is missing, or if `vendorData` is absent (e.g. CMP timeout), the module does nothing.
- **USP / CCPA / GPP**: not enforced — the Stack Up API receives only a URL path and domain, no user identifiers, so US sale-of-data frameworks do not apply.

## Article ID Resolution

### `articleIdMode: 'path'` (default)

The module normalises the current page URL path using Prebid's built-in referer detection (works inside iframes and AMP frames). The normalisation strips:

- Trailing slashes
- AMP path variants (`/amp/`, `/_amp/`, `/amp` suffix)
- Double slashes

The resulting path is sent to the API and is also used as the `sessionStorage` cache key (via a fast hash) so cache hits are consistent across AMP and canonical URLs for the same article.

### `articleIdMode: 'explicit'`

Pass a stable, opaque article identifier directly in `params.articleId`. Use this when you have a CMS-issued slug or numeric ID that is more stable than the URL.

## Caching

When `params.cache.enabled` is `true` (default), the module checks cache before making a network call.
With `params.cache.storage: 'session'`, it writes to `sessionStorage` under the key:

```text
stackup:enrich:v1:path_<hash>
```

With `params.cache.storage: 'memory'`, entries are kept in runtime memory only and are cleared on full page reload.
Cache entries expire after `params.cache.ttlSeconds` (default 1 hour). Setting `params.cache.enabled: false` disables both reads and writes.

The hash is derived from article context (articleId plus publisher/request context), preventing cross-publisher/context cache reuse in a shared browser session.

## ortb2 Output Shape

After a successful enrichment the following fields are merged into the global `ortb2` object (non-destructively — existing publisher values are preserved):

```json
{
  "site": {
    "cattax": 2,
    "pagecat": ["IAB19-6"],
    "content": {
      "title": "<article title>",
      "data": [
        {
          "name": "data.stackup-ai.com",
          "ext": { "segtax": 6 },
          "segment": [{ "id": "324" }, { "id": "328" }]
        },
        {
          "name": "data.stackup-ai.com",
          "ext": { "segtax": 9 },
          "segment": [{ "id": "602" }, { "id": "607" }]
        },
        {
          "name": "data.stackup-ai.com",
          "segment": [
            { "id": "stackup:content:smartwatches" }
          ]
        }
      ],
      "ext": {
        "stackup": {
          "content_suitability": {
            "framework": "garm",
            "floor_violation": 0,
            "risk": "low"
          },
          "emotion": {}
        }
      }
    }
  },
  "user": {
    "data": [
      {
        "name": "data.stackup-ai.com",
        "ext": { "segtax": 4 },
        "segment": [{ "id": "AUD-456" }]
      },
      {
        "name": "data.stackup-ai.com",
        "segment": [{ "id": "stackup:interests:technology" }]
      }
    ]
  }
}
```

Data blocks are matched by `name` plus `ext.segtax`, so the 2.2 and 3.1 blocks remain separate. Matching blocks are unioned by `segment[].id`; publisher-provided segment fields win on an ID collision. Existing publisher `site.cattax`, `site.pagecat`, and content extension values are preserved. The resolved URL path is used for the API lookup and cache key, but is not synthesized into `site.content.id`.

## Integration Example

```bash
gulp build --modules=rtdModule,stackupRtdProvider,appnexusBidAdapter
```

Start a static file server at the repo root on port 9999, then open:

```text
http://localhost:9999/integrationExamples/gpt/stackupRtdProvider_example.html
```

The page runs a real GAM/GPT auction. With `debug: true` in `pbjs.setConfig` the Prebid.js debug console shows the enriched `ortb2` fragments (`site.content.data` and `user.data`) merged into each bid request.
