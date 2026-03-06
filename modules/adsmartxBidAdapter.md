# Overview

Module Name : AdSmartX Bidder Adapter
Module Type : Bid Adapter
Maintainer : prebid@aidigital.com

# Description
Connects to AdSmartX Exchange for bids
AdSmartX supports Display & Video(Instream) currently.

This adapter is maintained by Smart Exchange, the legal entity behind this implementation. Our official domain is [AI Digital](https://www.aidigital.com/).
# Sample Ad Unit : Banner
```
    var adUnits = [
        {
            code: 'test-banner-div',
            mediaTypes: {
                banner: {
                    sizes:[
                        [320,50]
                    ]
                }
            },
            bids:[
                {
                    bidder: 'adsmartx',
                    params: {
                        bidfloor: 0.001,        
                        testMode: 1,
                        sspId: 123456,
                        siteId: 987654,
                        sspUserId: 'u1234'
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
            code: 'adsmartx',
            mediaTypes: {
                video: {
                    playerSize: [640, 480],           // required
                    context: 'instream',
                    mimes: ['video/mp4','video/webm'],
                    minduration: 5,
                    maxduration: 30,
                    startdelay: 30,
                    maxseq: 2,
                    poddur: 30,
                    protocols: [1,3,4],
                }
            },
            bids:[
                {   
                    bidder: 'adsmartx',
                    params: {
                        bidfloor: 0.001,
                        testMode: 1,
                        sspId: 123456,
                        siteId: 987654,
                        sspUserId: 'u1234'
                    }
                }
            ]
        }
    ]
```
