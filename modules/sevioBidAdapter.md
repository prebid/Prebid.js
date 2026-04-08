# Overview

```
Module Name: Sevio Bidder Adapter
Module Type: Sevio Adapter
Maintainer: technical@sevio.com
```

# Description
Module that connects to Sevio bidder for bids. The Sevio Prebid adapter seamlessly integrates with Prebid.js
to bring high-performance, real-time bidding capabilities to publishers

# Test Parameters
```
 var adUnits = [{
            code: 'sevio-ad-b7a0913d-6064-4d72-8d80-ded800a75983',
            mediaTypes: {
                banner: {
                    sizes: [[728, 90]]
                }
            },
            bids: [{
                bidder: 'sevio',
                params: {
                    zone: 'b7a0913d-6064-4d72-8d80-ded800a75983'
                }
            }]
        }];
```
