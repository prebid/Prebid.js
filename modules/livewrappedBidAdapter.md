# Overview

**Module Name**: Livewrapped Bid Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: info@livewrapped.com  

# Description

Connects to Livewrapped Header Bidding wrapper for bids.

Livewrapped supports banner, native and video.

# Test Parameters

```
var adUnits = [
   {
       code: 'banner-div',
       sizes: [[300, 250], [300,600]],
       bids: [{
         bidder: 'livewrapped',
         params: {
           adUnitId: 'D801852A-681F-11E8-86A7-0A44794250D4'
         }
       }]
   }
];
```
