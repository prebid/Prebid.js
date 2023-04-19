# Overview

```
Module Name: IVS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@ivs.tv
```

# Description

Module that connects to IVS's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                video: {
                    playerSize: [640, 480],
                    context: 'instream'
                }
            },
            bids: [
                {
                    bidder: 'ivs',
                    params: {
                        publisherId: '3001234' // required
                    }
                }
            ]
        }
    ];
```