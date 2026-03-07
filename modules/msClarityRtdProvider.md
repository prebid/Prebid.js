# Microsoft Clarity RTD Provider

## Overview

The Microsoft Clarity RTD module collects behavioral signals from a self-contained DOM tracker and enriches bid requests with **bucketed categorical features**. Signals are compact string labels (e.g. `"deep"`, `"moderate"`, `"high"`) — not raw numerics — making them directly usable in DSP targeting rules without additional processing.

Signals are written into **global ORTB2 fragments**, making them available to **all bidders**. Data is published through three complementary paths:

1. **`site.ext.data.msclarity`** — structured key-value features for general consumption
2. **`user.data` segments** — ORTB2-native segments for DSPs and platforms like Microsoft Curate
3. **`site.keywords`** — keyword strings for adapters that consume keywords (e.g., AppNexus)

The module also persists signals to **localStorage** for warm-start support — the first auction of a new page load can use recent (≤ 30 min) signals instead of empty defaults.

The Clarity JS tag can optionally be injected for its own analytics / session-recording functionality (set `params.injectClarity: true`), but bid-enrichment signals are computed independently from DOM events.

## Prerequisites

1. A Microsoft Clarity account and project — sign up at https://clarity.microsoft.com
2. Your Clarity **Project ID** (found in Project Settings)

> **Note:** Unlike previous versions, the module does **not** auto-inject the Clarity JS
> tag. Set `params.injectClarity: true` to opt in to automatic injection, or add the
> Clarity tag to your page manually before Prebid loads.

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
        injectClarity: false,                  // Optional: inject Clarity tag (default: false)
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
| `injectClarity` | boolean | no | `false` | When `true`, automatically injects the Clarity JS tag if not already present. |
| `targetingPrefix` | string | no | `'msc'` | Prefix for keyword key-values in `site.keywords`. |

## Feature Reference

All 5 features are always computed (they are lightweight bucket lookups). Values are categorical strings.

| Feature | Key | Values | Description |
|---------|-----|--------|-------------|
| Engagement | `engagement` | `low`, `medium`, `high`, `very_high` | Composite: scroll + dwell + interaction − frustration |
| Dwell Time | `dwell` | `bounce`, `brief`, `moderate`, `long`, `extended` | Visibility-aware active dwell time |
| Scroll Depth | `scroll` | `none`, `shallow`, `mid`, `deep`, `complete` | High-water-mark page scroll depth |
| Frustration | `frustration` | `none`, `mild`, `moderate`, `severe` | Deduplicated rage clicks + unresponsive clicks |
| Interaction | `interaction` | `passive`, `light`, `moderate`, `active`, `intense` | Deliberate events per second of active time (click, keydown, touch — no scroll) |

## Where Data Is Written

### Global ORTB2 (All Bidders)

```
ortb2Fragments.global.site.ext.data.msclarity = {
  engagement: "high",
  dwell: "moderate",
  scroll: "deep",
  frustration: "none",
  interaction: "active"
}

ortb2Fragments.global.site.keywords =
  "msc_engagement=high,msc_dwell=moderate,msc_scroll=deep,msc_interaction=active"

ortb2Fragments.global.user.data = [
  {
    name: "msclarity",
    segment: [
      { id: "engagement_high" },
      { id: "dwell_moderate" },
      { id: "scroll_deep" },
      { id: "frustration_none" },
      { id: "interaction_active" }
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

The module persists the latest feature snapshot to `localStorage` (key: `msc_rtd_signals`) with a 30-minute TTL. On the first auction of a new page load, if the tracker has not yet collected meaningful signals (all features at baseline defaults), the module falls back to the cached snapshot. This ensures the first auction does not send empty/default values.

The storage manager respects consent — if localStorage access is blocked by consent management, warm-start is silently skipped.

## Privacy

- The Clarity JS tag is **only** injected when `params.injectClarity` is explicitly set to `true`. If not set, publishers manage the Clarity tag themselves.
- All signals are page-level behavioral data (scroll, clicks, timing) — **no PII** is collected or transmitted.
- Signal values are bucketed categorical strings, not raw measurements, providing an additional privacy layer.
- localStorage persistence uses the consent-aware `storageManager` and respects TCF/GPP consent signals.
- If `projectId` is not configured, the module silently disables itself.

## Example

See [integrationExamples/gpt/msclarity_rtd_example.html](../../integrationExamples/gpt/msclarity_rtd_example.html) for a working integration test page.
