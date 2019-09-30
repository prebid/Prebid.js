# Overview

Module Name: Audience Network Bid Adapter

Module Type: Bidder Adapter

Maintainer: Lovell Fuller

# Parameters

| Name          | Scope    | Description                                     | Example                           |
| :------------ | :------- | :---------------------------------------------- | :--------------------------------- |
| `placementId` | required | The Placement ID from Audience Network          | "555555555555555\_555555555555555" |
| `format`      | optional | Format, one of "native" or "video"              | "native"                           |

# Example ad units

```javascript
const adUnits = [{
  code: "test-iab",
  sizes: [[300, 250]],
  bids: [{
    bidder: "audienceNetwork",
    params: {
      placementId: "555555555555555_555555555555555"
    }
  }]
}, {
  code: "test-native",
  sizes: [[300, 250]],
  bids: [{
    bidder: "audienceNetwork",
    params: {
      format: "native",
      placementId: "555555555555555_555555555555555"
    }
  }]
}, {
  code: "test-video",
  sizes: [[640, 360]],
  bids: [{
    bidder: "audienceNetwork",
    params: {
      format: "video",
      placementId: "555555555555555_555555555555555"
    }
  }]
}];
```
