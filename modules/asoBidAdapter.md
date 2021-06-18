# Overview

```
Module Name: Adserver.Online Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@adsrv.org
```

# Description

Adserver.Online Bidder Adapter for Prebid.js.

For more information, please visit https://www.adserver.online

# Test parameters for banner
```js
var adUnits = [
   {
       code: 'banner1',
       mediaTypes: {
           banner: {
               sizes: [[300, 250]],
           }
       },
       bids: [
           {
                bidder: 'aso',
                params: {
                    zone: 73815
                }
           }
       ]
   }
];
```

# Test parameters for video
```js
var videoAdUnit = [
    {
        code: 'video1',
        mediaTypes: {
            video: {
                playerSize: [[640, 480]],
                context: 'instream'
            }
        },
        bids: [{
                bidder: 'aso',
                params: {
                    zone: 34668
                }
        }]
    }
];
```

# Configuration

The Adserver.Online Bid Adapter expects Prebid Cache (for video) to be enabled.

```
pbjs.setConfig({
    usePrebidCache: true,
    cache: {
        url: 'https://prebid.adnxs.com/pbc/v1/cache'
    }
});
```
