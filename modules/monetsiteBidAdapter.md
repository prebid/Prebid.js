# Overview

```
Module Name: Monetize.site Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@monetize.site
```

# Description

Connects Prebid.js to Monetize.site demand over OpenRTB 2.x (`https://rtb.monetize.site/ssp`).
Requests are built with Prebid's `ortbConverter` library, one request per ad unit, with the
zone id passed in the URL (`?z=<zoneID>`) and as `imp.tagid`.

# Supported Features

* Media Types: Banner, Video, Native (incl. multi-format ad units)
* Price Floors module
* First party data from `ortb2` / `ortb2Imp`, including supply chain and user ids (eids)
* Privacy: GDPR/TCF, US Privacy, GPP, COPPA
* User syncs (image and iframe), returned by the server in `ext.pixels`

# Bidder Parameters

| Name       | Scope    | Description                                                          | Example    | Type              |
|------------|----------|----------------------------------------------------------------------|------------|-------------------|
| `zoneID`   | required | Zone id provided by Monetize.site                                    | `'123456'` | `string`/`number` |
| `bidfloor` | optional | Impression floor, used when the Price Floors module sets none; default `0` | `0.5`      | `number`          |
| `cur`      | optional | ISO 4217 currency of `bidfloor`; default `USD`                      | `'EUR'`    | `string`          |
| `mirror`   | optional | Hostname to send the request to instead of `rtb.monetize.site` (https, same path); overrides the `endpoint` config | `'rtb.example.com'` | `string` |

Everything else (site, device, consent, schain, floors, eids) is read from the ad unit and `ortb2`
automatically and is not accepted as a bidder param.

# Test Parameters

```javascript
const adUnits = [
  {
    code: 'banner-div',
    mediaTypes: { banner: { sizes: [[300, 250], [300, 600]] } },
    bids: [{ bidder: 'monetsite', params: { zoneID: '123456' } }]
  },
  {
    code: 'video-div',
    mediaTypes: {
      video: {
        context: 'instream',
        playerSize: [[640, 480]],
        mimes: ['video/mp4'],
        protocols: [2, 3, 5, 6],
        maxduration: 30
      }
    },
    bids: [{ bidder: 'monetsite', params: { zoneID: '123457' } }]
  },
  {
    code: 'native-div',
    mediaTypes: {
      native: {
        ortb: {
          assets: [
            { id: 1, required: 1, title: { len: 80 } },
            { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } }
          ]
        }
      }
    },
    bids: [{ bidder: 'monetsite', params: { zoneID: '123458' } }]
  }
];
```

# Bid Floors

Every impression is sent with `bidfloor`/`bidfloorcur`, resolved in this order:

1. the Price Floors module, when it is installed and a rule matches the ad unit;
2. `params.bidfloor` and `params.cur`;
3. `bidfloor: 0`, `bidfloorcur: 'USD'`.

```javascript
bids: [{ bidder: 'monetsite', params: { zoneID: '123456', bidfloor: 0.5, cur: 'EUR' } }]
```

The request-level `cur` follows the floor currency.

# Optional Configuration

```javascript
pbjs.setConfig({
  monetsite: {
    ttl: 360,                                  // bid TTL in seconds (0 < ttl <= 5000), default 500
    endpoint: 'https://rtb.monetize.site/ssp?z=' // endpoint override; the zone id is appended
  }
});
```

# User Syncs

The adapter does not store anything in the browser itself. Sync pixels are returned by the server in
`response.ext.pixels` as `[type, url]` pairs (`image`/`img` or `iframe`) and are only fired when the
publisher enables that sync type. Consent parameters (`gdpr`, `gdpr_consent`, `us_privacy`, `gpp`,
`gpp_sid`) are appended to every sync URL. Duplicate pixels across responses are registered once, and no syncs are
registered when COPPA applies.
