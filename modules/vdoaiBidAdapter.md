# Overview

```
Module Name: VDO.AI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: arjit@z1media.com
```

# Description

Module that connects to VDO.AI's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]]  // a display size
                }
            },
            bids: [
                {
                    bidder: "vdoai",
                    params: {
                        placementId: 'newsdv77',
                        bidFloor: 0.01  // Optional
                    }
                }
            ]
        }
    ];
```


# Video Test Parameters
```
var videoAdUnit = {
  code: 'test-div',
  sizes: [[640, 480]],
  mediaTypes: {
    video: {
      playerSize: [[640, 480]],
      context: 'instream'
    },
  },
  bids: [
    {
        bidder: "vdoai",
        params: {
            placementId: 'newsdv77'
        }
    }
  ]
};
```