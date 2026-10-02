# Overview
Module Name: 8pod Bidder Adapter 

Module Type: Bidder Adapter

Maintainer: devs@8pod.com

# Description

Connect to 8pod for bids.

This adapter requires setup and approval from the 8pod team.

Please add eightpodAnalyticsAdapter to collect user behavior and improve user experience as well.

# Bid Params

OpenRTB first-party data should be supplied through `ortb2` / `ortb2Imp`. The adapter preserves Prebid User ID module identifiers in `user.ext.eids`.

| Name | Scope | Description | Example | Type |
|------|-------|-------------|---------|------|
| `placementId` | optional | The unique identifier of the ad placement. When provided, sent as OpenRTB `imp.tagid`; also sent as legacy `ext.adSlotPlacementId` for compatibility. | "placementId-438753744289" | `string` |
| `publisherId` | optional, legacy override | Overrides OpenRTB `site.publisher.id` when provided. Prefer `ortb2.site.publisher.id` for publisher-facing integrations. | "publisherId-438753744289" | `string` |
| `dealId` | optional | PMP deal ID sent as `imp.pmp.deals[].id` when provided. | "deal-123" | `string` |
| `trace` | optional | Enables trace mode by adding `?trace=true` to the bidder endpoint for debugging. | true | `boolean` or `string` |
| `userId` | optional, legacy override | Overrides OpenRTB `user.id` when provided. Prefer User ID modules or `ortb2.user.ext.eids`. | "user-123" | `string` |
| `eightPodVisitorId` | optional | Publisher-provided EightPod/Tealium visitor reference sent as OpenRTB `user.ext.eids` and legacy `user.ext.eightPodVisitorId`. Overrides the `utag_main_v_id` cookie value when provided. | "visitor-123" | `string` |
| `country` | optional, legacy override | Overrides OpenRTB `device.geo.country` and `user.geo.country` when provided. Prefer `ortb2.device.geo.country` / `ortb2.user.geo.country`. | "AUS" | `string` |
| `language` | optional, legacy override | Overrides OpenRTB `device.language` when provided. Prefer `ortb2.device.language`. | "en" | `string` |
| `publishercat` | optional, legacy override | Comma-separated override for OpenRTB `site.publisher.cat`. Prefer `ortb2.site.publisher.cat`. | "IAB1,IAB2" | `string` |
| `sitecat` | optional, legacy override | Comma-separated override for OpenRTB `site.cat`. Prefer `ortb2.site.cat`. | "IAB3" | `string` |
| `pagecat` | optional, legacy override | Comma-separated override for OpenRTB `site.pagecat`. Prefer `ortb2.site.pagecat`. | "IAB4" | `string` |
| `sectioncat` | optional, legacy override | Comma-separated override for OpenRTB `site.sectioncat`. Prefer `ortb2.site.sectioncat`. | "IAB5" | `string` |
| `yob` | optional, legacy override | Overrides OpenRTB `user.yob` when provided. Prefer `ortb2.user.yob`. | 1990 | `number` or `string` |
| `gender` | optional, legacy override | Overrides OpenRTB `user.gender` when provided. Prefer `ortb2.user.gender`. | "M" | `string` |
| `city` | optional, legacy override | Overrides OpenRTB `user.geo.city` when provided. Prefer `ortb2.user.geo.city`. | "Sydney" | `string` |
| `region` | optional, legacy override | Overrides OpenRTB `user.geo.region` when provided. Prefer `ortb2.user.geo.region`. | "NSW" | `string` |

# Test Parameters

```javascript
var adUnits = [{
        code: 'something',
        mediaTypes: {
            banner: {
                sizes: [[350, 550]],
            },
        },
        bids: [
            {
                bidder: 'eightpod',
                params: {
                    placementId: '13144370',
                    publisherId: 'publisherID-488864646',
                },
            },
        ],
    }];
```
