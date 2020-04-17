# Overview

Module Name: RingierAxelSpringer Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adp-support@ringieraxelspringer.pl

# Description

Module that connects to RingerAxelSpringer demand sources.
Only banner format is supported.

# Test Parameters
```js
var adUnits = [
  {
    code: 'test-div-ad',
    mediaTypes: {
      banner: {
        sizes: [[300, 250], [300,600]]
      }
    },
    bids: [{
      bidder: 'ringieraxelspringer',
      params: {
        area: 'NOWASG',
        site: 'GLOWNA',
        network: '1746213'
      }
    }]
  }
];
```
