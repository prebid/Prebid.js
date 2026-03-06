# Microsoft Clarity RTD Provider

## Overview

The Microsoft Clarity RTD module collects behavioral signals from a self-contained DOM tracker and enriches bid requests with **bucketed categorical features**. Signals are compact string labels (e.g. `"deep"`, `"moderate"`, `"engaged"`) — not raw numerics — making them directly usable in DSP targeting rules without additional processing.

Signals are written into **per-bidder ORTB2 fragments** and are only distributed to commercially approved bidders. Currently, **AppNexus (Xandr)** is the only approved bidder. No signals are sent to the publisher's ad server (GAM) — this is a deliberate commercial gate.

The Clarity JS tag is auto-injected for its own analytics / session-recording functionality, but bid-enrichment signals are computed independently from DOM events.

## Prerequisites

1. A Microsoft Clarity account and project — sign up at https://clarity.microsoft.com
2. Your Clarity **Project ID** (found in Project Settings)

> **Note:** The module automatically injects the Clarity JS tracking tag if it is
> not already on the page. If you prefer to manage the tag yourself, add it
> before Prebid loads and the module will use the existing instance.

## Integration

### Build

```bash
gulp build --modules=rtdModule,msClarityRtdProvider,appnexusBidAdapter
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
        bidders: ['appnexus'],                 // Optional: defaults to all approved bidders
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
| `bidders` | string[] | no | `['appnexus']` | Bidders to receive signals. Must be a subset of approved bidders. Unapproved bidders are silently ignored with a console warning. |
| `targetingPrefix` | string | no | `'msc'` | Prefix for keyword key-values in `site.keywords`. |

## Feature Reference

All 7 features are always computed (they are lightweight bucket lookups). Values are categorical strings.

| Feature | Key | Values | Description |
|---------|-----|--------|-------------|
| Scroll Depth | `scroll` | `none`, `shallow`, `mid`, `deep`, `complete` | High-water-mark page scroll depth |
| Dwell Time | `dwell` | `bounce`, `brief`, `moderate`, `long`, `extended` | Visibility-aware active dwell time |
| Engagement | `engagement` | `low`, `medium`, `high`, `very_high` | Composite: scroll + dwell + interaction − frustration |
| Frustration | `frustration` | `none`, `mild`, `moderate`, `severe` | Deduplicated rage clicks + dead clicks |
| Interaction | `interaction` | `passive`, `light`, `moderate`, `active`, `intense` | Events per second of active time (no mousemove) |
| Scroll Pattern | `scroll_pattern` | `none`, `scanning`, `reading`, `searching` | Direction changes vs. distance ratio |
| Journey Stage | `stage` | `landing`, `exploring`, `engaged`, `converting` | Time + scroll + interaction thresholds |

## Where Data Is Written

### Per-Bidder ORTB2 (Gated — AppNexus only)

```
ortb2Fragments.bidder.appnexus.site.ext.data.msclarity = {
  scroll: "deep",
  dwell: "moderate",
  engagement: "high",
  frustration: "none",
  interaction: "active",
  scroll_pattern: "reading",
  stage: "engaged"
}

ortb2Fragments.bidder.appnexus.user.ext.data.msclarity = {
  engagement: "high"
}

ortb2Fragments.bidder.appnexus.site.keywords =
  "msc_scroll=deep,msc_dwell=moderate,msc_engagement=high,msc_interaction=active,msc_stage=engaged"
```

> `frustration` and `scroll_pattern` keywords are omitted when their value is `"none"`.

### Impression-Level (Ad Units with Approved Bidders)

```
adUnit.ortb2Imp.ext.data.msclarity = {
  scroll: "deep",
  engagement: "high"
}
```

## Approved Bidders

Access to Clarity signals in bid requests is commercially gated. Currently approved:

- **appnexus** (Xandr / Microsoft Advertising)

Other bidders interested in receiving Clarity behavioral signals should contact Microsoft Clarity for commercial terms.

## Privacy

- If the Clarity JS tag is not already on the page, the module automatically injects it using the configured `projectId`. The tag is loaded from `https://www.clarity.ms/tag/<projectId>`.
- All signals are page-level behavioral data (scroll, clicks, timing) — **no PII** is collected or transmitted.
- Signal values are bucketed categorical strings, not raw measurements, providing an additional privacy layer.
- The module respects TCF/GPP consent signals passed via `userConsent`.
- If `projectId` is not configured, the module silently disables itself.

## Example

See [integrationExamples/gpt/msclarity_rtd_example.html](../../integrationExamples/gpt/msclarity_rtd_example.html) for a working integration test page.
