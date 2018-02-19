# Overview

```
Module Name: Sonobi Bidder Adapter
Module Type: Bidder Adapter
Maintainer: apex.prebid@sonobi.com
```

# Description

Module that connects to Sonobi's demand sources.

# Test Parameters
```
  var adUnits = [
    {
      code: 'adUnit_af',
      sizes: [[300, 250], [300, 600]],  // a display size
      bids: [
        {
            bidder: 'sonobi',
            params: {
                ad_unit: '/7780971/sparks_prebid_MR',
                placement_id: '1a2b3c4d5e6f1a2b3c4d', // ad_unit and placement_id are mutually exclusive
                sizes: [[300, 250], [300, 600]],
                floor: 1 // optional
            }
        }
      ]
    }
  ];
```
