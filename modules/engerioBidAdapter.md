# Overview

```
Module Name: Engerio Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@thinkeasy.cz
```

# Description

Engerio is a publisher-focused ad server. Publishers register ad slots in the
Engerio admin and receive an `adUnitCode` string to use as the bid parameter.
The adapter communicates via OpenRTB 2.5.

Supported media types: **banner**

# Bid Parameters

| Name | Scope | Type | Description |
|---|---|---|---|
| `adUnitCode` | required | String | The ad slot identifier configured in the Engerio admin for this placement. |

# Test Parameters

> **Note:** `adUnitCode` values are publisher-specific and must be registered in
> the Engerio admin before use. A generic code will not return bids. Contact
> [info@thinkeasy.cz](mailto:info@thinkeasy.cz) to obtain a test `adUnitCode`.

```javascript
var adUnits = [
  {
    code: 'div-banner-300x250',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
        bidder: 'engerio',
        params: {
          adUnitCode: 'test-slot-300x250'  // replace with a valid adUnitCode from your Engerio account
        }
      }
    ]
  }
];
```


## Supported Media Types

- `banner`

## Win Notification

Engerio uses the OpenRTB `nurl` field for win notifications. When Prebid.js
renders the winning ad it calls `onBidWon`, which routes a `GET` request to the
`nurl` URL through Prebid's core ajax helper. This triggers impression recording and budget deduction on the
Engerio server — no additional publisher-side configuration is needed.

## Notes

- Requests are sent without credentials (`withCredentials: false`).
- Auction payloads are JSON-serialized and sent as `text/plain` to avoid CORS preflights.
- The adapter passes `site.page` and `site.domain` from Prebid.js `refererInfo`
  for contextual targeting.
- `device.ua` is forwarded from Prebid.js normalized request data when available.
- Bid TTL is 300 seconds.
