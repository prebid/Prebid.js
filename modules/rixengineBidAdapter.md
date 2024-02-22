# Overview

```
Module Name:  RixEngine Bid Adapter
Module Type:  Bidder Adapter
Maintainer: yuanchang@algorix.co
```

# Description

Connects to RixEngine exchange for bids.

RixEngine bid adapter supports Banner currently.

# Sample Banner Ad Unit: For Publishers
```
var adUnits = [
{
    sizes: [
        [320, 50]
    ],     
    bids: [{
      bidder: 'rixengine',
      params: {
        endpoint: 'http://demo.svr.rixengine.com/rtb', // required
        token: '1e05a767930d7d96ef6ce16318b4ab99', // required
        sid: 36540, // required
      }
    }]
}];
```

