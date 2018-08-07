# Overview

```
Module Name: Rtbdemandadk Bidder Adapter
Module Type: Bidder Adapter
Maintainer: shreyanschopra@rtbdemand.com
```

# Description

Connects to Rtbdemandadk whitelabel platform.
Banner and video formats are supported.


# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-ad-div',
        sizes: [[300, 250]],  // banner size
        bids: [
          {
            bidder: 'rtbdemandadk',
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
            bidder: 'rtbdemandadk',
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
