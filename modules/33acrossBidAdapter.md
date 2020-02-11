# Overview

```
Module Name:  33Across Bid Adapter
Module Type:  Bidder Adapter
Maintainer: headerbidding@33across.com
```

# Description

Connects to 33Across's exchange for bids.

33Across bid adapter supports only Banner at present and follows MRA

# Sample Ad Unit: For Publishers
```
var adUnits = [
{
    code: '33across-hb-ad-123456-1',    
    sizes: [
        [300, 250], 
        [728, 90]
    ],     
    bids: [{
        bidder: '33across',
        params: {
            siteId: 'examplePub1234',     
            productId: 'siab'     
        }
    }]
}
```
