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
           adUnitId: '6A32352E-BC17-4B94-B2A7-5BF1724417D7'
         }
       }]
   }
];
```
