# Overview

Module Name: C-WIRE Bid Adapter
Module Type: Adagio Adapter
Maintainer: publishers@cwire.ch

## Description

Connects to C-WIRE demand source to fetch bids.

## Configuration


Below, the list of C-WIRE params and where they can be set.

| Param name | Global config | AdUnit config | Type   | Required |
| ---------- | ------------- | ------------- |--------| ---------|
| pageId |  | x | number | YES |
| placementId |  | x | number | YES |
| refgroups | | x | string | NO |
| cwcreative |  | x | string | NO |
| cwapikey | | x | string | NO |


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
        cwcreative: '42',             // optional - id of creative to force
        refgroups: 'test-user',       // optional - name of group or coma separated list of groups to force
        cwapikey: 'api_key_xyz',      // optional - api key for integration testing        
      }
    }]
  }
];
```
