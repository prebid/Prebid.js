# Overview

**Module Name**: Ad2iction Bidder Adapter
**Module Type**: Bidder Adapter
**Maintainer**:

# Description

Connects to Ad2iction exchange for bids.

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
