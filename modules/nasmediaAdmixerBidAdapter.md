# Overview

```
Module Name: NasmediaAdmixer Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@nasmedia.co.kr
```
``
# Description

Module that connects to NasmediaAdmixer demand sources. 
Banner formats are supported.
The NasmediaAdmixer adapter doesn't support multiple sizes per ad-unit and will use the first one if multiple sizes are defined.

# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-ad-div',
        mediaTypes: { 
          banner: { // banner size
            sizes: [[300, 250]]
          }
        },
        bids: [
          {
            bidder: 'nasmediaAdmixer',
            params: {
              media_key: '19038695',  //required
              adunit_id: '24190632',  //required
            }
          }
        ]
      }
    ];
```
