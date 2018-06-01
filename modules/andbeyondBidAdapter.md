# Overview

```
Module Name: andbeyond Bidder Adapter
Module Type: Bidder Adapter
Maintainer: shreyanschopra@rtbdemand.com
```

# Description

Connects to andbeyond whitelabel platform.
Banner formats are supported.


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
      }
    ];
```
