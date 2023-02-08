# Overview

```
Module Name:  C-WIRE Bid Adapter
Module Type:  Bidder Adapter
Maintainer: devs@cwire.ch
```

## Description

Prebid.js Adapter for C-Wire.

## Configuration

Below, the list of C-WIRE params and where they can be set.

| Param name  | URL parameter | AdUnit config |   Type   |   Required    |
|-------------|:-------------:|:-------------:|:--------:|:-------------:|
| pageId      |               |       x       |  number  |      YES      |
| placementId |               |       x       |  number  |      YES      |
| cwgroups    |       x       |               |  string  |      NO       |
| cwcreative  |       x       |               |  string  |      NO       |
| cwdebug     |       x       |               | boolean  |      NO       |
| cwfeatures  |       x       |               |  string  |      NO       |


### adUnit configuration

```javascript
var adUnits = [
  {
    code: 'target_div_id', // REQUIRED 
    bids: [{
      bidder: 'cwire',
      mediaTypes: {
        banner: {
          sizes: [[400, 600]],
        }
      },
      params: {
        pageId: 1422,                 // required - number
        placementId: 2211521,         // required - number
        cwcreative: '42',             // optional - id of creative to force
        refgroups: 'test-user',       // optional - name of group or coma separated list of groups to force
      }
    }]
  }
];
```
