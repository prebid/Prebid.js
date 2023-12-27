# Overview

**Module Name**: Ad2iction Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prebid@ad2iction.com

# Description

The Ad2iction Bidding adapter requires setup before beginning. Please contact us on https://www.ad2iction.com.

# Sample Ad Unit Config
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [336, 280]]
        }
      },
      bids: [{
         bidder: 'ad2iction',
         params: {
           id: 'accepted-uuid'
         }
       }]
   }
];
```
