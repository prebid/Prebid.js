# Overview

```
Module Name: Amli Media Bid Adapter
Module Type: Bidder Adapter
Maintainer: anand@amlimedia.com
```

# Description

Connects to the Amli Media exchange over OpenRTB for banner, video (instream and outstream),
native and audio demand. Every ad unit is sent as its own single-impression request to
`https://rtb.amlimedia.com/?intg=pbjs&pid=<pid>`.

The request carries everything Prebid knows about the impression: first party data from
`ortb2` / `ortb2Imp` (site, app, content, GPID, `bcat`/`badv`, `instl`), device data
(user agent, client hints, screen size, device type, OS, pixel ratio, connection type, time zone),
geo when the publisher or a geolocation RTD module provides it, price floors from the floors
module, all user ids as `eids`, the supply chain, and the GDPR, US Privacy, GPP and COPPA signals.
Fields that moved between OpenRTB 2.5 and 2.6 (`gdpr`, `consent`, `us_privacy`, `gpp`, `gpp_sid`,
`eids`, `schain`) are sent in both locations.

Responses may use any OpenRTB 2.x shape (with or without `mtype`) or the OpenRTB 3.0 envelope;
native markup may be OpenRTB Native 1.0 / 1.1 (wrapped in `native`) or 1.2.

User sync goes to `https://rtb.amlimedia.com/?type=u_sync&intg=pbjs`, with `f=iframe` when the
publisher allows iframe syncs and `f=image` (an image pixel) otherwise. Consent parameters
(`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`, `gpp_sid`, `coppa`) are appended to every sync URL.
The adapter itself does not read or write cookies or local storage.

Amli Media is not registered with the IAB TCF Global Vendor List yet.

# Bid Parameters

| Name          | Scope    | Description                                                               | Example     | Type               |
|---------------|----------|---------------------------------------------------------------------------|-------------|--------------------|
| `pid`         | required | Placement id from the Amli Media dashboard, created with each end point   | `'amli-123'` | `string \| number` |
| `test`        | optional | `1` enables test mode (test creatives, nothing billed, request logged); `0` or absent is live | `1` | `0 \| 1`  |
| `bidfloor`    | optional | Static floor CPM in USD, used only when the floors module did not set one | `0.5`       | `number`           |

Video and audio settings are read from `mediaTypes.video` / `mediaTypes.audio`, never from bidder params.

# Currency

Amli Media bids in USD. Floors are requested from the floors module in USD; a floor in another
currency is converted with the currency module, or left out when it cannot be converted. Publishers
with a non-USD ad server currency should include the currency module so USD bids are converted.

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'amli-banner',
    mediaTypes: {
      banner: { sizes: [[300, 250]] }
    },
    bids: [{ bidder: 'amlimedia', params: { pid: '034da6b91f123863889e2abda3b58ed8', test: 1 } }]
  },
  {
    code: 'amli-video',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [640, 480],
        mimes: ['video/mp4', 'video/webm'],
        protocols: [2, 3, 5, 6, 7, 8],
        plcmt: 1
      }
    },
    bids: [{ bidder: 'amlimedia', params: { pid: '034da6b91f123863889e2abda3b58ed8', test: 1 } }]
  },
  {
    code: 'amli-native',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2',
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
            { id: 3, required: 0, data: { type: 2, len: 140 } }
          ]
        }
      }
    },
    bids: [{ bidder: 'amlimedia', params: { pid: '034da6b91f123863889e2abda3b58ed8', test: 1 } }]
  },
  {
    code: 'amli-audio',
    mediaTypes: {
      audio: {
        context: 'instream',
        mimes: ['audio/mp4', 'audio/mpeg'],
        protocols: [2, 3, 5, 6],
        minduration: 5,
        maxduration: 30
      }
    },
    bids: [{ bidder: 'amlimedia', params: { pid: '034da6b91f123863889e2abda3b58ed8', test: 1 } }]
  }
];

pbjs.mergeConfig({
  userSync: {
    filterSettings: {
      iframe: { bidders: ['amlimedia'], filter: 'include' }
    }
  }
});
```

# White-label use

Partners running their own wrapper can reuse the adapter under their own code with
`pbjs.aliasBidder('amlimedia', 'partnercode')`.
