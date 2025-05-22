# Overview

**Module Name:** Exco Bid Adapter

**Module Type:** Bidder Adapter

**Maintainer:** Itadmin@ex.co

# Description

Module that connects to Exco's demand sources.

# Test Parameters
  ```js
var adUnits = [
  {
    code: 'test-ad',
    sizes: [[300, 250]],
    bids: [
      {
        bidder: 'exco',
        params: {
          accountId: 'accountId',
          publisherId: 'publisherId',
          tagId: 'tagId',
        }
      }
    ]
  }
];
```
