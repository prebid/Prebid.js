# Microsoft Clarity RTD Provider

## Overview

The Microsoft Clarity RTD module collects behavioral signals from a self-contained DOM tracker and enriches bid requests with **bucketed categorical features**. Signals are compact string labels (e.g. `"deep"`, `"moderate"`, `"high"`) — not raw numerics — making them directly usable in DSP targeting rules without additional processing.

Signals are written into **global ORTB2 fragments**, making them available to **all bidders**. Data is published through three complementary paths:

1. **`site.ext.data.msclarity`** — structured key-value features for general consumption
2. **`user.data` segments** — ORTB2-native segments for DSPs and platforms like Microsoft Curate
3. **`site.keywords`** — keyword strings for adapters that consume keywords (e.g., AppNexus)

The module also persists signals to **localStorage** for warm-start support — the first auction of a new page load can use recent (≤ 30 min) signals instead of empty defaults.

The Clarity JS tag is **injected by default** for analytics / session-recording functionality. Set `params.injectClarity: false` to opt out of automatic injection. Bid-enrichment signals are computed independently from DOM events regardless of whether the Clarity tag is present.

## Prerequisites

1. A Microsoft Clarity account and project — sign up at https://clarity.microsoft.com
2. Your Clarity **Project ID** (found in Project Settings)

> **Note:** The module automatically injects the Clarity JS tag unless
> `params.injectClarity` is explicitly set to `false`. To manage the Clarity tag
> yourself, set `injectClarity: false` and add the tag to your page before Prebid loads.

## Integration

### Build

```bash
gulp build --modules=rtdModule,msClarityRtdProvider,appnexusBidAdapter,msftBidAdapter
```

### Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 200,
    dataProviders: [{
      name: 'msClarity',
      waitForIt: true,
      params: {
        projectId: 'abc123xyz',               // Required: Clarity project ID
        // injectClarity: false,               // Optional: set false to disable auto-injection (default: true)
        targetingPrefix: 'msc'                 // Optional: prefix for site.keywords
      }
    }]
  }
});
```

### Parameters

| Param | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `projectId` | string | yes | — | Microsoft Clarity project ID |
| `injectClarity` | boolean | no | `true` | When `true` (the default), automatically injects the Clarity JS tag if not already present. Set to `false` to disable auto-injection. |
| `targetingPrefix` | string | no | `'msc'` | Prefix for keyword key-values in `site.keywords`. |

## Feature Reference

The module computes **11 features** in two tiers:

### Durable Features (7) — persisted to localStorage for warm-start

These accumulate over the page session and are saved to `localStorage` for use in the first auction of subsequent page loads.

| Feature | Key | Values | Description |
|---------|-----|--------|-------------|
| Engagement | `engagement` | `low`, `medium`, `high`, `very_high` | Composite: scroll + dwell + interaction − frustration |
| Dwell Time | `dwell` | `bounce`, `brief`, `moderate`, `long`, `extended` | Visibility-aware active dwell time |
| Scroll Depth | `scroll` | `none`, `shallow`, `mid`, `deep`, `complete` | High-water-mark page scroll depth |
| Frustration | `frustration` | `none`, `mild`, `moderate`, `severe` | Deduplicated rage clicks + exploratory clicks (0.5× weight) + scroll reversals |
| Interaction | `interaction` | `passive`, `light`, `moderate`, `active`, `intense` | Deliberate events per second of active time (click, keydown, touch, debounced mousemove — no scroll) |
| Reading Mode | `readingMode` | `skim`, `scan`, `read` | Whether the user is reading steadily (scroll stable ≥ 2 s), scanning, or skimming |
| View Quality | `viewQuality` | `low`, `medium`, `high` | Composite of reading time, active time, and scroll depth |

### Transient Snapshot Features (4) — computed fresh at auction time

These reflect the user's instantaneous state when a bid request fires. They are **not** persisted.

| Feature | Key | Values | Description |
|---------|-----|--------|-------------|
| Activity Recency | `activityRecency` | `live`, `recent`, `stale` | Time since last deliberate interaction (< 2 s / < 10 s / ≥ 10 s) |
| Recent Engagement | `recentEngagement` | `cold`, `warming`, `hot` | Count of deliberate interactions in the last 10 seconds |
| Auction Attention | `auctionAttention` | `low`, `medium`, `high` | Whether the user is attentive right now (tab visible, activity recency, reading vs scanning) |
| Page Momentum | `pageMomentum` | `arrival`, `in_reading_flow`, `post_scroll`, `fatigued` | Phase of the page visit lifecycle |

## Where Data Is Written

### Global ORTB2 (All Bidders)

```
ortb2Fragments.global.site.ext.data.msclarity = {
  engagement: "high",
  dwell: "moderate",
  scroll: "deep",
  frustration: "none",
  interaction: "active",
  readingMode: "read",
  viewQuality: "high",
  activityRecency: "live",
  recentEngagement: "hot",
  auctionAttention: "high",
  pageMomentum: "in_reading_flow"
}

ortb2Fragments.global.site.keywords =
  "msc_engagement=high,msc_dwell=moderate,msc_scroll=deep,msc_interaction=active,msc_readingMode=read,msc_viewQuality=high,msc_activityRecency=live,msc_recentEngagement=hot,msc_auctionAttention=high,msc_pageMomentum=in_reading_flow"

ortb2Fragments.global.user.data = [
  {
    name: "msclarity",
    segment: [
      { id: "engagement_high" },
      { id: "dwell_moderate" },
      { id: "scroll_deep" },
      { id: "frustration_none" },
      { id: "interaction_active" },
      { id: "readingMode_read" },
      { id: "viewQuality_high" },
      { id: "activityRecency_live" },
      { id: "recentEngagement_hot" },
      { id: "auctionAttention_high" },
      { id: "pageMomentum_in_reading_flow" }
    ]
  }
]
```

> **Note:** The `msft` adapter uses the standard `ortbConverter`, so all global ORTB2
> data passes through directly to the OpenRTB2 request. The `appnexus` adapter
> transforms `site.keywords` into its UT payload format via `getANKeywordParam()`.
> The `user.data` segments are available to ORTB2-compatible DSPs and platforms
> like Microsoft Curate.

> `frustration` keyword is omitted when its value is `"none"`.

### Warm-Start (localStorage)

The module persists the **7 durable features** to `localStorage` (key: `msc_rtd_signals`) with a 30-minute TTL. On the first auction of a new page load, if all durable features are at baseline defaults, the module falls back to the cached snapshot. Transient snapshot features (activityRecency, recentEngagement, auctionAttention, pageMomentum) are always computed fresh and are never persisted.

The storage manager respects consent — if localStorage access is blocked by consent management, warm-start is silently skipped.

## Privacy

- The Clarity JS tag is injected by default. Set `params.injectClarity: false` to disable auto-injection and manage the tag yourself.
- All signals are page-level behavioral data (scroll, clicks, timing) — **no PII** is collected or transmitted.
- Signal values are bucketed categorical strings, not raw measurements, providing an additional privacy layer.
- localStorage persistence uses the consent-aware `storageManager` and respects TCF/GPP consent signals.
- If `projectId` is not configured, the module silently disables itself.

## Example

See [integrationExamples/gpt/msclarity_rtd_example.html](../../integrationExamples/gpt/msclarity_rtd_example.html) for a working integration test page.
