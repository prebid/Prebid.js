# Overview

```
Module Name: Blue Billywig Adapter
Module Type: Bidder Adapter
Maintainer: dev+prebid@bluebillywig.com 
```

# Description

Prebid Blue Billywig Bidder Adapter

# Test Parameters

```
            const adUnits = [{
                code: 'ad-unit',
                sizes: [[[768,432],[640,480],[640,360]]],
                mediaTypes: {
                    video: {
                        playerSize: [768, 432],
                        context: 'outstream',
                        mimes: ['video/mp4'],
			protocols: [ 2,3,5,6]
                    }
                },
                bids: [{
                    bidder: 'bluebillywig',
                    params: {
			publicationName: "bbprebid",
			rendererCode: "renderer",
			accountId: 642,
  			connections: [ 'bluebillywig' ],
			bluebillywig: {}
                    }
                }]
            }];
```
