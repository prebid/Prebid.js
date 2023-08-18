# Overview

```
Module Name: Yandex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@yandex-team.com
```

# Description

Yandex Bidder Adapter for Prebid.js.

# Parameters

| Name          | Scope    | Description             | Example   | Type      |
|---------------|----------|-------------------------|-----------|-----------|
| `pageId`      | required | Page ID                 | `123`     | `Integer` |
| `impId`       | required | Block ID                | `1`       | `Integer` |

# Test Parameters

```
var adUnits = [{
  code: 'banner-1',
  mediaTypes: {
    banner: {
      sizes: [[240, 400]],
    }
  },
  bids: [{
    {
      bidder: 'yandex',
      params: {
        pageId: 346580,
        impId: 143,
      },
    }
  }]
}];
```
