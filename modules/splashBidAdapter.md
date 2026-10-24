# Overview

```text
Module Name: Splash Bid Adapter
Module Type: Bidder Adapter
Maintainer: it@splashandroll.com
```

## Description

Bid adapter for Splash Standard Display, Parallax and Interstitial banner inventory; contact your Splash account manager or [it@splashandroll.com](mailto:it@splashandroll.com) for publisher and placement IDs. Requests are built with Prebid's `ortbConverter` (one POST per endpoint and publisher ID, one `imp` per bid) in PLN; floors are requested from the Price Floors module in PLN (use the Currency module when the ad server or floors currency is not PLN). First party data from `ortb2` and `ortb2Imp` is forwarded unchanged; without `ortb2.site.id` the placement ID is sent as `site.id`. HTTPS `burl` and `nurl` (`nurl` only with `adm`) are passed to Prebid as impression and win event trackers and fired by Prebid; billing respects `deferBilling` and `pbjs.triggerBilling`. The adapter registers no user syncs.

## Disclosure

Disclosure: Parallax and Interstitial use top-window [Renderer](https://docs.prebid.org/dev-docs/renderer.html) code bundled with the adapter; no external code is loaded. They add Splash-owned elements (iframe, SVG clip, styles) to the page. Interstitial shows a full-screen overlay with a **Close ad** button, closes with Escape or after at most five minutes, and locks page scrolling while open. The adapter does not bid for these formats with `allowTopWindowRenderers: false`, a Safe Renderer on the banner media type or the Splash bid, or a publisher renderer without `backupOnly: true`; do not set an ad unit level Safe Renderer on Parallax or Interstitial ad units either, because it replaces these renderers. SafeFrame delivery is not supported.

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

If the response declares a different format, the bid is ignored. The host **Close ad** button is hidden only if the loaded creative exposes its own enabled close control; a creative error shows it again. Creatives handle their own tracking.

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
