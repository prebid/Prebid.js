# Overview

```
Module Name: Dexerto Bidder Adapter
Module Type: Bidder Adapter
Maintainer: niels.claes@dexerto.com
```

# Description

Dexerto currently supports the BANNER type ads through prebid js

Module that connects to dexerto's demand sources.

# Banner Test Request
```
  var adUnits = [
    {
      code: 'display-ad',
      mediaTypes: {
        banner: {
            sizes: [[300, 250]], 
        }
      }
      bids: [
        {
            bidder: 'dexerto',
            params: {
                placement_id: 110003,  // Required parameter
                width: 300,   // Optional parameter 
                height: 250, // Optional parameter
                bid_floor: 0.1 // Optional parameter
            }
        }
      ]
    }
  ];
```
