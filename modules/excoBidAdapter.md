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
          cId: '562524b21b1c1f08117fc7f9',
          pId: '59ac17c192832d0011283fe3',
          bidFloor: 0.0001,
          ext: {
            param1: 'loremipsum',
            param2: 'dolorsitamet'
          }
        }
      }
    ]
  }
];
```
