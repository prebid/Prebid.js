# Overview

```
Module Name: andbeyond Bidder Adapter
Module Type: Bidder Adapter
Maintainer: pankil@andbeyond.com
```

# Description

Connects to andbeyond whitelabel platform.
Banner and video formats are supported.


# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-ad-div',
        sizes: [[300, 250]],  // banner size
        bids: [
          {
            bidder: 'andbeyond',
            params: {
              zoneId: '30164',  //required parameter
              host: 'cpm.metaadserving.com' //required parameter
            }
          }
        ]
      }, {
        code: 'video-ad-player',
        sizes: [640, 480],   // video player size
        bids: [
          {
            bidder: 'andbeyond',
            mediaType : 'video',
            params: {
              zoneId: '30164',  //required parameter
              host: 'cpm.metaadserving.com' //required parameter
            }
          }
        ]
      }
    ];
```
