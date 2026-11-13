# Overview
```
Module Name: LOGLY Bidder Adapter
Module Type: Bidder Adapter
Maintainer: dev@logly.co.jp
```

# Description
Module that connects to LOGLY's demand sources.
Currently module supports only banner mediaType.

# Test Parameters
```
var adUnits = [
  // Banner adUnit
  {
    code: 'test-banner-code',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [{
      bidder: 'logly',
      params: {
        adspotId: 4338071
      }
    }]
  },
];
```
