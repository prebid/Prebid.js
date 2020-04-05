# Overview

```
Module Name: WIPES Bidder Adapter
Module Type: Bidder Adapter
Maintainer: contact@3-shake.com
```

# Description

Connect to WIPES for bids.
Publishers needs to be set up and approved by WIPES team to enable this adapter.
Please contact support@wipestream.com for further information.

# Test Parameters
```javascript
var adUnits = [
   // adUnit
   {
      code: 'video-div',
      mediaTypes: {
        banner: {
            sizes: [[160, 300]],
        }
      },
      bids: [{
         bidder: 'wipes',
         params: {
           asid: 'dWyPondh2EGB_bNlrVjzIXRZO9F0k1dpo0I8ZvQ'
         }
       }]
   }]
```
