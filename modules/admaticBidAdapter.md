# Overview

**Module Name**: Admatic Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: prebid@admatic.com.tr

# Description

Use `admatic` as bidder.

`networkId` is required and must be integer.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'your-slot_1-div', //use exactly the same code as your slot div id.
      sizes: [[300, 250]],
      bids: [{
          bidder: 'admatic',
          params: { 
              networkId: 12345,
              floor: 0.5
          }
      }]
    },{
      code: 'your-slot_2-div', //use exactly the same code as your slot div id.
      sizes: [[600, 800]],
      bids: [{
          bidder: 'admatic',
          params: { 
              networkId: 12345,
              floor: 0.5
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
