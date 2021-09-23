# Overview

```
Module Name: DSPx Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@dspx.tv
```

# Description

DSPx adapter for Prebid.

# Test Parameters
```
    var adUnits = [
        {
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [
                      [300, 250],
                      [300, 600],
                    ]
                }
            },
            bids: [
                {
                    bidder: "dspx",
                    params: {
                        placement: '101',   // [required] info available from your contact with DSPx team
                        /*
                            bcat:  "IAB2,IAB4",  // [optional] list of blocked advertiser categories (IAB), comma separated 
                        */
                        /*
                            pfilter: { // [optional]
                                // [optional] only required if a deal is negotiated
                                deals: [ // [optional]
                                    "123-4567-d58a7f9a-..."// DEAL_ID from DSPx contact
                                ],
                                private_auction: 1 // [optional]  0  - no, 1 - yes
                                // usually managed on DSPx side
                                floorprice: 1000000 // input min_cpm_micros, CPM in EUR * 1000000
                            },
                        */
                    }
                }
            ]
        },
        {
            code: 'video1',
            mediaTypes: {
                video: {
                    playerSize: [640, 480],
                    context: 'instream'
                }
            },
            bids: [{
                bidder: 'dspx',
                params: {
                    placement: '106'
                }
            }]
        }
    ];
```
