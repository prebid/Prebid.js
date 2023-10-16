# Overview

```
Module Name: AdNow Bidder Adapter
Module Type: Bidder Adapter
Maintainer: support@adnow.com
```

# Description

AdNow Bidder Adapter for Prebid.js. 
Banner and Native format are supported.
Please use ```adnow``` as the bidder code.

# Test Parameters
```javascript
    const adUnits = [{
      code: 'test',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]]
        }
      },
      bids: [{
        bidder: 'adnow',
        params: {
          codeId: 794934
        }
      }]
    }, {
      code: 'test',
      mediaTypes: {
        native: {
          image: {
            sizes: [200, 200]
          }
        }
      },
      bids: [{
        bidder: 'adnow',
        params: {
          codeId: 794934
        }
      }]
    }];
```
