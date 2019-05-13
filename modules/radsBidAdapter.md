# Overview

```
Module Name: RADS Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@dspx.tv
```

# Description

RADS video adapter for Prebid.js 1.x

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
                      ],  // a display size
                }
            },
            bids: [
                {
                    bidder: "rads",
                    params: {
                        placement: '101',
                        pfilter: {
                            floorprice: 1000000, // EUR * 1,000,000
                            },
                    
                        latitude: 52.52437, // Latitude from -90.0 to +90.0, where negative is south.
                        longitude: 13.41053, // Longitude from -180.0 to +180.0, where negative is west
                    
                        bcat:  "IAB2,IAB4",  // List of  Blocked Categories (IAB) - comma separated 
                        dvt: "desktop|smartphone|tv|tablet" // DeVice Type (autodetect if not exists)
                    }
                }
            ]
        },{
            code: 'test-div',
            mediaTypes: {
                banner: {
                    sizes: [[320, 50]],   // a mobile size
                }
            },
            bids: [
                {
                    bidder: "rads",
                    params: {
                        placement: 101
                    }
                }
            ]
        }
    ];
```

Required param field is only `placement`. 

