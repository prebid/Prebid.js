# Overview

```
Module Name:  Nativery Bid Adapter
Module Type:  Bidder Adapter
Maintainer: developer@nativery.com
```

# Description

Connects to Nativery exchange for bids.

Nativery bid adapter supports Banner and Native.

# Test Parameters
```
var adUnits = [
   // Banner adUnit
   {
      code: 'banner-div',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]]
        }
      },
      bids: [{
         bidder: 'nativery',
         params: {
           widgetId: '680f3e6326ef69d8ad04b6f6'
         }
       }]
   },
   // Native adUnit
   {
      code: 'native-div',
      mediaTypes: {
        native: {
          title: {
            required: true
          }
          image: {
            required: true
          },
          sponsoredBy: {
            required: true
          }
        }
      },
      bids: [{
        bidder: 'nativery',
        params: {
          widgetId: '680f3e6326ef69d8ad04b6f6'
        }
      }]
   }
];
```
