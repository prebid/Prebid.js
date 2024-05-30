# Overview

```
Module Name:  Pilotx Prebid Adapter
Module Type:  Bidder Adapter
Maintainer:   tony@pilotx.tv
```

# Description

Connects to Pilotx 

Pilotx's bid adapter supports banner and video.

# Test Parameters
```
// Banner adUnit
var adUnits = [{
    code: 'div-gpt-ad-1460505748561-0',
    mediaTypes: {
        banner: {
            sizes: [[300, 250], [300,600]],
        }
    },
    bids: [{
        bidder: 'pilotx',
        params: {
            placementId: ["1423"]
        }
    }]

}];

// Video adUnit
var videoAdUnit = {
    code: 'video1',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 480],
        }
    },
    bids: [{
        bidder: 'pilotx',
        params: {
            placementId: '1422',
        }
    }]
};
```