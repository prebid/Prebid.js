# Overview

```
Module Name: fluct Bid Adapter
Module Type: Bidder Adapter
Maintainer: developer@fluct.jp
```

# Description

Connects to fluct exchange for bids.

# Test parameters

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
                bidder: 'fluct',
                params: {
                    tagId: '25405:1000192893',
                    groupId: '1000105712',
                    dfpUnitCode: '/62532913/s_fluct.test_hb_prebid_11940', // Optional
                }
            }
        ]
    }
]
```
