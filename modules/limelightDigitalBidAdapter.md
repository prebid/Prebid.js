# Overview

```
Module Name: Limelight Digital Exchange Bidder Adapter
Module Type: Bidder Adapter
Maintainer: engineering@project-limelight.com
```

# Description

Module that connects to Limelight Digital Exchange's demand sources

# Test Parameters for banner
```
var adUnits = [{
    code: 'placementCode',
    mediaTypes: {
        banner: {
            sizes: [[300, 250]]
        }
    },
    bids: [{
        bidder: 'limelightDigital',
        params: {
            host: 'exchange-9qao.ortb.net',
            adUnitId: 0,
            adUnitType: 'banner'
        }
    }]
}];
```

# Test Parameters for video
```
var videoAdUnit = [{
    code: 'video1',
    sizes: [[300, 250]],
    bids: [{
        bidder: 'limelightDigital',
        params: {
            host: 'exchange-9qao.ortb.net',
            adUnitId: 0,
            adUnitType: 'video'
        }
    }]
}];
```

# Configuration

The Limelight Digital Exchange Bidder Adapter expects Prebid Cache(for video) to be enabled so that we can store and retrieve a single vastXml.

```
pbjs.setConfig({
    usePrebidCache: true,
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});
```
