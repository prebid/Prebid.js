# Overview

```
Module Name: Aja Bid adapter
Module Type: Bidder adapter
Maintainer: ssp_support@aja-kk.co.jp
```

# Description
Connects to Aja exchange for bids.
Aja bid adapter supports Banner and Outstream Video.

# Test Parameters
```
var adUnits = [
  // Banner adUnit
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [
          [300, 250]
        ],
      }
    },
    bids: [{
      bidder: 'aja',
      params: {
        asi: 'szs4htFiR'
      }
    }]
  },
  // Video outstream adUnit
  {
    code: 'video-outstream',
    mediaTypes: {
      video: {
        context: 'outstream',
        playerSize: [300, 250]
      }
    },
    bids: [{
      bidder: 'aja',
      params: {
        asi: 'Kp2O2tFig'
      }
    }]
  }
];
```
