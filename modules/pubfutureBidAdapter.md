# Overview

```
Module Name: PubFuture Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@pubfuture.com
```

# Description

Connects to the PubFuture oRTB 2.x exchange for banner and video demand.

# Video

The exchange returns VAST inline in `seatbid[].bid[].adm`, so bids carry
`vastXml` and no `vastUrl`. Prebid rejects a vastXml-only bid unless a cache is
configured, so a publisher running video must set one:

```js
pbjs.setConfig({ cache: { useLocal: true } });   // or cache: { url: '...' }
```

Outstream additionally requires a renderer on the bid, the ad unit or the
mediaType. This adapter does not supply one, so an outstream ad unit must
define its own `renderer`.

# Bid Params

| Name        | Scope    | Description                              | Example                      | Type      |
|-------------|----------|------------------------------------------|------------------------------|-----------|
| adUnitId      | required | PubFuture ad unit / placement id         | `'691373631fa32d00272c7283'` | `string`  |
| publisherId | optional | PubFuture publisher account id           | `'pub-app-id-1687'`          | `string`  |
| bidfloor    | optional | CPM floor (USD)                          | `0.05`                       | `number`  |
| test        | optional | Request a test/demo ad; ignores `adUnitId` and flags the auction as non-billable (oRTB `test: 1`) | `true` | `boolean` |

# Test Parameters

```js
var adUnits = [{
  code: 'banner-div',
  mediaTypes: {
    banner: { sizes: [[300, 250], [320, 50]] }
  },
  bids: [{
    bidder: 'pubfuture',
    params: {
      adUnitId: '1686/99228314060_68e5e38e1a65f400287e6845',
      publisherId: 'pub-app-id-1687'
    }
  }]
}];
```

Multiformat — the adapter sends `banner` and `video` on one imp and the
exchange picks; the winning format is taken from the response's `mtype`:

```js
var adUnits = [{
  code: 'multiformat-div',
  mediaTypes: {
    banner: { sizes: [[300, 250]] },
    video: {
      context: 'instream',
      playerSize: [[640, 480]],
      mimes: ['video/mp4']
    }
  },
  bids: [{
    bidder: 'pubfuture',
    params: {
      adUnitId: '1686/99228314060_68e5e38e1a65f400287e6845',
      publisherId: 'pub-app-id-1687'
    }
  }]
}];
```

Test/demo ad (no real `adUnitId` needed):

```js
var adUnits = [{
  code: 'banner-div',
  mediaTypes: {
    banner: { sizes: [[300, 250], [320, 50]] }
  },
  bids: [{
    bidder: 'pubfuture',
    params: {
      test: true
    }
  }]
}];
```
