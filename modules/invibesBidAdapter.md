# Overview

```
Module Name:  Invibes Bid Adapter
Module Type:  Bidder Adapter
Maintainer:   system_operations@invibes.com
```

# Description

Connect to Invibes for bids.

# Test Parameters
```
    var adUnits = [
           {
               code: 'test-div',
               sizes: [[400, 300]],
               bids: [
                   {
                       bidder: 'invibes',
                       params: {
                           placementId: '12345',
                           domainId: 1001
                       }
                   }
               ]
           }
	]
```
