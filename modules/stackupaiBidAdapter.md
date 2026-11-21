# Stackup Bid Adapter

# Overview

```
Module name: Stackup Bid Adapter
Module Type: Bidder Adapter
Maintainer: anton@stackup-ai.com
```

# Description

Connects to StackUp's ad server. The adapter sends one OpenRTB request per
auction, with one imp per ad unit. Banner and video are supported.

The only bidder param is `tag`, the supply tag ID for this placement
(`[A-Za-z0-9_-]`, up to 128 characters).

Use the bidder code `stackupai` directly. Don't alias it
(`pbjs.aliasBidder('stackupai', …)`): aliased requests don't get bids.

# GDPR

StackUp is not yet registered with the IAB TCF, so the adapter declares no
GVL ID. When GDPR applies and the TCF control module enforces its default
rules, the `stackupai` bidder is blocked on that traffic. Traffic where GDPR
doesn't apply is unaffected.

# Timeout notifications

When StackUp's response misses the auction timeout, the adapter sends one
POST per auction to `events.<endpoint host>/e/timeout` with the timed-out bid
IDs, their `tag` and the timeout in milliseconds. It is sent without cookies.

# Bid params

| Name  | Scope    | Description                       | Example      | Type     |
|-------|----------|------------------------------------|--------------|----------|
| `tag` | required | Supply tag ID for this placement   | `'test-tag'` | `string` |

# Video

StackUp returns video bids as inline VAST (`vastXml`), with no `vastUrl`.
Prebid drops vastXml-only video bids unless a cache is configured, so set one
of:

```js
pbjs.setConfig({ cache: { url: 'https://prebid.example.com/pbc/v1/cache' } }); // Prebid Cache
pbjs.setConfig({ cache: { useLocal: true } });                                 // in-browser cache
pbjs.setConfig({ cache: { allowVastXmlOnly: true } });                         // testing only
```

# Test parameters

```js
const adUnits = [
  {
    code: 'video-1',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6]
      }
    },
    bids: [{
      bidder: 'stackupai',
      params: { tag: 'test-tag' }
    }]
  },
  {
    code: 'banner-1',
    mediaTypes: {
      banner: { sizes: [[300, 250]] }
    },
    bids: [{
      bidder: 'stackupai',
      params: { tag: 'test-tag' }
    }]
  }
];
```
