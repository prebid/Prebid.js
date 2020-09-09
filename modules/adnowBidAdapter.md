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
          codeId: 794934,
          mediaType: 'banner'
        }
      }]
    }, {
      code: 'test',
      mediaTypes: {
        native: {
          title: {
            required: true,
            len: 80
          },
          body: {
            required: true
          },
          image: {
            required: true,
            sizes: [200, 200]
          },
          sponsoredBy: {
            required: true
          },
          clickUrl: {
            required: true
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
