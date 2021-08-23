# Overview

```
Module Name: Glomex Bidder Adapter
Module Type: Bidder Adapter
Maintainer: integration-squad@services.glomex.com
```

# Description

Module to use the Glomex Player with prebid.js

# Test Parameters
```
    var adUnits = [
           {
                code: "banner",
                mediaTypes: {
                    banner: {
                        sizes: [[640, 360]]
                    }
                },
                bids: [{
                   bidder: "glomex",
                   params: {
                       integrationId: '4059a11hkdzuf65i',
                       playlistId: 'v-bdui4dz7vjq9'
                   }
                }]
           }
       ];
```
