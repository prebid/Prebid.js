# Overview

```
Module Name: Adapex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@floxis.tech
```

# Description

The Adapex Bid Adapter connects Prebid.js to the Adapex programmatic exchange over OpenRTB 2.x. It supports banner, video and native formats.

**Key Features:**
- Banner, Video and Native ad support
- OpenRTB 2.x compliant
- Privacy signal forwarding (GDPR/TCF, USP, GPP, COPPA) via Prebid.js core
- User identity (User ID / `eids`) and supply chain (`schain`) passthrough
- First-party fallback id for cookieless browsers
- Placement identity: `imp.tagid` is set from the ad unit code unless the publisher supplies `ortb2Imp.tagid`
- Prebid.js Floors Module support (plus a static `bidFloor` param fallback)
- User sync (iframe and pixel cookie matching)

## Supported Media Types
- Banner
- Video (instream; outstream requires a publisher-supplied `mediaTypes.video.renderer`)
- Native

## Example Usage

Banner:
```javascript
pbjs.addAdUnits([
  {
    code: 'adunit-banner',
    mediaTypes: { banner: { sizes: [[300, 250]] } },
    bids: [{ bidder: 'adapex', params: { seat: 'testSeat' } }]
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
    bids: [{ bidder: 'adapex', params: { seat: 'testSeat' } }]
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
    bids: [{ bidder: 'adapex', params: { seat: 'testSeat' } }]
  }
]);
```

# Configuration

## Parameters

| Name | Scope | Description | Example | Type |
| --- | --- | --- | --- | --- |
| `seat` | required | Seat identifier issued by Adapex | `'testSeat'` | `string` |
| `bidFloor` | optional | Static bid floor (CPM) used only when the Floors module is absent | `0.5` | `number` |
| `bidFloorCur` | optional | Currency for `bidFloor` (defaults to `USD`) | `'USD'` | `string` |

Requests are sent to `https://hb.adapex.io/pbjs?seat=<seat>`; one request is made per distinct seat.

## Floors Module Support
Floor values from the Prebid.js [Floors Module](https://docs.prebid.org/dev-docs/modules/floors.html) are sent as `imp.bidfloor` and `imp.bidfloorcur`. Without the Floors module in the build, the static `params.bidFloor` (with optional `params.bidFloorCur`) is used instead.

## First-Party Fallback Id
In browsers that block third-party cookies (Safari, Firefox), the adapter keeps a random v4 UUID in the publisher's own origin (`localStorage` key and cookie `adpx_uid`, ~30-day cookie) and sends it at `user.ext.fpid`. It is per-publisher, never shared across sites, and only a fallback: the exchange's own cookie takes precedence when present. Storage access goes through Prebid.js core's `storageManager` (`deviceAccess`, GDPR purpose 1 under vendor id 1609), and bidder-level storage must be granted explicitly; without it no id is generated:
```javascript
pbjs.bidderSettings = {
  adapex: {
    storageAllowed: true
  }
};
```

## Privacy
GDPR/TCF, US Privacy, GPP and COPPA signals are handled by Prebid.js core and included in the OpenRTB request; consent strings are also appended to user-sync calls. The adapter declares IAB Europe TCF Vendor ID **1609** via its `gvlid`.

## User Sync
The adapter registers cookie syncs to `https://sync.adapex.io/sync`. Iframe and pixel syncs are both supported; the type emitted follows your `userSync` configuration. An iframe sync matches more demand partners per call, so enable it for the adapter:
```javascript
pbjs.setConfig({
  userSync: {
    filterSettings: {
      iframe: { bidders: ['adapex'], filter: 'include' }
    }
  }
});
```
If you already use `filterSettings.all`, iframe syncs are enabled and the block above must not be added (Prebid.js core treats `all` and `iframe` as mutually exclusive).

## Error & Timeout Telemetry
Client-observed auction timeouts and bidder transport errors are reported to `https://sync.adapex.io/event` as cookieless `keepalive` beacons scheduled off the auction's critical path. They carry the seat, event type and operational dimensions (HTTP status, timeout flag, duration, auction id, publisher domain) and no user or device identifier; consent signals are passed through where available. Each beacon fires at most once per seat per event.

## Testing
Unit tests are in `test/spec/modules/adapexBidAdapter_spec.js`.
