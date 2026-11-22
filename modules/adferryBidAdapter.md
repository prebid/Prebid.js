# Overview

```
Module Name: Adferry Bid Adapter
Module Type: Bidder Adapter
Maintainer: admin@adferry.co
```

# Description

Connects to Adferry for instream / outstream video, banner (display) and
audio demand over OpenRTB 2.6. Native is not supported.

# Bid Parameters

| Name          | Scope    | Description                                        | Example        | Type     |
|---------------|----------|----------------------------------------------------|----------------|----------|
| `placementId` | required | Tag ID, from Adferry portal → Integrations → Prebid | `'adferryprebidtest1'` | `string` |
| `bidFloor`    | optional | Floor CPM for this placement                       | `2.50`         | `number` |
| `currency`    | optional | Floor currency. Defaults to `USD`                  | `'USD'`        | `string` |

# Test Parameters

The `placementId` below is a live test tag that reliably returns a test VAST
creative from the endpoint, for validating the integration. Banner and audio
demand are also supported in production; this test tag is video.

```javascript
var adUnits = [
  {
    code: 'video-1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6, 7, 8]
      }
    },
    bids: [
      {
        bidder: 'adferry',
        params: {
          placementId: 'adferryprebidtest1'
        }
      }
    ]
  }
];
```

# Notes

**One HTTP request per ad unit.** The server limits concurrency per tag, so
batching several placements into one call would queue them behind each other.
Separate requests keep each placement in its own lane.

**US privacy signals are forwarded.** The US privacy (CCPA) string, GPP
(the full string plus every applicable section id, national and state-level
alike), and the COPPA flag are all passed through - both in the oRTB 2.6
core `regs` fields and wherever the consent modules put them on `ortb2`.
Without them the server treats the request as having no consent, which is
the correct default and also the one that fills worst. The adapter is
US-only: it carries no GVL ID and does no TCF handling.

**First-party data is forwarded.** The `ortb2` object travels to the exchange
as-is; `ortb2Imp` is merged into each impression.

**`schain` is forwarded** on the oRTB 2.6 core `source.schain`, whether it
arrives through `ortb2.source.ext.schain` or pinned per-bid (the `ext` copy
travels too).

**No user syncs.** There is no sync pixel or iframe; the demand path is
server-side and CTV-first.

**`creativeId` is a stable opaque id**, not a demand partner name. It groups
consistently across auctions so it can be used for reporting, and it does not
disclose which partner filled the impression.
