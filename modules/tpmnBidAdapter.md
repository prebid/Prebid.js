# Overview

```
Module Name:  TPMN Bid Adapter
Module Type:  Bidder Adapter
Maintainer: develop@tpmn.co.kr
```

# Description

Connects to TPMN exchange for bids.

NOTE:
- TPMN bid adapter only supports Banner at the moment.
- Multi-currency is not supported.

# Sample Ad Unit Config
```
  var adUnits = [{
      // Banner adUnit
      code: 'banner-div',
	  mediaTypes: {
		  banner: {
		    sizes: [[300, 250], [320, 50]],  // banner size
		  }
	  },
    bids: [
      {
        bidder: 'tpmn',
        params: {
          inventoryId: '1',
          publisherId: 'TPMN'
        }
      }
    ]
    }];
```