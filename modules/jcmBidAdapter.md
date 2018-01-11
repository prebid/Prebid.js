#Overview

```
Module Name: JCM Bidder Adapter
Module Type: Bidder Adapter
Maintainer: george@jcartermarketing.com
```

# Description

Module that connects to J Carter Marketing demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div1',
               sizes: [[300, 250]],  //  display 300x250
               bids: [
                   {
                       bidder: 'jcm',
                       params: {
                           siteId: '3608'
                       }
                   }
               ]
           },{
               code: 'test-div2',
               sizes: [[728, 90]],   // display 728x90
               bids: [
                   {
                       bidder: 'jcm',
                       params: {
                           siteId: '3608'
                       }
                   }
               ]
           }
       ];

