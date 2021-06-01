# Overview

```
Module Name: AdTrue Bid Adapter
Module Type: Bidder Adapter
Maintainer: ssp@adtrue.com
```

# Description

Connects to AdTrue exchange for bids.
AdTrue bid adapter supports Banner currently.

# Test Parameters
```
var adUnits = [
  {
    code: 'banner-div',
    mediaTypes: {
      banner: {
        sizes: [[300, 250]]
      }
    },
    bids: [
      {
          bidder: 'adtrue',
          params: {
              zoneId: '21423', // required, Zone Id provided by AdTrue
              publisherId: '1491', // required, Publisher Id provided by AdTrue  
              reserve: 0.1         // optional  
          }
      }
    ]
  }
];
```
