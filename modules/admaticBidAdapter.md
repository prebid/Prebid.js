# Overview

**Module Name**: Admatic Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: prebid.js@admatic.com.tr

# Description

Use `admatic` as bidder.

`networkId` & `typeId` are required and must be integers.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot_1-div', //use exactly the same code as your slot div id.
      sizes: [[300, 250]],
      bids: [{
          bidder: 'admatic',
          params: { 
              placementId: 12345,
              pageId: 14
          }
      }]
    },{
      code: 'your-slot_2-div', //use exactly the same code as your slot div id.
      sizes: [[600, 800]],
      bids: [{
          bidder: 'admatic',
          params: { 
              placementId: 12345,
              pageId: 9
          }
      }]
    }];
```

## UserSync example

```
pbjs.setConfig({
  userSync: {
    iframeEnabled: true,
    syncEnabled: true,
    syncDelay: 1
  }
});
```
