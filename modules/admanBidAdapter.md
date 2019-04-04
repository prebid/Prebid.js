# Overview

**Module Name**: Adman Bidder Adapter  
**Module Type**: Bidder Adapter  
**Maintainer**: prebid@admanmedia.com 

# Description

Use `adman` as bidder.

`id` is required and must be 8 alphanumeric characters.

## AdUnits configuration example
```
    var adUnits = [{
      code: 'test-div',
      sizes: [[300, 250]],
      bids: [{
          bidder: 'adman',
          params: { 
              id: 1234asdf
          }
      }]
    },{
      code: 'test-div,
      sizes: [[600, 338]],
      bids: [{
          bidder: 'adman',
          params: { 
              id: asdf1234
          }
      }]
    }];
```

