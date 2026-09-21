# Overview

```
Module Name: Pragma Adx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: mike@pragma-crm.com
```

# Description

Module that connects to Pragma Adx's video demand. `pragmaAdx` only ever
answers with a bid when a real external DSP has cleared a genuine price for
the impression through Pragma's own `run_auction()`; house creatives and
self-serve customer campaigns intentionally return no bid on this endpoint
because neither has a real market price to report into a header auction.

# Test Parameters

```javascript
    var adUnits = [
        {
            code: 'video-slot-1',
            mediaTypes: {
                video: {
                    context: 'instream',
                    playerSize: [[640, 360]],
                    mimes: ['video/mp4']
                }
            },
            bids: [
                {
                    bidder: 'pragmaAdx',
                    params: {
                        apiKey: 'adx_pub_test_key',
                        adUnitId: 1,
                        placement: 'article_inline'
                    }
                }
            ]
        }
    ];
```
