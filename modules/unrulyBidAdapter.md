# Overview

**Module Name**: Unruly Bid Adapter
**Module Type**: Bidder Adapter
**Maintainer**: prodev@unrulymedia.com

# Description

Module that connects to UnrulyX for bids. 

# Test Parameters

```js
   const adUnits = [{
       code: 'ad-slot',
       sizes: [[728, 90], [300, 250]],
       mediaTypes: {
           video: {
               context: 'outstream'
           }
       },
       bids: [{
           bidder: 'unruly',
           params: {
               targetingUUID: '6f15e139-5f18-49a1-b52f-87e5e69ee65e',
               siteId: 1081534
           }
       }
       ]
   }];
```
