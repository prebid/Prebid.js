# Microsoft Clarity RTD Provider

## Overview

The Microsoft Clarity RTD module reads real-time behavioral signals from an active [Microsoft Clarity](https://clarity.microsoft.com) session on the page and enriches bid requests with engagement and attention data.

Signals are written into **per-bidder ORTB2 fragments** and are only distributed to commercially approved bidders. Currently, **AppNexus (Xandr)** is the only approved bidder.

## Prerequisites

1. A Microsoft Clarity account and project — sign up at https://clarity.microsoft.com
2. Your Clarity **Project ID** (found in Project Settings)

> **Note:** The module will automatically inject the Clarity JS tracking tag if it
> is not already on the page. If you prefer to manage the tag yourself, add it
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
        signals: [                             // Optional: defaults shown below
          'scroll_depth',
          'active_time',
          'frustration',
          'interaction_density',
          'scroll_velocity',
          'exit_probability',
          'engagement_score'
        ],
        engagementScoreThresholds: {           // Optional: bucketing thresholds
          low: 0.3,
          medium: 0.6,
          high: 0.8
        },
        targetingPrefix: 'msc'                 // Optional: GAM key-value prefix
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
| `signals` | string[] | no | all signals | Which signals to collect. See Signal Reference below. |
| `engagementScoreThresholds` | object | no | `{low:0.3, medium:0.6, high:0.8}` | Thresholds for bucketing `engagement_score` into targeting labels. |
| `targetingPrefix` | string | no | `'msc'` | Prefix for GAM ad server targeting key-values. |

## Signal Reference

### Tier 1 — High Value, Low Latency

| Signal | Key | Type | Description |
|--------|-----|------|-------------|
| Scroll Depth | `scroll_depth` | float 0–1 | Percentage of page viewed |
| Active Time | `active_time_ms` | integer | Milliseconds of active interaction |
| Rage Clicks | `rage_click_count` | integer | Rapid repeated clicks on same area |
| Dead Clicks | `dead_click_count` | integer | Clicks on non-interactive elements |
| Interaction Density | `interaction_density` | float | Events per time window |

### Tier 2 — Valuable, Derived

| Signal | Key | Type | Description |
|--------|-----|------|-------------|
| Scroll Velocity | `scroll_velocity` | string | `'slow'`, `'medium'`, or `'fast'` |
| Exit Probability | `exit_probability` | float 0–1 | Likelihood user will leave |

### Tier 3 — Composite

| Signal | Key | Type | Description |
|--------|-----|------|-------------|
| Engagement Score | `engagement_score` | float 0–1 | Composite engagement metric |

## Where Data Is Written

### Per-Bidder ORTB2 (Gated)

Only approved bidders receive Clarity signals. Data is written to:

```
ortb2Fragments.bidder.<bidder>.site.ext.data.msclarity = {
  scroll_depth: 0.72,
  active_time_ms: 14200,
  rage_click_count: 0,
  dead_click_count: 1,
  interaction_density: 3.8,
  scroll_velocity: "slow",
  exit_probability: 0.15,
  engagement_score: 0.84
}

ortb2Fragments.bidder.<bidder>.user.ext.data.msclarity = {
  engagement_score: 0.84,
  engagement_bucket: "very_high"
}

ortb2Fragments.bidder.<bidder>.site.keywords = "msc_scroll=deep,msc_engaged=true,msc_engagement=very_high,msc_velocity=slow"
```

### Impression-Level (Ad Units with Approved Bidders)

```
adUnit.ortb2Imp.ext.data.msclarity = {
  scroll_depth: 0.72,
  engagement_score: 0.84
}
```

### GAM Targeting (Ungated)

Ad server targeting key-values are set for all ad units (publisher's own ad server):

```
msc_scroll=deep
msc_engaged=true
msc_engagement=very_high
msc_frustrated=true   // only if rage clicks > 0
msc_velocity=slow
```

## Approved Bidders

Access to Clarity signals in bid requests is commercially gated. Currently approved:

- **appnexus** (Xandr / Microsoft Advertising)

Other bidders interested in receiving Clarity behavioral signals should contact Microsoft Clarity for commercial terms.

## Privacy

- If the Clarity JS tag is not already on the page, the module automatically injects it using the configured `projectId`. The tag is loaded from `https://www.clarity.ms/tag/<projectId>`.
- All signals are page-level behavioral data (scroll, clicks, timing) — **no PII** is collected or transmitted.
- The module respects TCF/GPP consent signals passed via `userConsent`.
- If `projectId` is not configured, the module silently disables itself.

## Example

See [integrationExamples/gpt/msclarity_rtd_example.html](../../integrationExamples/gpt/msclarity_rtd_example.html) for a working integration test page.
