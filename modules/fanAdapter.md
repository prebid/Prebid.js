# Freedom Ad Network Bidder Adapter

# Overview

```
Module Name: Freedom Ad Network Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@freedomadnetwork.com
```

## Description

Module that connects to FAN's demand sources.

## Bid Parameters

| Name          | Scope    | Type               | Description                             | Example                                         |
|---------------|----------|--------------------|-----------------------------------------|-------------------------------------------------|
| `placementId` | required | String             | The Placement Id provided by FAN. | `e6203f1e-bd6d-4f42-9895-d1a19cdb83c8`                                |

## Example

### Banner Ads

```javascript
var adUnits = [{
  code: 'banner-ad-div',
  mediaTypes: {
    banner: {
      sizes: [[300, 250]]
    }
  },
  bids: [{
    bidder: 'freedomadnetwork',
    params: {
      placementId: 'e6203f1e-bd6d-4f42-9895-d1a19cdb83c8'
    }
  }]
}];
```
