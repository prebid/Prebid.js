# Overview

```
Module Name: OPRx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adsupport@optimizerx.com
```

# Description

OPRx currently supports the BANNER type ads through prebid js

Module that connects to OPRx's demand sources.

# Test Request
```
  var adUnits = [
    {
      code: 'oprx-banner-ad',
      mediaTypes: {
        banner: {
            sizes: [[728, 90]], 
        }
      }
      bids: [
        {
            bidder: 'oprx',
            params: {
                key: '', // Required parameter
                placement_id: 11223344,  // Required parameter
                width: 728,   // Optional parameter 
                height: 90, // Optional parameter
                bid_floor: 0.5, // Optional parameter
                npi: '1234567890', // Optional parameter
                ndc: '12345678901' // Optional parameter
            }
        }
      ]
    }
  ];
```
