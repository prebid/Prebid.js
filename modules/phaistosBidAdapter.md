# Overview

```
Module Name: Phaistos Bid Adapter
Module Type: Bidder Adapter
Maintainer: prebid@phaistos.eu
```

# Description

Client-side Prebid.js adapter for the Phaistos (`https://pbs.phaistos.eu`).  
It posts one OpenRTB auction request to `/openrtb2/auction` and maps the  
response with the shared ortbConverter and Prebid Server extensions.

The adapter sets `site.publisher.id` from the page domain (eTLD+1), or from
optional `params.accountId`. The Phaistos prebid server authenticates the publisher from that  
account id.

Supported media types: banner and video. Bids are in EUR. GVL vendor id is
**47** (ADMAN - Phaistos Networks, S.A.). Device-storage disclosure:
`https://static.adman.gr/phaistos_ads_cookies_disclosure.json`.

User sync runs through Prebid `getUserSyncs` when
`userSync.iframeEnabled` is true: the adapter returns an iframe to
`https://pbs.phaistos.eu/static/cookie_sync.html`, which POSTs
`/cookie_sync` and drops the returned pixels. Publishers should  
enable iframe user sync:

```js
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    filterSettings: {
      iframe: { bidders: ['phaistos'], filter: 'include' }
    }
  }
});
```

First-party data, supply chain, COPPA, and privacy strings are taken from
publisher `ortb2` / consent modules via ortbConverter.

# Bid Params

| Name        | Scope    | Description                                                                                      | Type              |
| ----------- | -------- | ------------------------------------------------------------------------------------------------ | ----------------- |
| `id`        | required | ad unit id                                                                                       | `string`/`number` |
| `host`      | optional | the grxchange origin. When omitted, Phaistos prebid server fallbacks to `https://x.grxchange.gr` | `string`          |
| `accountId` | optional | Override for `site.publisher.id`. Defaults to eTLD+1 of the page domain.                         | `string`          |

# Test Parameters

```js
var adUnits = [
  {
    code: 'test-banner',
    mediaTypes: {
      banner: { sizes: [[300, 250]] }
    },
    bids: [{
      bidder: 'phaistos',
      params: {
        id: 42551, // try this on a page hosted on localhost
      }
    }]
  },
  {
    code: 'test-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 360]],
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6],
        api: [1, 2],
        maxduration: 30,
        linearity: 1
      }
    },
    bids: [{
      bidder: 'phaistos',
      params: {
        id: 42552, // try this on a page hosted on localhost
      }
    }]
  }
];
```
