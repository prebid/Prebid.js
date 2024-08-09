# Overview

```
Module Name: AdGlare Ad Server Adapter
Module Type: Bidder Adapter
Maintainer: prebid@adglare.com
```

# Description

Adapter that connects to your AdGlare Ad Server.
Including support for your white label ad serving domain.

# Test Parameters
```
    var adUnits = [
        {
            code: 'your-div-id',
            mediaTypes: {
                banner: {
                    sizes: [[300,250], [728,90]],
                }
            },
            bids: [
               {
                   bidder: 'adglare',
                   params: {
                        domain: 'try.engine.adglare.net',
                        zID: '475579334',
                        type: 'banner'
                   }
               }
           ]
        }
    ];
```
