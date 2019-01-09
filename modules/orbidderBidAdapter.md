#Overview

```
Module Name: Orbidder Bid Adapter
Module Type: Bidder Adapter
Maintainer: orbidder@otto.de
```

# Description

Module that connects to orbidder demand sources

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div1',
               sizes: [[300, 250]],  //  display 300x250
               bids: [
                   {
                       bidder: 'orbidder',
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
                       bidder: 'orbidder',
                       params: {
                           siteId: '3608'
                       }
                   }
               ]
           }
       ];
```
