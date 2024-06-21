# Overview

```
Module Name: Audiencelogy Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@audiencelogy.com
```

# Description

Audiencelogy currently supports the BANNER type ads through prebid js

Module that connects to audiencelogy's demand sources.

# Banner Test Request
```
  var adUnits = [
    {
      code: 'display-ad',
      mediaTypes: {
        banner: {
            sizes: [[160, 600]], 
        }
      }
      bids: [
        {
            bidder: 'audiencelogy',
            params: {
                placement_id: 584,  // Required parameter
                user_id: '1111111' // Required parameter
                nid: 1  // Required parameter
                width: 160,   // Optional parameter 
                height: 600, // Optional parameter
                domain: '', // Optional parameter
		            bid_floor: 0.5 // Optional parameter
            }
        }
      ]
    }
  ];
```
