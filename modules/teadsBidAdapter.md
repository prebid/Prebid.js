# Overview

**Module Name**: Teads Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: innov-ssp@teads.tv 

# Description

Use `teads` as bidder.

`placementId` & `pageId` are required and must be integers.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot_1-div', //use exactly the same code as your slot div id.
      sizes: [[300, 250]],
      bids: [{
          bidder: 'teads',
          params: { 
              placementId: 12345,
              pageId: 1234
          }
      }]
    },{
      code: 'your-slot_2-div', //use exactly the same code as your slot div id.
      sizes: [[600, 800]],
      bids: [{
          bidder: 'teads',
          params: { 
              placementId: 12345,
              pageId: 1234
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
