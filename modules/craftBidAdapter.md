# Overview

```
Module Name:  Craft Bid Adapter
Module Type:  Bidder Adapter
Maintainer: system@gacraft.jp
```

# Description

Connects to craft exchange for bids.

Craft bid adapter supports Banner.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: '/21998384947/prebid-example',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bids: [{
         bidder: 'craft',
         params: {
           sitekey: 'craft-prebid-example',
           placementId: '1234abcd'
         }
       }]
   }
];
```
