# Overview

**Module Name:** Vidazoo Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** dev@vidazoo.com

# Description

Module that connects to Vidazoo's demand sources.
 
# Test Parameters
```js
var adUnits = [
  {
    code: 'test-ad',
    sizes: [[300, 250]],
    bids: [
      {
        bidder: 'vidazoo',
        params: {
          cId: '5a1c419d95fce900044c334e',
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
