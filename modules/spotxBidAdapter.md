# Overview

```
Module Name: SpotX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: teameighties@spotx.tv
```

# Description

Connect to SpotX for bids.

This adapter requires setup and approval from the SpotX team.

# Test Parameters
```
    var adUnits = [{
        bids: [{
                bidder: 'spotx',
                params: {
                    placementId: "123456789",
                    video: {
                        channel_id: 79391,
                        video_slot: 'video1',
                        slot: 'video1',
                        ad_unit: 'outstream'
                    }
                }
            }
        ]
    }];

```
