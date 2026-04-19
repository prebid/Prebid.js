---
layout: page_v2
title: Bidboost RTD Module
description: Bidboost real-time optimization provider.
page_type: module
module_type: rtd
module_code: bidboost
enable_download: true
sidebarType: 1
---

# Bidboost RTD Module

## Overview

Bidboost integrates directly into the Prebid.js auction flow to apply traffic shaping where it can improve auction efficiency and monetization outcomes.

As buyer-side agentic AI systems iterate campaign behavior and bidding logic faster, this module helps publishers adapt auction traffic routing continuously instead of relying on slower manual tuning cycles.

The integration is designed for controlled evaluation and measurable revenue uplift with minimal operational overhead.

## Build

```bash
gulp build --modules="rtdModule,bidboostRtdProvider"
```

## Configuration

```javascript
pbjs.setConfig({
  realTimeData: {
    auctionDelay: 500,
    dataProviders: [{
      name: 'bidboost',
      waitForIt: true,
      params: {
        client: 'YOUR_CLIENT_CODE',
        site: 'YOUR_SITE_CODE',
        predictorUrl: 'https://predict.bidboost.net',
        ignoredBidders: ['exampleBidder'],
        placementMapper: (adUnit) => adUnit.code,
        bidderMapper: (bidder) => bidder,
        reverseBidderMapper: (bidder) => bidder,
        additionalBidders: [{
          code: 'div-gpt-ad-top',
          bids: [
            { bidder: 'ix', params: { siteId: 12345 } },
            { bidder: 'rubicon', params: { accountId: 1, siteId: 2, zoneId: 3 } }
          ]
        }]
      }
    }]
  }
});
```

## RTD Parameters

Set these fields in `realTimeData.dataProviders[].params`:

| Field | Type | Description |
| --- | --- | --- |
| `client` | `string` | UUID of the client account running Bidboost. Provided during onboarding. |
| `site` | `string` | Site identifier configured in the Bidboost management UI. |
| `predictorUrl` | `string` | Base URL of the Bidboost predictor service. Default: `https://predict.bidboost.net`. |
| `ignoredBidders` | `string[]` | Bidders to exclude from traffic shaping. Useful to exclude special/s2s bidders from optimization decisions. |
| `placementMapper` | `(adUnit: object) => string` | Maps a Prebid ad unit to the placement identifier configured in Bidboost. Default maps to `adUnit.code`. |
| `bidderMapper` | `(bidderCode: string) => string` | Maps a Prebid bidder code to the bidder identifier configured in Bidboost. Default is identity mapping. |
| `reverseBidderMapper` | `(mappedBidderCode: string) => string` | Reverse mapping for `bidderMapper`. Must be provided if bidder mapping is customized. |
| `additionalBidders` | `Array<{ code: string, bids: object[] }>` | Optional additional bidder definitions in ad-unit shape. These are merged by ad unit code and bidder code. |

## Requirements

- Publishers must also include and enable the Bidboost analytics adapter for measurement (`pbjs.enableAnalytics({ provider: 'bidboost', ... })`).
- Access requires an active evaluation pilot.

## Getting Access

Start by requesting a free evaluation pilot at [https://www.bidboost.net](https://www.bidboost.net).

After onboarding, you receive a client code and can configure sites/entities in the Bidboost management UI.
