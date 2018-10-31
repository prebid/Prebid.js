# Overview

```
Module Name: YIELDONE Bidder Adapter
Module Type: Bidder Adapter
Maintainer: y1dev@platform-one.co.jp
```

# Description

Connect to YIELDONE for bids.

THE YIELDONE adapter requires setup and approval from the YIELDONE team. Please reach out to your account team or y1s@platform-one.co.jp for more information.

# Test Parameters
```
  var adUnits = [{
    code: 'banner-ad-div',
    sizes: [[300, 250]],
    bids: [{
    bidder: 'yieldone',
      params: { 
        placementId: '44082'
      }
    }]
  }];
```

### Configuration

YIELDONE recommends the UserSync configuration below.  Without it, the YIELDONE adapter will not able to perform user syncs, which lowers match rate and reduces monetization.

```javascript
pbjs.setConfig({
   userSync: {
    iframeEnabled: true,
    enabledBidders: ['yieldone']
 }});
```
