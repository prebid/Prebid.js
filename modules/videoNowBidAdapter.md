# Overview

```
Module Name: Videonow Bidder Adapter
Module Type: Bidder Adapter
Maintainer: info@videonow.ru
```

# Description

Connect to Videonow for bids.

The Videonow bidder adapter requires setup and approval from the videoNow team.
Please reach out to your account team or info@videonow.ru for more information.

# Test Parameters
```javascript
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[640, 480], [300, 250], [336, 280]]
        }
      },
      bids: [{
         bidder: 'videonow',
         params: {
           pId: 1,
           placementId: '36891'
         }
       }]
   }]
```
