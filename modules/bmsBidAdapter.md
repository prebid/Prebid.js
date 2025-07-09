# Overview

Module Name: bms Bidder Adapter
Module Type: Bidder Adapter
Maintainer: celsooliveira@getbms.io

# Description

Module that connects to bms's demand sources.

# Test Parameters

```
    var adUnits = [
        {
        code: "test-div",
        mediaTypes: {
          banner: {
            sizes: [
              [300, 250],
              [300, 600],
            ],
          },
        },
        floors: {
          currency: "USD",
          schema: {
            delimiter: "|",
            fields: ["mediaType", "size"],
          },
          values: {
            "banner|300x250": 1.1,
            "banner|300x600": 1.35,
            "banner|*": 2,
          },
        },
        bids: [
          {
            bidder: "bms",
            params: {
              placementId: 13144370,
              publisherId: 13144370,
            },
          },
        ],
      },
    ];
```
