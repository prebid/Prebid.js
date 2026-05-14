# Overview

```
Module Name: Asterio Bidder Adapter
Module Type: Bidder Adapter
Maintainer: mnikulin@asteriosoft.com
```

# Description

Connects to Asterio Bidder for bids.
Asterio bid adapter supports Banner and Video ads.

# Bid Params

| Name | Scope | Type | Description |
| ---- | ----- | ---- | ----------- |
| `adUnitToken` | required | String | Asterio ad unit token provided by Asterio. |
| `pos` | optional | Number | Ad position override. When omitted, the adapter uses `mediaTypes.banner.pos` or `mediaTypes.video.pos` from the ad unit. |

# Test Parameters
```
const adUnits = [
  {
    bids: [
      {
        bidder: 'asterio',
        params: {
          adUnitToken: '????????-????-????-????-????????????', // adUnitToken provided by Asterio
        }
      }
    ]
  }
];
```
