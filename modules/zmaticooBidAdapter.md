# Overview

```
Module Name: zMaticoo Bidder Adapter
Module Type: Bidder Adapter
Maintainer: adam.li@eclicktech.com.cn
```

# Description

zMaticoo Bidder Adapter for Prebid.js.

# Test Parameters

## banner

```
        var adUnits = [
            {
                mediaTypes: {
                    banner: {
                        sizes: [[320, 50]],  // a display size
                    }
                },
                bids: [
                    {
                        bidder: 'zmaticoo',
                        params: {
                            user: {
                                uid: '12345',
                                buyeruid: '12345'
                            },
                            pubId: 'prebid-fgh',
                            test: 1
                        }
                    }
                ]
            }
        ];
```

## video

```
     var adUnits = [{
    code: 'test1',
    mediaTypes: {
        video: {
            playerSize: [480, 320],
            mimes: ['video/mp4'],
            context: 'instream',
            placement: 1,       // required, integer
            maxduration: 30,    // required, integer
            minduration: 15,    // optional, integer
            pos: 1,             // optional, integer
            startdelay: 10,     // required if placement == 1
            protocols: [2, 3],  // required, array of integers
            api: [2, 3],        // required, array of integers
            playbackmethod: [2, 6], // required, array of integers
            skippable: true,    // optional, boolean
            skipafter: 10       // optional, integer
        }
    },
    bids: [{
        bidder: "zmaticoo",
        params: {
            pubId: 'prebid-test',
            site: {domain: "test.com"}
        }
    }]
}];
```
