# Overview

Module Name: Trafficroots Bid Adapter

Module Type: Bidder Adapter

Maintainer: cary@trafficroots.com

# Description

Module that connects to Trafficroots demand sources

# Test Parameters
```javascript

    var adUnits = [
       {
           code: 'test-div',
           sizes: [[300, 250],[300,600]],  // a display size
           bids: [
               {
                    bidder: 'trafficroots',
                    params: {
                        zoneId: 'aa0444af31',
                        deliveryUrl: location.protocol + '//service.trafficroots.com/prebid'
                    }
               },{
                    bidder: 'trafficroots',
                    params: {
                        zoneId: '8f527a4835',
                        deliveryUrl: location.protocol + '//service.trafficroots.com/prebid'
                    }
               }
           ]
       }
    ];
```
