# Overview

Module Name : AgenticX Bidder Adapter
Module Type : Bid Adapter
Maintainer : prebid@aidigital.com

# Description
Connects to AgenticX Exchange for bids
AgenticX supports Display, Video(Instream) & Audio currently.

This adapter is maintained by Smart Exchange, the legal entity behind this implementation. Our official domain is [The AgenticX](https://theagenticx.ai/).
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
                    bidder: 'agenticx',
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
            code: 'agenticx',
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
                    bidder: 'agenticx',
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
