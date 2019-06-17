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

            // OPTIONAL - Render Sharethrough creative in an iframe, defaults to false
            iframe: true,

            // OPTIONAL - If iframeSize is provided, we'll use this size for the iframe
            // otherwise we'll grab the largest size from the sizes array
            // This is ignored if iframe: false
            iframeSize: [250, 250]
          }
        }
      ]
    }
  ];
```
