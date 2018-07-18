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
      code: 'rdn-ad-test-div',
      mediaTypes: {
        banner: {
          sizes: [
            [300, 250],
            [300, 100],
            [320, 50]
          ]
        }
      },
      bids: [
        {
          bidder: 'rdn',
          params: {
            ...
          }
        }
      ]
    }
  ];
```
