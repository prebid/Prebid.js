# Overview

```
Module Name: Digital Matter Bid Adapter
Module Type: Digital Matter Bid Adapter
Maintainer: prebid@digitalmatter.ai
```

# Description

Module that connects to Digital Matter demand sources

# Banner Test Parameters

```js
var adUnits = [
  {
    code: "test-banner",
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250],
          [300, 600]
        ]
      }
    },
    bids: [
      {
        bidder: "digitalMatter",
        params: {
          accountId: "1_demo_1", // string, required
          siteId: "1-demo-1" // string, required
        }
      }
    ]
  }
];
```
