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
                        [300,250]
                    ]
                }
            },
            bids:[
                {
                    bidder: 'risemediatech',
                    params: {
                        placementId: 1452398,
                        publisherId: p-1489231,   
                        bidfloor: 0.5,        
                        currency: 'USD',
                        domain: 'exampleDomain.com',
                        pageUrl: 'https://exampleDomain.com/ad'
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
                    mimes: ['video/mp4','video/webm'],
                    minduration: 5,
                    maxduration: 30,
                    startdelay: 30,
                    maxseq: 2,
                    poddur: 30,
                    protocols: [1,3,4]
                }
            ]
        }
    ]
