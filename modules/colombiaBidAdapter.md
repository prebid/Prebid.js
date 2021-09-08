# Overview

```
Module Name: COLOMBIA Bidder Adapter
Module Type: Bidder Adapter
Maintainer: colombiaonline@timesinteret.in
```

# Description

Connect to COLOMBIA for bids.

COLOMBIA adapter requires setup and approval from the COLOMBIA team. Please reach out to your account team or colombiaonline@timesinteret.in for more information.

# Test Parameters
```
  var adUnits = [{
    code: 'test-ad-div',
    mediaTypes: {
       banner: {
         sizes: [[300, 250],[728,90],[320,50]]
       }
    },
    bids: [{
    bidder: 'colombia',
      params: { 
        placementId: '307466'
      }
    }]
  }];
```
