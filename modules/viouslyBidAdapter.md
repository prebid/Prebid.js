# Overview

```
Module Name: Viously Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@viously.com
```

# Description

Module that connects to Viously's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                video: {
                    playerSize: [640, 360],
                    context: 'instream',
                    playbackmethod: [1, 2, 3, 4, 5, 6]
                }
            },
            bids: [
                {
                    bidder: 'viously',
                    params: {
                        pid: '20d30b78-43ec-11ed-b878-0242ac120002'
                    }
                }
            ]
        }
    ];
```