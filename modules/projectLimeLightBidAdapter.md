# Overview

```
Module Name: Project LimeLight SSP Adapter
Module Type: Bidder Adapter
Maintainer: engineering@project-limelight.com
```

# Description

Module that connects to Project Limelight SSP demand sources

# Test Parameters for banner
```
    var adUnits = [{
                code: 'placementCode',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'project-limelight',
                        params: {
                            adUnitId: 0,
                            adUnitType: 'banner'
                        }
                    }]
                }
            ];
```

# Test Parameters for video
```
var videoAdUnit = [{
                code: 'video1',
                sizes: [[300, 250]],
                bids: [{
                        bidder: 'project-limelight',
                        params: {
                            adUnitId: 0,
                            adUnitType: 'video'
                        }
                }]
            }];
```

# Configuration

The Project Limelight Bid Adapter expects Prebid Cache(for video) to be enabled so that we can store and retrieve a single vastXml.

```
pbjs.setConfig({
    usePrebidCache: true,
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});
```
