# Overview

```
Module Name: Yandex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@yandex-team.com
```

# Description

Yandex Bidder Adapter for Prebid.js.

# Parameters

| Name          | Required?                                  | Description | Example | Type      |
|---------------|--------------------------------------------|-------------|---------|-----------|
| `placementId` | Yes                                        | Block ID    | `123-1` | `String`  |
| `pageId`      | No<br>Deprecated. Please use `placementId` | Page ID     | `123`   | `Integer` |
| `impId`       | No<br>Deprecated. Please use `placementId` | Imp ID      | `1`     | `Integer` |

# Test Parameters

```
var adUnits = [{
  code: 'banner-1',
  mediaTypes: {
    banner: {
      sizes: [[240, 400], [300, 600]],
    }
  },
  bids: [{
    {
      bidder: 'yandex',
      params: {
        placementId: '346580-1'
      },
    }
  }]
}];
```
