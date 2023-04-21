# Overview

Module Name: ESKIMI Bidder Adapter
Module Type: Bidder Adapter
Maintainer: tech@eskimi.com

# Description

An adapter to get a bid from Eskimi DSP.

# Test Parameters
```javascript
    var adUnits = [{
       code: 'div-gpt-ad-1460505748561-0',
       mediaTypes: {
           banner: {
               sizes: [[300, 250], [300, 600]]
           }
       },
       
       bids: [{
           bidder: 'eskimi',
           params: {
               placementId: 612
           }
       }]

   }];
```

Where:

* placementId - Placement ID of the ad unit (required)

