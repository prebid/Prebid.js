---
layout: page_v2
title: Bidboost Analytics Adapter
description: Bidboost analytics adapter for auction telemetry.
page_type: module
module_type: analytics
module_code: bidboost
enable_download: true
sidebarType: 1
---

# Bidboost Analytics Adapter

## Overview

Use this module together with `bidboostRtdProvider` to measure controlled traffic-shaping impact.

## Build

```bash
gulp build --modules="bidboostAnalyticsAdapter"
```

## Configuration

```javascript
pbjs.enableAnalytics({
  provider: 'bidboost',
  options: {
    client: 'YOUR_CLIENT_CODE',
    site: 'YOUR_SITE_CODE',
    collectorUrl: 'https://collect.bidboost.net',
    analyticsBatchWindowMs: 1000,
    ignoredBidders: ['exampleBidder'],
    placementMapper: (adUnit) => adUnit.code,
    bidderMapper: (bidder) => bidder
  }
});
```

## Analytics Parameters

Set these fields in `pbjs.enableAnalytics({ provider: 'bidboost', options: ... })`:

| Field | Type | Description |
| --- | --- | --- |
| `client` | `string` | UUID of the client account running Bidboost. Provided during onboarding. |
| `site` | `string` | Site identifier configured in the Bidboost management UI. |
| `collectorUrl` | `string` | Base URL of the Bidboost collector service. Default: `https://collect.bidboost.net`. |
| `analyticsBatchWindowMs` | `number` | Batch window in milliseconds for auction/impression analytics dispatch. Default: `1000`. |
| `ignoredBidders` | `string[]` | Bidders to exclude from analytics reporting. |
| `placementMapper` | `(adUnit: object) => string` | Maps a Prebid ad unit to the placement identifier configured in Bidboost. Default maps to `adUnit.code`. |
| `bidderMapper` | `(bidderCode: string) => string` | Maps a Prebid bidder code to the bidder identifier configured in Bidboost. Default is identity mapping. |
