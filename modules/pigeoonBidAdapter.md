# Overview

```
Module Name: Pigeoon Bid Adapter
Module Type: Bidder Adapter
Maintainer: destek@pigeoon.com
```

# Description

Module that connects Prebid.JS publishers to Pigeoon ad platform for direct sales campaigns via Google Ad Manager.

# Parameters

| Name | Scope | Description | Example |
| --- | --- | --- | --- |
| `networkId` | required | Publisher network ID provided by Pigeoon | "net_ABC123" |
| `placementId` | required | Placement ID provided by Pigeoon | "12345678" |

# Test Parameters

```javascript
var adUnits = [
  {
    code: 'div-banner-1',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [728, 90]]
      }
    },
    bids: [
      {
        bidder: 'pigeoon',
        params: {
          networkId: 'net_ABC123',
          placementId: '12345678'
        }
      }
    ]
  }
];
```
