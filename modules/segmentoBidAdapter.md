# Overview

```
Module Name: Segmento Bidder Adapter
Module Type: Bidder Adapter
Maintainer: ssp@segmento.ru
```

# Description

Module that connects to Segmento's demand sources

# Test Parameters
```
var adUnits = [
    {
        code: 'test-div',
        mediaTypes: {
            banner: {
                sizes: [[240,400],[160,600]],
            }
        },
        bids: [
            {
                bidder: 'segmento',
                params: {
                    placementId: -1
                }
            }
        ]
    }
];
```
