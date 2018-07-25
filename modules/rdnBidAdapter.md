# Overview

```
Module Name: RDN Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@rdn.co.jp
```

# Description

Connect to RDN for bids.

RDN bid adapter supports Banner currently.

# Test Parameters

```
  var adUnits = [
    {
      code: 'test-ad-div',
      sizes: [[300, 250]],
      mediaTypes: {banner: {}},
      bids: [
        {
          bidder: 'rdn',
          params: {
            adSpotId: '445999'
          }
        }
      ]
    }
  ];
```
