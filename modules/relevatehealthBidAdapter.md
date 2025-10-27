# Overview

```
Module Name: relevatehealth Bidder Adapter
Module Type: Bidder Adapter
Maintainer: marketingops@relevatehealth.com
```

# Description

relevatehealth currently supports the BANNER type ads through prebid js

Module that connects to relevatehealth's demand sources.

# Banner Test Request
```
  var adUnits = [
    {
      code: 'banner-ad',
      mediaTypes: {
        banner: {
            sizes: [[160, 600]], 
        }
      }
      bids: [
        {
            bidder: 'relevatehealth',
            params: {
                placement_id: 110011,  // Required parameter
                user_id: '1111111' // Required parameter
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
