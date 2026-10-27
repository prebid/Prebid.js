# Overview

```text
Module Name: Splash Bid Adapter
Module Type: Bidder Adapter
Maintainer: it@splashandroll.com
```

## Description

Bid adapter for Splash Standard Display, Parallax and Interstitial banner inventory; contact your Splash account manager or [it@splashandroll.com](mailto:it@splashandroll.com) for publisher and placement IDs. Requests are built with Prebid's `ortbConverter` (one POST per endpoint and publisher ID, one `imp` per bid) in PLN; floors are requested from the Price Floors module in PLN (use the Currency module when the ad server or floors currency is not PLN). First party data from `ortb2` and `ortb2Imp` is forwarded unchanged; without `ortb2.site.id` the placement ID is sent as `site.id`. HTTPS `burl` and `nurl` (`nurl` only with `adm`) are passed to Prebid as impression and win event trackers and fired by Prebid; billing respects `deferBilling` and `pbjs.triggerBilling`. The adapter registers no user syncs.

## Disclosure

Disclosure: Parallax and Interstitial use top-window [Renderer](https://docs.prebid.org/dev-docs/renderer.html) code bundled with the adapter; no external code is loaded. They add Splash-owned elements (iframe, SVG clip, styles) to the page. Interstitial shows a full-screen overlay with a **Pomiń** (Skip ad) button, closes with Escape or after at most five minutes, and locks page scrolling while open. The adapter does not bid for these formats when core disables top-window renderers, a publisher Safe Renderer would take precedence, or a publisher renderer without `backupOnly: true` would replace the adapter renderer. Standard Display remains eligible. SafeFrame delivery is not supported.

Core supplies the effective `bidRequest.allowTopWindowRenderers` policy before validation and inherits ad-unit `safeRenderer` settings into each bid request unless the bid overrides them. The adapter uses these request fields and the banner media-type configuration, not global configuration or publisher DOM lookups. These are local core metadata, not Splash bid parameters or OpenRTB fields; use the adapter and its corresponding core build together.

## Bid Params

| Name | Scope | Description | Example | Type |
| ---- | ----- | ----------- | ------- | ---- |
| `publisherId` | required | Splash publisher ID. Non-empty. | `'725'` | `string` |
| `placementId` | required | Splash placement ID, sent as `imp.tagid`. Non-empty. | `'100021'` | `string` |
| `displayFormat` | required for Parallax and Interstitial | The placement's Splash format: `'standard'` (default), `'parallax'` or `'interstitial'`. It is not inferred from sizes or the creative. Any other value makes the bid invalid. | `'parallax'` | `string` |
| `bidfloor` | optional | Floor in PLN, used only when no floor is set by the Price Floors module or `ortb2Imp`. Must be greater than 0. | `3` | `number` |
| `endpoint` | optional | Splash staging endpoint for test placements: `https://ssp.emisja.stg.froc.mc2.rocks/auction/splash`; any other value uses the production endpoint (`https://ssp.splashandroll.com/auction/splash`). | `'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash'` | `string` |

## Formats

| Format | `displayFormat` | Ad unit setup | Rendering |
| ------ | --------------- | ------------- | --------- |
| Standard Display | `'standard'` | Banner sizes, e.g. `[[300, 600]]` | Prebid default rendering |
| Parallax | `'parallax'` | Banner sizes, e.g. `[[700, 1600]]`; Prebid.js and the ad unit element must be in the top-level page | Adapter renderer: a clipped frame, up to the viewport height, in the ad unit element |
| Interstitial | `'interstitial'` | Banner sizes, e.g. `[[320, 480]]`; set `ortb2Imp: { instl: 1 }` | Adapter renderer: a full-screen overlay |

Response format fields (`ext.splash.format` and `ext.general.display_format`) are optional. Any declared value must be a supported format matching the request; unsupported or conflicting declarations discard the bid. Parallax and Interstitial creatives run in opaque-origin iframes with `sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"`, without access to publisher DOM or storage. Popups are permitted for user-initiated click-throughs; creative-to-host communication uses source-checked `postMessage`. The host **Pomiń** button is always available above the creative, independently of creative controls or errors. The creative fills the remaining viewport without overlapping the toolbar. Escape works in the host and the Interstitial frame; nested cross-origin content must cooperate through a close message. Creatives handle their own tracking.

The host toolbar shows the Softpaywall logo, an optional countdown and **Pomiń** in one row. The logo loads from `https://cdn.splashandroll.com/fractatemp/0/softpaywall-logo.svg`. Splash's built-in creative toolbar is hidden; its timer continues running and reports bounded numeric state through source-checked messages. The host counter mirrors this state, including waiting for quiz completion when configured, and cannot disable or delay the host skip button. Creative timers, CTA and close messages remain active.

Safari and iOS Chrome keep the frame physically clipped for input and visibility measurement. Compatible root-scrolling layouts use native sticky vertical positioning; nested scroll containers, transformed ancestors and browsers without `overflow: clip` support retain event-driven absolute alignment. Geometry updates are coalesced after viewport and observed layout changes, with no idle animation loop. Continuous CSS position or transform animations of the ad unit's ancestors are not tracked.

## Test Parameters

Splash staging inventory is publisher `725` with placements `100021` (Standard 300x600), `100022` (Parallax 700x1600) and `100023` (Interstitial 320x480); the Parallax test campaign is mobile-only, so use a mobile device or device emulation with a mobile user agent. Review all three formats at <https://one.tcpip.pl/public/prebid-official.html> (`?format=standard|parallax|interstitial`).

```javascript
const adUnits = [
  {
    code: 'splash-standard',
    mediaTypes: { banner: { sizes: [[300, 600]] } },
    bids: [{
      bidder: 'splash',
      params: {
        publisherId: '725',
        placementId: '100021',
        displayFormat: 'standard',
        bidfloor: 3,
        endpoint: 'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash'
      }
    }]
  },
  {
    code: 'splash-parallax',
    mediaTypes: { banner: { sizes: [[700, 1600]] } },
    bids: [{
      bidder: 'splash',
      params: {
        publisherId: '725',
        placementId: '100022',
        displayFormat: 'parallax',
        bidfloor: 3,
        endpoint: 'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash'
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
        publisherId: '725',
        placementId: '100023',
        displayFormat: 'interstitial',
        bidfloor: 3,
        endpoint: 'https://ssp.emisja.stg.froc.mc2.rocks/auction/splash'
      }
    }]
  }
];
```
