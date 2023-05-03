# Overview

```
Module Name:  SmartyTech Bid Adapter
Module Type:  Bidder Adapter
Maintainer: info@adpartner.pro
```

# Description

Connects to SmartyTech's exchange for bids.

SmartyTech bid adapter supports Banner and Video

# Sample Ad Unit: For Publishers
## Sample Banner Ad Unit
```
var adUnits = [{
    code: '/123123123/prebidjs-banner',
    mediaTypes: {
        banner: {
            sizes: [
                [300, 301],
                [300, 250]
            ]
        }
    },
    bids: [{
        bidder: 'smartytech',
        params: {
            endpointId: 12
        }
    }]
}];
```

## Sample Video Ad Unit
```
var videoAdUnit = {
    code: '/123123123/video-vast-banner',
    mediaTypes: {
        video: {
            context: 'instream',
            playerSize: [640, 480],
            mimes: ['video/mp4'],
        }
    },
    bids: [{
        bidder: 'smartytech',
        params: {
            endpointId: 12
        }
    }]
};
```
