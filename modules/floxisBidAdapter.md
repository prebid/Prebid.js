# Overview

```
Module Name: Floxis Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@floxis.tech
```

# Description

The Floxis Bid Adapter enables integration with the Floxis programmatic advertising platform via Prebid.js. It supports banner, video, and native formats.

**Key Features:**
- Banner, Video and Native ad support
- OpenRTB 2.x compliant
- Privacy signal forwarding (GDPR/TCF, USP, GPP, COPPA) via Prebid.js core
- User identity (User ID / `eids`) and supply chain (`schain`) passthrough
- Prebid.js Floors Module support (plus a static `bidFloor` param fallback)
- User sync (iframe and pixel cookie matching)

## Supported Media Types
- Banner
- Video (instream; outstream requires a publisher-supplied `mediaTypes.video.renderer`)
- Native

## Floors Module Support
The Floxis Bid Adapter supports the Prebid.js [Floors Module](https://docs.prebid.org/dev-docs/modules/floors.html). Floor values are automatically included in the OpenRTB request as `imp.bidfloor` and `imp.bidfloorcur`. When the Floors module is not in the build, a static `params.bidFloor` (with optional `params.bidFloorCur`) is used as a fallback.

## User Identity & Supply Chain
`user.ext.eids` from the Prebid [User ID module](https://docs.prebid.org/dev-docs/modules/userId.html) and `source.ext.schain` (set via `pbjs.setConfig({ schain })` or `ortb2`) are forwarded automatically through first-party-data passthrough — no adapter-specific configuration is required.

## Privacy
GDPR/TCF, US Privacy, GPP and COPPA signals are handled by Prebid.js core and automatically included in the OpenRTB request; consent strings are also appended to user-sync calls. Floxis is registered with IAB Europe TCF as Vendor ID **1609**, declared via the adapter's `gvlid`.

## Example Usage

Banner:
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-banner',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{ bidder: 'floxis', params: { seat: 'testSeat' } }]
  }
]);
```

Video (instream):
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{ bidder: 'floxis', params: { seat: 'testSeat' } }]
  }
]);
```

Native:
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-native',
    mediaTypes: {
      native: {
        title: { required: true, len: 80 },
        image: { required: true, sizes: [300, 250] }
      }
    },
    bids: [{ bidder: 'floxis', params: { seat: 'testSeat' } }]
  }
]);
```

# Configuration

## Parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `seat` | required | Seat identifier | `'testSeat'` | `string` |
| `region` | optional | Region identifier for routing (defaults to `us-e`) | `'us-e'` | `string` |
| `partner` | optional | Partner identifier (defaults to `floxis`) | `'floxis'` | `string` |
| `bidFloor` | optional | Static bid floor (CPM) used only when the Floors module is absent | `0.5` | `number` |
| `bidFloorCur` | optional | Currency for `bidFloor` (defaults to `USD`) | `'USD'` | `string` |

Only `seat` is required. `region` and `partner` are optional and accepted as-is (validated as DNS host labels) — any value routes to the matching `[<partner>-]<region>.floxis.tech` endpoint.

## User Sync
The adapter registers cookie syncs to the Floxis trackers endpoint (`px-<region>.floxis.tech/sync`), which sets the Floxis DMP id and chains to the seat's demand-partner syncs. Both iframe and pixel syncs are supported; the type emitted follows your `userSync` configuration. Enable it for the adapter, e.g.:
```javascript
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: { bidders: ['floxis'], filter: 'include' }
    }
  }
});
```

## Error & Timeout Telemetry
The adapter reports client-observed auction timeouts and bidder transport errors to Floxis as cookieless operational telemetry. Each beacon is a `keepalive` fetch sent with credentials omitted (no cookies) and scheduled off the auction's critical path, so it carries only the seat, region, event type, and relevant operational dimensions (HTTP status, timeout flag, duration, auction ID, publisher domain) — no user or device identifier is included. Consent signals are forwarded as opaque pass-through parameters where available. Each beacon fires at most once per distinct seat+region pair per event, and telemetry failures are silently suppressed so they never affect the auction lifecycle.

## Testing
Unit tests are provided in `test/spec/modules/floxisBidAdapter_spec.js` and cover validation, request building (params, host-label safety, floors, FPD/consent passthrough), response interpretation and meta mapping, user syncs, billing notifications, and error/timeout telemetry callbacks.
