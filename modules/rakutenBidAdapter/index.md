# Overview

```
Module Name: Rakuten Bidder Adapter
Module Type: Bidder Adapter
Maintainer: @snapwich
```

# Description

Bid adapter for Rakuten RSSP

Rakuten bid adapter supports Banner currently.

# Test Parameters

```
  var adUnits = [
    {
      code: 'test-ad-div',
      sizes: [[300, 250]],
      mediaTypes: {banner: {}},
      bids: [
        {
          bidder: 'rakuten',
          params: {
            adSpotId: 42
          }
        }
      ]
    }
  ];
```
