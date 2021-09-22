# Overview

Module Name: C-WIRE Bid Adapter
Module Type: Adagio Adapter
Maintainer: dragan@cwire.ch

## Description

Connects to C-WIRE demand source to fetch bids.

## Configuration


Below, the list of C-WIRE params and where they can be set.

| Param name | Global config | AdUnit config | Type | Required |
| ---------- | ------------- | ------------- | ---- | ---------|
| pageId |  | x | number | YES |
| placementId |  | x | number | YES |
| adUnitElementId |  | x | string | NO |

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
        pageId: 1422,                 // required - number
        placementId: 2211521,         // required - number
        adUnitElementId: 'other_div', // optional, div id to write to, if not set it will default to ad unit code  
      }
    }]
  }
];
```