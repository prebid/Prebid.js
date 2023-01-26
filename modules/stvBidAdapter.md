# Overview

```
Module Name: STV/Smartstream Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@smartstream.tv
```

# Description

STV/Smartstream adapter for Prebid.

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
                    bidder: "stv",
                    params: {
                        placement: '101',   // [required] info available from your contact with Smartstream team
                        /* // [optional params]
                            bcat:  "IAB2,IAB4",  // [optional] list of blocked advertiser categories (IAB), comma separated 
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
                bidder: 'stv',
                params: {
                    placement: '106',
                    /* // [optional params]
                        bcat:  "IAB2,IAB4",  // [optional] list of blocked advertiser categories (IAB), comma separated 
                        floorprice: 1000000, // input min_cpm_micros, CPM in EUR * 1000000
                        max_duration: 60,    // in seconds
                        min_duration: 5,     // in seconds
                        max_bitrate: 600,   
                        api: [1,2],          // https://github.com/InteractiveAdvertisingBureau/AdCOM/blob/master/AdCOM%20v1.0%20FINAL.md#list--api-frameworks-
                    */
                }
            }]
        }
    ];
```
