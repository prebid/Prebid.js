# Overview

```
Module Name: Polymorph Bidder Adapter
Module Type: Bidder Adapter
Maintainer: kuldeep@getpolymorph.com
```

# Description

Connects to Polymorph Demand Cloud (s2s header-bidding) 

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div-1',
               sizes: [[300, 250]],
               bids: [
                   {
                       bidder: "polymorph",
                       params: {
                          placementId: 'ping'
                       }
                   }
               ]
           },{
               code: 'test-div-2',
               sizes: [[300, 250], [300,600]]
               bids: [
                   {
                       bidder: "polymorph",
                       params: {
                          placementId: 'ping',
                          // In case multiple ad sizes are supported, it's recommended to specify default height and width for native ad (in case native ad is chose as a winner). In case of banner or outstream ad any one of the above sizes can be chosen depending on the highest bid.
                          defaultWidth: 300,
                          defaultHeight: 600
                       }
                   }
               ]
           }
       ];
```