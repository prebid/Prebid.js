# Overview

```text
Module Name: Splash Bid Adapter
Module Type: Bidder Adapter
Maintainer: it@splashandroll.com
```

## Description

Bid adapter for Splash Standard Display, Parallax and Interstitial banner inventory; contact your Splash account manager or [it@splashandroll.com](mailto:it@splashandroll.com) for publisher and placement IDs. Requests are built with Prebid's `ortbConverter` (one POST per endpoint and publisher ID, one `imp` per bid) in PLN; floors are requested from the Price Floors module in PLN (use the Currency module when the ad server or floors currency is not PLN). First party data from `ortb2` and `ortb2Imp` is forwarded unchanged; without `ortb2.site.id` the placement ID is sent as `site.id`. HTTPS `burl` and `nurl` (`nurl` only with `adm`) are passed to Prebid as impression and win event trackers and fired by Prebid; billing respects `deferBilling` and `pbjs.triggerBilling`. The adapter registers no user syncs.

## Disclosure

Disclosure: Parallax and Interstitial support Splash's page-level Renderer and Safe Renderer. For each bid request and media type, core reports through `rendererSupport.banner` whether a bidder-provided `renderer` or `safeRenderer` is eligible under renderer policy and publisher configuration; this signal does not confirm that the creative rendered successfully. The adapter prefers the page-level Renderer when core permits it, preserving full Parallax and Interstitial behavior; otherwise it uses Safe Renderer when core permits that path. When both flags are true, the adapter supplies only the page-level Renderer because core prefers Safe Renderer if both are present. If neither is supported, it leaves rendering to core and publisher configuration. If the signal is absent (older core), the adapter supplies Safe Renderer as a compatibility fallback. Core retains final precedence: an applicable publisher Safe Renderer remains authoritative, while Splash Safe Renderer takes precedence over a publisher renderer that is not marked `backupOnly`.

* The top-window [Renderer](https://docs.prebid.org/dev-docs/renderer.html), bundled with the adapter, adds Splash-owned elements (iframe, SVG clip, styles) to the page. Interstitial shows a full-screen overlay with a **Pomiń** (Skip ad) button, closes with Escape or after at most five minutes, and locks page scrolling while open.
* The [Safe Renderer](https://docs.prebid.org/dev-docs/renderer.html), returned as `bid.safeRenderer`, is a script that Prebid loads from `https://cdn.splashandroll.com/runtime/prebid/safe-renderer/1.0.0/splash-safe-renderer.js` into the ad's frame. It changes only that frame's document. Parallax is reduced to a presentation fitted inside the frame, preserving the creative's aspect ratio without the scrolling effect. Interstitial keeps a trusted toolbar with an optional countdown and **Pomiń** above the sandboxed creative, which is scaled to fit the remaining space. The creative's close, Escape and the five-minute limit remove the ad from the frame; a container around the frame, such as an ad server interstitial, is closed by its owner.

Standard Display uses Prebid's default rendering. If core reports neither Splash renderer as available, the adapter leaves rendering to core and any publisher renderer configuration. The `rendererSupport` signal is local Prebid metadata and is not sent to Splash's OpenRTB endpoint. SafeFrame delivery is not supported.

## Bid Params

| Name | Scope | Description | Example | Type |
| ---- | ----- | ----------- | ------- | ---- |
| `publisherId` | required | Splash publisher ID. Non-empty. | `'YOUR_PUBLISHER_ID'` | `string` |
| `placementId` | required | Splash placement ID, sent as `imp.tagid`. Non-empty. | `'YOUR_PLACEMENT_ID'` | `string` |
| `displayFormat` | required for Parallax and Interstitial | The placement's Splash format: `'standard'` (default), `'parallax'` or `'interstitial'`. It is not inferred from sizes or the creative. Any other value makes the bid invalid. | `'parallax'` | `string` |
| `bidfloor` | optional | Floor in PLN, used only when no floor is set by the Price Floors module or `ortb2Imp`. Must be greater than 0. | `3` | `number` |
| `endpoint` | optional | Environment-specific Splash auction endpoint for test placements. If omitted, the adapter uses the production endpoint. Obtain test endpoint details from your Splash contact. | — | `string` |

## Formats

| Format | `displayFormat` | Ad unit setup | Rendering |
| ------ | --------------- | ------------- | --------- |
| Standard Display | `'standard'` | Banner sizes, e.g. `[[300, 600]]` | Prebid default rendering |
| Parallax | `'parallax'` | Banner sizes, e.g. `[[700, 1600]]`; for the page-level renderer, Prebid.js and the ad unit element must be in the top-level page | Core-approved page-level renderer: clipped frame in the ad unit. Safe Renderer: creative fits inside the ad frame; no page-level scroll effect |
| Interstitial | `'interstitial'` | Banner sizes, e.g. `[[320, 480]]`; set `ortb2Imp: { instl: 1 }` | Core-approved page-level renderer: full-screen overlay. Safe Renderer: creative fits inside the ad frame |

Response format fields (`ext.splash.format` and `ext.general.display_format`) are optional. Any declared value must be a supported format matching the request; unsupported or conflicting declarations discard the bid. With either renderer, Parallax and Interstitial creatives run in opaque-origin iframes with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`, without access to publisher DOM or storage. Popups are permitted for user-initiated click-throughs; creative-to-host communication uses source-checked `postMessage`. With either Splash renderer, the trusted **Pomiń** button is always available above the creative, independently of creative controls or errors. The creative fits below the toolbar. Escape works in the host and the Interstitial frame; nested cross-origin content must cooperate through a close message. Creatives handle their own tracking.

Both Splash renderers' toolbars show the Softpaywall logo, an optional countdown and **Pomiń** in one row. The logo loads from `https://cdn.splashandroll.com/fractatemp/0/softpaywall-logo.svg`. Splash's built-in creative toolbar is hidden; its timer continues running and reports bounded numeric state through source-checked messages. The host counter mirrors this state, including waiting for quiz completion when configured, and cannot disable or delay the host skip button. Creative timers, CTA and close messages remain active.

With the top-window renderer, Safari and iOS Chrome keep the Parallax frame physically clipped for input and visibility measurement. Compatible root-scrolling layouts use native sticky vertical positioning; nested scroll containers, transformed ancestors and browsers without `overflow: clip` support retain event-driven absolute alignment. Geometry updates are coalesced after viewport and observed layout changes, with no idle animation loop. Continuous CSS position or transform animations of the ad unit's ancestors are not tracked.

## Test Parameters

Use publisher and placement IDs supplied for your integration environment, with a separate ad unit for each format. Parallax inventory may be device-specific; confirm the campaign's targeting when testing. To validate renderer selection, use a Prebid.js build containing this adapter and the matching `rendererSupport` core contract in [#16138](https://github.com/prebid/Prebid.js/pull/16138). The hosted test page is maintained separately from this module documentation.

```javascript
const adUnits = [
  {
    code: 'splash-standard',
    mediaTypes: { banner: { sizes: [[300, 600]] } },
    bids: [{
      bidder: 'splash',
      params: {
        publisherId: 'YOUR_PUBLISHER_ID',
        placementId: 'YOUR_STANDARD_DISPLAY_PLACEMENT_ID',
        displayFormat: 'standard',
        bidfloor: 3
      }
    }]
  },
  {
    code: 'splash-parallax',
    mediaTypes: { banner: { sizes: [[700, 1600]] } },
    bids: [{
      bidder: 'splash',
      params: {
        publisherId: 'YOUR_PUBLISHER_ID',
        placementId: 'YOUR_PARALLAX_PLACEMENT_ID',
        displayFormat: 'parallax',
        bidfloor: 3
      }
    }]
  },
  {
    code: 'splash-interstitial',
    mediaTypes: { banner: { sizes: [[320, 480]] } },
    ortb2Imp: { instl: 1 },
    bids: [{
      bidder: 'splash',
      params: {
        publisherId: 'YOUR_PUBLISHER_ID',
        placementId: 'YOUR_INTERSTITIAL_PLACEMENT_ID',
        displayFormat: 'interstitial',
        bidfloor: 3
      }
    }]
  }
];
```
