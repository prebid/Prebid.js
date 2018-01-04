# Overview

```
Module Name: Smart Ad Server Bidder Adapter
Module Type: Bidder Adapter
Maintainer: gcarnec@smartadserver.com
```

# Description

Connect to Smart for bids.

The Smart adapter requires setup and approval from the Smart team.
Please reach out to your Technical account manager for more information.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[300, 250]],  // a display size
               bids: [
                   {
                       bidder: "smart",
                       params: {
                            domain: 'http://prg.smartadserver.com',
                            siteId: 207435,
                            pageId: 896536,
                            formatId: 62913
                       }
                   }
               ]
           }
       ];
```