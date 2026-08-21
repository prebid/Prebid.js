# Overview

```
Module Name: Adferry Bid Adapter
Module Type: Bidder Adapter
Maintainer: support@adferry.co
```

# Description

Connects to Adferry for instream and outstream video demand over OpenRTB 2.6.

Video only. Banner and native are not supported.

# Bid Parameters

| Name          | Scope    | Description                                        | Example        | Type     |
|---------------|----------|----------------------------------------------------|----------------|----------|
| `placementId` | required | Tag ID, from Adferry portal → Integrations → Prebid | `'a1b2c3d4'`   | `string` |
| `bidFloor`    | optional | Floor CPM for this placement                       | `2.50`         | `number` |
| `currency`    | optional | Floor currency. Defaults to `USD`                  | `'USD'`        | `string` |

# Test Parameters

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
          placementId: 'a1b2c3d4'
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

**Consent is forwarded.** GDPR applicability, the TCF consent string, and the
US privacy string are all passed through. Without them the server treats the
request as having no consent, which is the correct default and also the one
that fills worst.

**`schain` is forwarded** on `source.ext.schain` when present.

**`creativeId` is a stable opaque id**, not a demand partner name. It groups
consistently across auctions so it can be used for reporting, and it does not
disclose which partner filled the impression.
