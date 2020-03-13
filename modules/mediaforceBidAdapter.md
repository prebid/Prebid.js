# Overview

```
Module Name: MediaForce Bidder Adapter
Module Type: Bidder Adapter
Maintainer: little.grey.goblin@gmail.com
```

# Description

Module that connects to mediaforce's demand sources

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[300, 250]],
                }
            },
            bids: [
                {
                    bidder: "mediaforce",
                    params: {
                        placement_id: 'pl12345',  // required
                        publisher_id: 'pub12345', // required
                        bidfloor: 0.5,
                    }
                }
            ]
        }
    ];
```
