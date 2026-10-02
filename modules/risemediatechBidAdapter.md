# Overview

Module Name : RiseMediaTech Bidder Adapter
Module Type : Bid Adapter
Maintainer : prebid@risemediatech.io

# Description
Connects to RiseMediaTech Exchange for bids
RiseMediaTech supports Display & Video(Instream) currently.

This adapter is maintained by Rise Media Technologies, the legal entity behind this implementation. Our official domain is risemediatech.io, which currently redirects to pubrise.ai for operational convenience. We also own the domain risemediatech.com.
Rise Media Technologies and PubRise are part of the same parent organization.
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
                        bidfloor: 0.001,        
                        testMode: 1
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
                    bidder: 'risemediatech',
                    params: {
                        bidfloor: 0.001
                        testMode: 1
                    }
                }
            ]
        }
    ]
```
