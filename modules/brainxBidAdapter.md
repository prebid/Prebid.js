# brianx Bidder Adapter

## Overview

```
Module Name: brianx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: brainx.official@tec-do.com
```

## Description

Module that connects to brianx's demand sources

## Bid Parameters

| Name       | Scope        | Type   | Description                          | Example                                |
| ---------- | ------------ | ------ | ------------------------------------ | -------------------------------------- |
| `pubId`    | required     | String | The Pub Id provided by Brainx Ads.   | `F7B53DBC-85C1-4685-9A06-9CF4B6261FA3` |
| `endpoint` | optional | String | The endpoint provided by Brainx Url. | `https://dsp.brainx.tech/bid`          |

## Example

### Banner Ads

```javascript
var adUnits = [{
  code: 'banner-ad-div',
  mediaTypes: {
    banner: {
      sizes: [
            [320, 250],
            [320, 480]
        ]
    }
  },
  bids: [{
    bidder: 'brianx',
    params: {
      pubId: 'F7B53DBC-85C1-4685-9A06-9CF4B6261FA3',
      endpoint: 'https://dsp.brainx.tech/bid'
    }
  }]
}];
```

* For video ads, enable prebid cache.

```javascript
pbjs.setConfig({
    ortb2: {
        ortbVersion: '2.5'
    },
    debug: false // or true
});
```
