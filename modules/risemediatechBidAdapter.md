# Overview

Module Name : RisemediaTech Bidder Adapter
Module Type : Bid Adapter
Maintainer : prebid@risemediatech.io

# Description
Connects to RisemediaTech Exchange for bids
RisemediaTech supports Display & Video(Instream) currently.

# Sample Ad Unit : Banner
```
    var adUnits = [
        {
            code: 'test-banner-div',
            mediatypes: {
                banner: {
                    sizes:[
                        [320,50]
                    ]
                }
            },
            bids:[
                {
                    bidder: 'risemediatech',
                    params: {
                        bidfloor: 0.5,        
                        testMode: 0
                    }
                }
            ]
        }
    ]
```

# Sample Ad Unit : Video
``` 
    var videoAdUnit = [
        {
            code: 'risemediatech',
            mediatypes: {
                video: {
                    playerSize: [640, 480],           // required
                    context: 'instream'
                }
            },
            bids:[
                {
                    params: {
                        mimes: ['video/mp4','video/webm'],
                        minduration: 5,
                        maxduration: 30,
                        startdelay: 30,
                        maxseq: 2,
                        poddur: 30,
                        protocols: [1,3,4]
                    }
                    
                }
            ]
        }
    ]
