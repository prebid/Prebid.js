# Overview

```
Module Name: Arteebee Bidder Adapter
Module Type: Bidder Adapter
Maintainer: jeffyecn@gmail.com
```

# Description

Module that connects to Arteebee's demand source

# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-ad-div',
        sizes: [[300, 250]],
        bids: [
          {
            bidder: 'arteebee',
            params: {
              ssp: 'mock',
              pub: 'prebidtest',
              source: 'prebidtest',
              test: true
            }
          }
        ]
      }
    ];
```