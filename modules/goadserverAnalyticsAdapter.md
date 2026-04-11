# Overview

```
Module Name:  goadserver Analytics Adapter
Module Type:  Analytics Adapter
Maintainer:   jan@goadserver.com
```

# Description

Ships Prebid.js bid events (auction lifetime, requests, responses, wins, timeouts) to a goadserver deployment's `/openrtb2/analytics` ingestion endpoint. Publishers running goadserver get bid-level telemetry in the same platform that handles auctions, cookie sync, and Prebid Cache — no third-party analytics provider required.

Pairs naturally with the `goadserver` bidder adapter but works alongside any other bidder: the adapter captures events from all bidders in the auction, not just goadserver's.

# Configuration

```js
pbjs.enableAnalytics({
  provider: 'goadserver',
  options: {
    host: 'ads.example.com',          // required — your goadserver domain
    token: 'your-sspcampaigns-hash',  // optional — publisher identity for attribution
    flushInterval: 5000               // optional, ms (default 5000)
  }
});
```

| Option          | Scope    | Description                                                                                                            | Type     |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `host`          | required | The goadserver deployment's public domain. Events POST to `https://{host}/openrtb2/analytics`.                          | `string` |
| `token`         | optional | SSP campaign hash from the publisher's goadserver panel. Included in every batch so events can be attributed per-pub.  | `string` |
| `flushInterval` | optional | Milliseconds between periodic batch flushes (default `5000`). `AUCTION_END` always triggers an immediate flush.         | `number` |

# Events Captured

- `AUCTION_INIT` — auction started
- `BID_REQUESTED` — bidder asked
- `BID_RESPONSE` — bidder responded
- `BID_WON` — bidder won and was rendered
- `BID_TIMEOUT` — bidder didn't respond in time
- `AUCTION_END` — auction complete (triggers a batch flush)

# Flush Triggers

- Periodic interval (default 5 seconds).
- `AUCTION_END` — flushes the batched events for the auction immediately.
- Page unload — best-effort via `navigator.sendBeacon` when available, so in-flight events aren't lost when the user navigates away.

# Ingestion Endpoint Payload

The adapter POSTs batches to `https://{host}/openrtb2/analytics` with this shape:

```json
{
  "token": "your-sspcampaigns-hash",
  "host": "publisher.com",
  "events": [
    {
      "eventType": "bidResponse",
      "auctionId": "...",
      "adUnitCode": "/div-1",
      "bidder": "goadserver",
      "cpm": 1.23,
      "currency": "USD",
      "mediaType": "banner",
      "size": "300x250",
      "creativeId": "cr-abc",
      "timeToRespond": 187,
      "timestamp": 1728912345000
    }
  ]
}
```

goadserver's ingestion handler accepts empty batches (returns `200`) and unknown event fields gracefully, so Prebid.js version drift doesn't break reporting.
