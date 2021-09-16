# Overview

Module Name: C-WIRE Bid Adapter
Module Type: Adagio Adapter
Maintainer: dragan@cwire.ch

## Description

Connects to C-WIRE demand source to fetch bids.

## Configuration


Below, the list of C-WIRE params and where they can be set.

| Param name | Global config | AdUnit config | Type |
| ---------- | ------------- | ------------- | ---- |
| pageId |  | x | number |
| placementId |  | x | number |

### adUnit configuration

```javascript
var adUnits = [
  {
    code: 'target_div_id', // REQUIRED 
    bids: [{
      bidder: 'cwire',
      mediaTypes: {
        banner: {
          sizes: [[1, 1]],
        }
      },
      params: {
        pageid: 1422,          // required - number
        placementid: 2211521,  // required - number
      }
    }]
  }
];
```