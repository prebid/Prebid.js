# Overview

```
Module Name: Sharethrough Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pubgrowth.engineering@sharethrough.com
```

# Description

Module that connects to Sharethrough's demand sources

# Test Parameters
```
  var adUnits = [
    {
      code: 'test-div',
      sizes: [[300,250], [1, 1]],
      bids: [
        {
          bidder: "sharethrough",
          params: {
            // REQUIRED - The placement key
            pkey: 'LuB3vxGGFrBZJa6tifXW4xgK',

            // OPTIONAL - Blocked Advertiser Domains
            badv: ['domain1.com', 'domain2.com'],

            // OPTIONAL - Blocked Categories (IAB codes)
            bcat: ['IAB1-1', 'IAB1-2'],

            // OPTIONAL - default bid floor, if not specified in bid request (USD)
            floor: 0.1,
          }
        }
      ]
    }
  ];
```
