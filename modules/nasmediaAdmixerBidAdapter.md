# Overview

```
Module Name: NasmeidaAdmixer Bidder Adapter
Module Type: Bidder Adapter
Maintainer: prebid@nasmedia.co.kr
```

# Description

Module that connects to NasmediaAdmixer demand sources. 
Banner formats are supported.
The NasmediaAdmixer adapter doesn't support multiple sizes per ad-unit and will use the first one if multiple sizes are defined.


# Test Parameters
```
    var adUnits = [
      {
        code: 'banner-ad-div',
        sizes: [[320, 480]],  // banner size
        bids: [
          {
            bidder: 'nasmediaAdmixer',
            params: {
              ax_key: 'ajj7jba3',  //required parameter
            }
          }
        ]
      }
    ];
```
