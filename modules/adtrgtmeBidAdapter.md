# Overview

```
Module Name: Adtrgtme Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@adtarget.me
```

# Description

The Adtrgtme Bid Adapter is a standalone OpenRTB interface that connects Prebid.js to Adtarget demand
(endpoint `rtb.cdn.adtarget.market`). It is **not** an alias of, and does not share code with, any other
adapter: outbound requests are built with Prebid's ORTB conversion library
(`libraries/ortbConverter`), and the adapter only layers Adtarget-specific fields on top.

# Supported Features:

* Media Types: Banner, Video, Native
* Multi-format adUnits (banner + video + native in a single impression)
* Price Floors module (`getFloor`)
* Supply Chain — read from `ortb2.source.ext.schain`
* Privacy: GDPR/TCF, US Privacy, GPP
* First party data from `ortb2` / `ortb2Imp`
* Advertiser domains (`meta.advertiserDomains`)
* User syncs (image + iframe)

# Bidder Parameters

{: .table .table-bordered .table-striped }

| Name          | Scope    | Description                                                        | Example                          | Type             |
|---------------|----------|--------------------------------------------------------------------|----------------------------------|------------------|
| `sid`         | required | Adtarget site/app id provided by the SSP                           | `'1220291391'`                   | `string`         |
| `zid`         | optional | Strict placement id, forwarded as `imp.tagid`                      | `'1836455615'`                   | `string`/`number`|
| `bidOverride` | optional | Manual impression bidfloor fallback when the Price Floors module is absent | `{ imp: { bidfloor: 1.5, bidfloorcur: 'USD' } }` | `object` |

> Schain, currency, consent strings, eids, device and other standard data are read from the ad unit /
> `ortb2` automatically — they are **not** accepted as bidder params.

# Test Parameters

## Banner

```javascript
const adUnits = [{
  code: 'banner-div',
  mediaTypes: {
    banner: { sizes: [[300, 250], [300, 600]] }
  },
  bids: [{
    bidder: 'adtrgtme',
    params: {
      sid: '1220291391' // Site/App ID provided from SSP
    }
  }]
}];
```

## Video (instream / outstream)

```javascript
const adUnits = [{
  code: 'video-div',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      mimes: ['video/mp4'],
      protocols: [2, 3, 5, 6],
      api: [2],
      maxduration: 30,
      minduration: 5,
      linearity: 1
    }
  },
  bids: [{
    bidder: 'adtrgtme',
    params: {
      sid: '1220291391',
      zid: '1836455615'
    }
  }]
}];
```

## Native (ORTB)

```javascript
const adUnits = [{
  code: 'native-div',
  mediaTypes: {
    native: {
      ortb: {
        assets: [
          { id: 1, required: 1, title: { len: 80 } },
          { id: 2, required: 1, img: { type: 3, w: 300, h: 250 } },
          { id: 3, required: 1, data: { type: 2, len: 120 } }
        ]
      }
    }
  },
  bids: [{
    bidder: 'adtrgtme',
    params: {
      sid: '1220291391'
    }
  }]
}];
```

# Optional configuration

## Price floors & bidfloor override

The adapter supports the Prebid Price Floors module and uses it to set the outbound `bidfloor`/`bidfloorcur`.
If no module floor is available you can set a custom floor via
`params.bidOverride.imp.bidfloor` and `params.bidOverride.imp.bidfloorcur`.

## Strict placement identification

Use `params.zid` for strict placement identification; it is forwarded to the SSP as `imp.tagid`.

## Adapter config (`pbjs.setConfig`)

```javascript
pbjs.setConfig({
  adtrgtme: {
    ttl: 360,                 // bid TTL in seconds (0 < ttl < 3000), default 300
    singleRequestMode: true,  // pack all impressions into one request, default false
    endpoint: 'https://rtb.cdn.adtarget.market/ssp?prebid&s=' // override the SSP endpoint
  }
});
```
