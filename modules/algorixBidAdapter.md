# Overview

```
Module Name:  AlgoriX Bid Adapter
Module Type:  Bidder Adapter
Maintainer: yuanchang@algorix.co
```

# Description

Connects to AlgoriX exchange for bids.

AlgoriX bid adapter supports Banner currently.

# Sample Banner Ad Unit: For Publishers
```
var adUnits = [
{
    sizes: [
        [300, 250]
    ],     
    bids: [{
      bidder: 'algorix',
      params: {
        region: "APAC", // option
        token: '89b6d58567e3913e507f2be61fe8823e', // required
        sid: 260785, // required
      }
    }]
}];
```

