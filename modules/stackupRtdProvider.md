# Stack Up RTD Provider

## Overview

Module Name: Stack Up Rtd Provider  
Module Type: Rtd Provider  
Maintainers: anton@stackup-ai.com, chen@stackup-ai.com, nicolas@stackup-ai.com

## Description

The Stack Up RTD module enriches Prebid.js bid requests with contextual and audience segments derived from the content of the current page. Before the auction fires, the module calls the Stack Up enrichment API (or reads from a `sessionStorage` cache on revisit) and merges the response into the global `ortb2` fragments:

- **`site.content.data`** — IAB Content Taxonomy 2.2 (`segtax: 6`) and 3.1 (`segtax: 9`) segments and untagged Stack Up proprietary segments.
- **`site.cattax` / `site.pagecat`** — the matching Content Taxonomy 2.2 page category when one is available.
- **`site.keywords`** — comma-separated article keywords. Added after any keywords the publisher already set, without repeating a token.
- **`site.ext.data`** — publisher-level data. Available only to publishers with a separate agreement with Stack Up. Only keys the publisher hasn't set are added.
- **`user.data`** — IAB Audience Taxonomy segments (`segtax: 4`) and untagged Stack Up proprietary audience segments inferred from contextual signals.

During migration the module also accepts the legacy Stack Up content and audience values (`segtax: 502` and `segtax: 501`) from cached or not-yet-rebuilt enrichment responses.

Every bidder that participates in the auction receives these segments in its `ortb2` object, unless Prebid's activity controls withhold them (see [Consent](#consent)). No cookies, fingerprints, or user identifiers are transmitted to the Stack Up API — only a URL path and publisher domain.

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
        waitForIt: true, // required for the auction to wait for enrichment
        params: {
          pubId: "YOUR-PUB-ID", // required — issued by Stack Up
          timeout: 300, // optional — ms to hold the auction (default: 300); keep below auctionDelay
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
| `waitForIt`               | recommended | Boolean | Required for the auction to wait for enrichment (with an `auctionDelay`). Without it, only auctions that start once the enrichment has loaded or is cached are enriched |                      `false`                      |
| `params`                  |  required   | Object  | Module configuration                                                                                                        |                         —                         |
| `params.pubId`            |  required   | String  | Publisher ID issued by Stack Up                                                                                             |                         —                         |
| `params.timeout`          |  optional   | Integer | Max ms to hold the auction for the enrichment. Applies only with `waitForIt` and an `auctionDelay`, and is capped at `auctionDelay`              |                       `300`                       |
| `params.articleIdMode`    |  optional   | String  | How the article ID is determined. `'path'` derives it from the page URL path; `'explicit'` uses `params.articleId` directly |                     `'path'`                      |
| `params.articleId`        | optional\*  | String  | Article identifier — required when `articleIdMode` is `'explicit'`. Max 512 characters                                      |                         —                         |
| `params.apiUrl`           |  optional   | String  | Override the Stack Up enrichment endpoint                                                                                   | `'https://api.stackup-ai.com/v1/enrich-ortb-rtd'` |
| `params.cache.enabled`    |  optional   | Boolean | Enable/disable cache usage entirely                                                                                         |                      `true`                       |
| `params.cache.ttlSeconds` |  optional   | Integer | How long a cached result is considered fresh (sessionStorage TTL)                                                           |                      `3600`                       |
| `params.cache.storage`    |  optional   | String  | Cache backend: `'session'` for browser sessionStorage or `'memory'` for in-process cache                                    |                    `'session'`                    |
| `params.debug`            |  optional   | Boolean | Send `debugDomain` to the API instead of the page's domain                                                                  |                      `false`                      |
| `params.debugDomain`      |  optional   | String  | Override the domain sent to the API when `debug: true`                                                                      |                    page domain                    |

## Timing

The module holds an auction only while Prebid waits for it: `waitForIt: true` and an `auctionDelay` above zero. It then releases the auction as soon as the enrichment is merged, or after `params.timeout` ms, or when Prebid's own `auctionDelay` timer lets the auction go, whichever comes first. An enrichment that arrives after that is not added to the auction. An auction that stops waiting doesn't cancel the request: when the response arrives it is cached and used by the auctions that follow. The request itself gives up after 3 seconds, and isn't retried while the page stays on that article.

Without `waitForIt`, the module never holds an auction: it enriches the auction if the enrichment is already loaded or cached, and otherwise lets it go as is. This also applies when another provider sets `waitForIt` and Prebid delays the auction for it: enrichment that arrives during that delay is not added.

## Consent

The module checks consent for every auction, and adds no enrichment to an auction whose consent doesn't allow it:

- **COPPA**: if `coppa: true` is set, the module adds no enrichment.
- **GDPR**: Stack Up is not yet registered on the IAB Global Vendor List, so users can't consent to it as a vendor. Until it is, the module adds no enrichment to any auction where GDPR applies (`gdprApplies: true`), whatever purposes the user has allowed.
- **USP / CCPA / GPP**: not enforced — the Stack Up API receives only a URL path and domain, no user identifiers, so US sale-of-data frameworks do not apply.

The enrichment request is sent when the module initializes, at `setConfig` time, so that it runs alongside the CMP lookup instead of after it, and the first auction doesn't wait for one and then the other. It is therefore usually sent before the CMP has answered, including for users GDPR turns out to apply to; for them the result is never added to an auction. It carries no cookies or user identifiers, only a URL path and domain. If GDPR is already known to apply when the module initializes, no request is sent.

The module reads and writes `sessionStorage` only while the consent management module says GDPR doesn't apply, and checks this at every access: not before the CMP answers, not when consent management has no answer at all (for example with an unsupported `cmpApi`), and no longer once the CMP says GDPR applies. Otherwise a fetched result is kept in memory only. On pages without a consent management module, the cache is used from initialization. If `consentManagement` is configured after `realTimeData`, its answer counts from then on. The in-memory cache (`cache.storage: 'memory'`) doesn't touch device storage and is used regardless.

When the CMP doesn't answer in time, Prebid sets `gdprApplies` from `consentManagement.gdpr.defaultGdprScope`, which defaults to `false`, so those users are enriched, as they are bid on. Publishers with EU traffic should set `defaultGdprScope: true`.

## Article ID Resolution

### `articleIdMode: 'path'` (default)

The module normalises the current page URL path using Prebid's built-in referer detection (works inside iframes and AMP frames). The normalisation strips:

- Trailing slashes
- AMP path variants (`/amp/`, `/_amp/`, `/amp` suffix)
- Double slashes

The resulting path is sent to the API and is also used as the `sessionStorage` cache key (via a fast hash) so cache hits are consistent across AMP and canonical URLs for the same article.

The path is resolved again for every auction, so single-page apps that change the URL without reloading Prebid get the enrichment for the article currently shown. On a change the module drops the previous article (its in-flight request is cancelled), serves the new one from cache when available, and otherwise fetches it. If you set `pageUrl` through `setConfig`, update it on each navigation.

### `articleIdMode: 'explicit'`

Pass a stable, opaque article identifier directly in `params.articleId`. Use this when you have a CMS-issued slug or numeric ID that is more stable than the URL. The identifier is fixed by configuration, so single-page apps should use `path` mode.

## Caching

When `params.cache.enabled` is `true` (default), the module checks cache before making a network call.
With `params.cache.storage: 'session'`, it writes to `sessionStorage` under the key:

```text
stackup:enrich:v1:path_<hash>
```

With `params.cache.storage: 'memory'`, entries are kept in runtime memory only (the 20 most recent articles) and are cleared on full page reload.
Cache entries expire after `params.cache.ttlSeconds` (default 1 hour). An entry that doesn't pass the same validation as an API response, or that was written by an earlier version of the module with a different snapshot format, is ignored and the article is fetched again. Setting `params.cache.enabled: false` disables both reads and writes.

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

Data blocks are matched by `name`, `ext.segtax` and `ext.stackup.dimension`, so the 2.2 and 3.1 blocks remain separate. Matching blocks are unioned by `segment[].id`; publisher-provided segment fields win on an ID collision. Existing publisher `site.cattax`, `site.pagecat`, and content extension values are preserved. The `site.cattax`/`site.pagecat` pair is copied only when the enrichment response carries both halves and the publisher has declared no `site.cat`, `site.sectioncat`, or `site.pagecat` of their own — one `site.cattax` governs all three arrays, so a partial copy would reinterpret category ids the module never set. The resolved URL path is used for the API lookup and cache key, but is not synthesized into `site.content.id`.

## Integration Example

```bash
gulp build --modules=rtdModule,stackupRtdProvider,appnexusBidAdapter
```

Start a static file server at the repo root on port 9999, then open:

```text
http://localhost:9999/integrationExamples/gpt/stackupRtdProvider_example.html
```

The page runs a real GAM/GPT auction. With `debug: true` in `pbjs.setConfig` the Prebid.js debug console shows the enriched `ortb2` fragments (`site.content.data` and `user.data`) merged into each bid request.
