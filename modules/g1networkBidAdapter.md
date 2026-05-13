# Overview

```
Module Name: g1.network Bid Adapter
Module Type: Bidder Adapter
Maintainer: the@g1.team
```

# Description

Connects to g1.network's SSP for header bidding via OpenRTB 2.6.

Endpoint: `https://ssp-api.g1.network/ad-request`.

Supported media types: banner, video, native.

# Bid Params

| Name        | Scope    | Description                          | Example                                  |
|-------------|----------|--------------------------------------|------------------------------------------|
| propertyId  | required | UUID v4 of the registered property   | `'fe08b416-412c-4d8f-a94b-b16974c42c85'` |
| adUnitId    | required | UUID v4 of the ad-unit               | `'4bc47b5f-8c26-43f1-85fc-4d3c885a1e40'` |
| endpoint    | optional | Override ssp-api host                | `'https://ssp-api.g1.network'`           |

# Test Parameters

```js
var adUnits = [{
  code: 'div-gpt-ad-g1-300x250',
  mediaTypes: { banner: { sizes: [[300, 250]] } },
  bids: [{
    bidder: 'g1network',
    params: {
      propertyId: 'fe08b416-412c-4d8f-a94b-b16974c42c85',
      adUnitId:   '4bc47b5f-8c26-43f1-85fc-4d3c885a1e40'
    }
  }]
}];
```
