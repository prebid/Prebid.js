# Overview

**Module Name:** Apester Bidder Adapter

**Module Type:** Bidder Adapter

**Maintainer:** roni.katz@apester.com

# Description

Module that connects to Apester's demand sources.

# Test Parameters

```js
var adUnits = [
    {
        code: 'test-ad',
        sizes: [[300, 250]],
        bids: [
            {
                bidder: 'apester',
                params: {
                    cId: '562524b21b1c1f08117667f9',
                    pId: '59ac17c192832d0016683fe3',
                    bidFloor: 0.0001,
                    ext: {
                        param1: 'loremipsum',
                        param2: 'dolorsitamet'
                    }
                }
            }
        ]
    }
];
```
