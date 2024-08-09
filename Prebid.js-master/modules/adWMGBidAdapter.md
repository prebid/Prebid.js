# Overview

```
Module Name: adWMG Adapter
Module Type: Bidder Adapter
Maintainer: wbid@adwmg.com
```

# Description

Module that connects to adWMG demand sources to fetch bids. Supports 'banner' ad format.

# Bid Parameters

| Key             | Required | Example                      | Description                     |
| --------------- | -------- | -----------------------------| ------------------------------- |
| `publisherId`   | yes      | `'5cebea3c9eea646c7b623d5e'` | publisher ID from WMG Dashboard |
| `IABCategories` | no       | `['IAB1', 'IAB5']`           | IAB ad categories for adUnit    |
| `floorCPM`      | no       | `0.5`                        | Floor price for adUnit          |


# Test Parameters

```javascript
var adUnits = [{
  code: 'wmg-test-div',
  sizes: [[300, 250]],
  bids: [{
    bidder: 'adWMG',
    params: {
      publisherId: '5cebea3c9eea646c7b623d5e',
      IABCategories: ['IAB1', 'IAB5']
    },
  }]
}]